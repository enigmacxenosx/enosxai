import { beforeEach, describe, expect, it, vi } from "vitest";
import { isGitHubActionsStatusRequest, loadGitHubActionsDiagnostic } from "./githubActions";

const commitSha = "b8d0a5337893da38b61da0e401e7e1c994451c74";
const token = "test-secret-token";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function setupSelectedRepository() {
  localStorage.setItem("enosx-github-accounts", JSON.stringify([
    { id: "alice", username: "alice", token },
  ]));
  localStorage.setItem("enosx-github-active-account", "alice");
  localStorage.setItem("enosx-github-current-repo", JSON.stringify({
    fullName: "acme/app",
    branch: "develop",
    defaultBranch: "main",
  }));
}

describe("GitHub Actions status diagnostics", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("recognizes requests for live CI status without treating implementation requests as status checks", () => {
    expect(isGitHubActionsStatusRequest("Check whether GitHub CI for the latest main push completed successfully")).toBe(true);
    expect(isGitHubActionsStatusRequest("Why did the latest GitHub Actions run fail?")).toBe(true);
    expect(isGitHubActionsStatusRequest("Make Enosx AI mimic this workflow")).toBe(false);
    expect(isGitHubActionsStatusRequest("Explain how GitHub Actions works")).toBe(false);
    expect(isGitHubActionsStatusRequest("Help me build a new GitHub Actions workflow")).toBe(false);
  });

  it("resolves the requested branch SHA, matches an exact run, inspects failing steps, and verifies workflow metadata", async () => {
    setupSelectedRepository();
    const matchingRun = {
      id: 44879467018,
      name: "CI",
      display_title: "Remove message activity timeline",
      head_sha: commitSha,
      head_branch: "main",
      workflow_id: 9,
      run_number: 18,
      run_attempt: 1,
      event: "push",
      status: "completed",
      conclusion: "failure",
      html_url: "https://github.com/acme/app/actions/runs/44879467018",
      created_at: "2026-11-21T07:17:52Z",
      updated_at: "2026-11-21T07:20:00Z",
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/repos/acme/app/commits/main")) return jsonResponse({ sha: commitSha });
      if (url.includes("/repos/acme/app/actions/runs?head_sha=")) return jsonResponse({ workflow_runs: [matchingRun] });
      if (url.endsWith("/repos/acme/app/actions/runs/44879467018")) return jsonResponse(matchingRun);
      if (url.endsWith("/repos/acme/app/actions/runs/44879467018/jobs?per_page=100")) {
        return jsonResponse({ jobs: [{
          name: "check",
          status: "completed",
          conclusion: "failure",
          steps: [
            { name: "Install dependencies", status: "completed", conclusion: "success" },
            { name: "Run UI regression suite", status: "completed", conclusion: "failure" },
          ],
        }] });
      }
      if (url.endsWith("/repos/acme/app/actions/workflows?per_page=100")) {
        return jsonResponse({ workflows: [{ id: 9, name: "CI", path: ".github/workflows/ci.yml", state: "active", html_url: "https://github.com/acme/app/actions/workflows/ci.yml" }] });
      }
      throw new Error(`Unexpected GitHub URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const progress: string[] = [];

    const result = await loadGitHubActionsDiagnostic(
      "Check GitHub CI for the latest main push",
      (status) => progress.push(status),
    );
    const diagnostic = JSON.parse(result);

    expect(diagnostic.repository).toBe("acme/app");
    expect(diagnostic.commit.sha).toBe(commitSha);
    expect(diagnostic.selectedRun.id).toBe(44879467018);
    expect(diagnostic.selectedRun.conclusion).toBe("failure");
    expect(diagnostic.jobs[0].steps[1]).toMatchObject({ name: "Run UI regression suite", conclusion: "failure" });
    expect(diagnostic.workflowMetadataVerified).toBe(true);
    expect(diagnostic.workflow).toMatchObject({ id: 9, path: ".github/workflows/ci.yml" });
    expect(result).not.toContain(token);
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(fetchMock.mock.calls.every(([url]) => String(url).startsWith("https://api.github.com/repos/acme/app/"))).toBe(true);
    expect(progress).toEqual([
      "Resolving the selected repository and commit SHA",
      "Finding GitHub Actions runs for the exact commit",
      "Inspecting the matching run and failed job/step details",
      "Verifying the run against repository workflow metadata",
    ]);
  });

  it("does not query a different repository named in the prompt", async () => {
    setupSelectedRepository();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = JSON.parse(await loadGitHubActionsDiagnostic("Check CI for another-org/private-app"));

    expect(result.unavailable).toContain("selected GitHub workspace repository is acme/app");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires a selected repository and never sends a stored OAuth token to public Actions endpoints", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/repos/acme/app/commits/main")) return jsonResponse({ sha: commitSha });
      if (url.includes("/repos/acme/app/actions/runs?head_sha=")) return jsonResponse({ workflow_runs: [] });
      if (url.endsWith("/repos/acme/app/actions/workflows?per_page=100")) return jsonResponse({ workflows: [] });
      throw new Error(`Unexpected GitHub URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const noRepo = JSON.parse(await loadGitHubActionsDiagnostic("Check GitHub CI status"));
    expect(noRepo.unavailable).toContain("Select a repository");
    expect(fetchMock).not.toHaveBeenCalled();

    setupSelectedRepository();
    const diagnostic = JSON.parse(await loadGitHubActionsDiagnostic("Check GitHub CI status"));
    expect(diagnostic.repository).toBe("acme/app");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.every(([, init]) => {
      const headers = init?.headers as Record<string, string> | undefined;
      return !headers?.Authorization;
    })).toBe(true);
  });
});
