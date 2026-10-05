// Vercel Serverless Function: GET /api/github/context
// Fetches repository metadata + README so the assistant can reason about the repo.
// Optional: set GITHUB_TOKEN in env to raise GitHub rate limits / access private repos.

import type { VercelRequest, VercelResponse } from "@vercel/node";

const GITHUB_API_URL = "https://api.github.com";
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "ENOSX-AI",
  };
  if (githubToken) headers.Authorization = `Bearer ${githubToken}`;

  try {
    const requestedRepo = typeof req.query.repo === "string" ? req.query.repo.trim() : "";
    let repoNames = requestedRepo ? [requestedRepo] : [];
    if (!repoNames.length && githubToken) {
      const reposResponse = await fetch(`${GITHUB_API_URL}/user/repos?per_page=100&sort=updated`, { headers });
      if (reposResponse.ok) {
        const repos = await reposResponse.json() as Array<{ full_name?: string }>;
        repoNames = repos.map((repo) => repo.full_name).filter((name): name is string => Boolean(name));
      }
    }
    if (!repoNames.length) {
      return res.status(400).json({ error: "Pass ?repo=owner/name or configure GITHUB_TOKEN to discover repositories." });
    }
    const repoContexts = await Promise.all(
      repoNames.map(async (repoName) => {
        const [owner, repo] = repoName.split("/");
        const repoResp = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}`, { headers });
        if (!repoResp.ok) {
          return { repoName, error: `GitHub API error ${repoResp.status}` };
        }

        const repoData = (await repoResp.json()) as {
          full_name: string;
          description?: string;
          html_url: string;
          default_branch: string;
          visibility?: string;
          language?: string;
          pushed_at?: string;
        };

        const treeResp = await fetch(
          `${GITHUB_API_URL}/repos/${owner}/${repo}/git/trees/${repoData.default_branch}?recursive=1`,
          { headers }
        );
        const treeData = treeResp.ok
          ? ((await treeResp.json()) as { tree?: Array<{ path: string; type: string }> })
          : { tree: [] };

        const readmeResp = await fetch(
          `https://raw.githubusercontent.com/${owner}/${repo}/${repoData.default_branch}/README.md`,
          { headers }
        );
        const readme = readmeResp.ok ? (await readmeResp.text()).slice(0, 6000) : "";

        const importantFiles = (treeData.tree || [])
          .filter((item) => item.type === "blob")
          .map((item) => item.path)
          .slice(0, 220);

        return {
          name: repoData.full_name,
          description: repoData.description || "",
          url: repoData.html_url,
          defaultBranch: repoData.default_branch,
          visibility: repoData.visibility || "unknown",
          primaryLanguage: repoData.language || "unknown",
          lastPush: repoData.pushed_at || "unknown",
          readme,
          importantFiles,
        };
      })
    );

    const context = repoContexts
      .map((repo) => {
        if ("error" in repo) {
          return `Repository: ${repo.repoName}\nStatus: ${repo.error}`;
        }
        return [
          `Repository: ${repo.name}`,
          `Description: ${repo.description}`,
          `URL: ${repo.url}`,
          `Default branch: ${repo.defaultBranch}`,
          `Visibility: ${repo.visibility}`,
          `Primary language: ${repo.primaryLanguage}`,
          `Last push: ${repo.lastPush}`,
          `README:\n${repo.readme}`,
          `Important files:\n${repo.importantFiles.join("\n")}`,
        ].join("\n");
      })
      .join("\n\n---\n\n");

    res.status(200).json({ repos: repoContexts, context });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown GitHub context error";
    res.status(500).json({ error: msg });
  }
}
