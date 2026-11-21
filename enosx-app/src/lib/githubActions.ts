export type GitHubActionsProgress = (status: string) => void;

const GITHUB_API = "https://api.github.com";
const API_HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

export function isGitHubActionsStatusRequest(message: string): boolean {
  const asksForStatus = /\b(?:check|status|result|results|passed|pass|failed|failure|succeed|successful|successfully|completed|latest|run|runs|why|whether|is|was|did|will|in\s+progress)\b/i.test(message);
  const mentionsCi = /\b(?:github\s+actions?|ci|continuous integration|workflow(?:\s+runs?)?|pipeline|build(?:s|ing)?)\b/i.test(message);
  return asksForStatus && mentionsCi;
}

function parseStoredJson<T>(key: string, fallback: T): T {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "null");
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function safeText(value: unknown, max = 300): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function repoPath(fullName: string): string | null {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(fullName)) return null;
  const segments = fullName.split("/");
  if (segments.some((segment) => segment === "." || segment === "..")) return null;
  return segments.map(encodeURIComponent).join("/");
}

function failure(message: string): string {
  return JSON.stringify({ source: "GitHub Actions API", unavailable: message });
}

async function readGitHubJson<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  let response: Response;
  try {
    response = await fetch(`${GITHUB_API}${path}`, {
      headers: API_HEADERS,
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    const detail = response.status === 401 ? "GitHub did not allow this unauthenticated request." : response.status === 403 ? "GitHub rate-limited or denied this public request." : response.status === 404 ? "The selected repository or requested GitHub record was not found or is not publicly accessible." : `GitHub returned HTTP ${response.status}.`;
    throw new Error(detail);
  }
  return response.json() as Promise<T>;
}

interface GitHubRepoSelection {
  fullName?: string;
  branch?: string;
  defaultBranch?: string;
}
interface WorkflowRun {
  id: number;
  name?: string;
  display_title?: string;
  head_sha: string;
  head_branch?: string;
  workflow_id: number;
  run_number?: number;
  run_attempt?: number;
  event?: string;
  status?: string;
  conclusion?: string | null;
  html_url?: string;
  created_at?: string;
  updated_at?: string;
}
interface WorkflowJob {
  name?: string;
  status?: string;
  conclusion?: string | null;
  steps?: Array<{ name?: string; status?: string; conclusion?: string | null }>;
}

export async function loadGitHubActionsDiagnostic(
  requestText: string,
  onProgress: GitHubActionsProgress = () => undefined,
): Promise<string> {
  const repo = parseStoredJson<GitHubRepoSelection | null>("enosx-github-current-repo", null);
  const fullName = safeText(repo?.fullName, 160);
  const encodedRepo = repoPath(fullName);
  if (!encodedRepo) return failure("Select a repository in the GitHub workspace before checking its Actions runs.");

  const mentionedRepo = requestText.match(/(?:github\.com\/)?([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/i)?.[1];
  if (mentionedRepo && mentionedRepo.toLowerCase() !== fullName.toLowerCase()) {
    return failure(`The request names ${mentionedRepo}, but the selected GitHub workspace repository is ${fullName}. Select that repository in the GitHub workspace before checking it.`);
  }

  const explicitSha = requestText.match(/\b[0-9a-f]{7,40}\b/i)?.[0];
  const branch = /\bmain\b/i.test(requestText)
    ? "main"
    : /\bmaster\b/i.test(requestText)
      ? "master"
      : safeText(repo?.defaultBranch || repo?.branch || "main", 160);

  try {
    onProgress("Resolving the selected repository and commit SHA");
    const commit = await readGitHubJson<{ sha?: string }>(
      `/repos/${encodedRepo}/commits/${encodeURIComponent(explicitSha || branch)}`,
    );
    const headSha = safeText(commit.sha, 64).toLowerCase();
    if (!/^[0-9a-f]{40}$/.test(headSha)) throw new Error("GitHub did not return a valid full commit SHA.");
    if (explicitSha && !headSha.startsWith(explicitSha.toLowerCase())) {
      throw new Error("The resolved commit does not match the SHA in the request.");
    }

    onProgress("Finding GitHub Actions runs for the exact commit");
    const listed = await readGitHubJson<{ workflow_runs?: WorkflowRun[] }>(
      `/repos/${encodedRepo}/actions/runs?head_sha=${encodeURIComponent(headSha)}&per_page=100`,
    );
    const runs = (Array.isArray(listed.workflow_runs) ? listed.workflow_runs : [])
      .filter((run) => typeof run.id === "number" && run.head_sha?.toLowerCase() === headSha)
      .sort((a, b) => (b.run_attempt ?? 0) - (a.run_attempt ?? 0) || String(b.created_at || "").localeCompare(String(a.created_at || "")));
    const selectedRun = runs[0];

    let runDetails: WorkflowRun | null = null;
    let jobs: WorkflowJob[] = [];
    if (selectedRun) {
      onProgress("Inspecting the matching run and failed job/step details");
      const [details, jobList] = await Promise.all([
        readGitHubJson<WorkflowRun>(`/repos/${encodedRepo}/actions/runs/${selectedRun.id}`),
        readGitHubJson<{ jobs?: WorkflowJob[] }>(`/repos/${encodedRepo}/actions/runs/${selectedRun.id}/jobs?per_page=100`),
      ]);
      if (details.head_sha?.toLowerCase() !== headSha || details.id !== selectedRun.id) {
        throw new Error("The run details did not match the requested commit and run ID.");
      }
      runDetails = details;
      jobs = Array.isArray(jobList.jobs) ? jobList.jobs : [];
    }

    onProgress("Verifying the run against repository workflow metadata");
    let workflowList: { workflows?: Array<{ id: number; name?: string; path?: string; state?: string; html_url?: string }> } = {};
    let workflowMetadataIssue: string | null = null;
    try {
      workflowList = await readGitHubJson<typeof workflowList>(
        `/repos/${encodedRepo}/actions/workflows?per_page=100`,
      );
    } catch (error) {
      workflowMetadataIssue = error instanceof Error ? error.message : "Workflow metadata could not be verified.";
    }
    const workflow = selectedRun
      ? (Array.isArray(workflowList.workflows) ? workflowList.workflows : []).find((item) => item.id === selectedRun.workflow_id) ?? null
      : null;

    const diagnostic = {
      source: "Live unauthenticated public GitHub Actions REST API; read-only",
      repository: fullName,
      branch,
      commit: { sha: headSha, suppliedByUser: Boolean(explicitSha) },
      matchingRunCount: runs.length,
      matchingRuns: runs.slice(0, 10).map((run) => ({
        id: run.id,
        name: safeText(run.name, 160),
        status: safeText(run.status, 40),
        conclusion: run.conclusion ?? null,
        event: safeText(run.event, 60),
        headSha: safeText(run.head_sha, 64),
        createdAt: safeText(run.created_at, 40),
        url: typeof run.html_url === "string" && run.html_url.startsWith("https://github.com/") ? run.html_url : "",
      })),
      selectedRun: runDetails ? {
        id: runDetails.id,
        name: safeText(runDetails.name, 160),
        title: safeText(runDetails.display_title, 200),
        status: safeText(runDetails.status, 40),
        conclusion: runDetails.conclusion ?? null,
        event: safeText(runDetails.event, 60),
        headBranch: safeText(runDetails.head_branch, 160),
        headSha: safeText(runDetails.head_sha, 64),
        workflowId: runDetails.workflow_id,
        runNumber: runDetails.run_number,
        runAttempt: runDetails.run_attempt,
        createdAt: safeText(runDetails.created_at, 40),
        updatedAt: safeText(runDetails.updated_at, 40),
        url: typeof runDetails.html_url === "string" && runDetails.html_url.startsWith("https://github.com/") ? runDetails.html_url : "",
      } : null,
      jobs: jobs.slice(0, 30).map((job) => ({
        name: safeText(job.name, 160),
        status: safeText(job.status, 40),
        conclusion: job.conclusion ?? null,
        steps: (Array.isArray(job.steps) ? job.steps : []).slice(0, 50).map((step) => ({
          name: safeText(step.name, 160),
          status: safeText(step.status, 40),
          conclusion: step.conclusion ?? null,
        })),
      })),
      workflowMetadataVerified: Boolean(workflow),
      workflowMetadataIssue,
      workflow: workflow ? {
        id: workflow.id,
        name: safeText(workflow.name, 160),
        path: safeText(workflow.path, 300),
        state: safeText(workflow.state, 40),
        url: typeof workflow.html_url === "string" && workflow.html_url.startsWith("https://github.com/") ? workflow.html_url : "",
      } : null,
      workflowMetadataCount: Array.isArray(workflowList.workflows) ? workflowList.workflows.length : 0,
    };
    return JSON.stringify(diagnostic);
  } catch (error) {
    const message = error instanceof Error ? error.message : "GitHub Actions could not be checked.";
    return JSON.stringify({ source: "Unauthenticated public GitHub Actions REST API; read-only", repository: fullName, unavailable: message });
  }
}
