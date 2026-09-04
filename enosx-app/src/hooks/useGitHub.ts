/**
 * useGitHub — Enhanced GitHub integration hook.
 * Supports multi-account OAuth tokens, repo browsing, file editing,
 * AI-assisted content generation, and pushing commits via GitHub REST API.
 */
import { useState, useCallback } from 'react';

export interface GitHubAccount {
  id: string;
  username: string;
  token: string;
  avatarUrl?: string;
}

export interface GitHubRepo {
  name: string;
  owner: string;
  fullName: string;
  url: string;
  branch: string;
  defaultBranch: string;
  description?: string;
  private: boolean;
  language?: string;
  updatedAt?: string;
}

export interface GitHubFile {
  path: string;
  name: string;
  type: 'file' | 'dir';
  content?: string;
  sha?: string;
  size?: number;
  encoding?: string;
}

export interface GitHubBranch {
  name: string;
  sha: string;
}

interface UseGitHubState {
  accounts: GitHubAccount[];
  activeAccount: GitHubAccount | null;
  repos: GitHubRepo[];
  currentRepo: GitHubRepo | null;
  branches: GitHubBranch[];
  files: GitHubFile[];
  currentFile: GitHubFile | null;
  isLoading: boolean;
  error: string | null;
}

const STORAGE_KEY = 'enosx-github-accounts';
const CURRENT_REPO_KEY = 'enosx-github-current-repo';
function loadCurrentRepo(): GitHubRepo | null {
  try { const raw = localStorage.getItem(CURRENT_REPO_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

function loadAccounts(): GitHubAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveAccounts(accounts: GitHubAccount[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  } catch {}
}

export function useGitHub() {
  const [state, setState] = useState<UseGitHubState>(() => {
    const accounts = loadAccounts();
    return {
      accounts,
      activeAccount: accounts[0] ?? null,
      repos: [],
      currentRepo: loadCurrentRepo(),
      branches: [],
      files: [],
      currentFile: null,
      isLoading: false,
      error: null,
    };
  });

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const addAccount = useCallback(async (username: string, token: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
      });
      if (!res.ok) throw new Error('Invalid token or unauthorized');
      const userData = await res.json();
      const newAccount: GitHubAccount = {
        id: userData.login,
        username: userData.login,
        token,
        avatarUrl: userData.avatar_url,
      };
      setState(prev => {
        const updated = [...prev.accounts.filter(a => a.id !== newAccount.id), newAccount];
        saveAccounts(updated);
        return { ...prev, accounts: updated, activeAccount: newAccount, isLoading: false };
      });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add account');
      setLoading(false);
      return false;
    }
  }, [setLoading, setError]);

  const connectWithOAuth = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      const popup = window.open("/api/github/oauth/start", "enosx-github-oauth", "popup,width=620,height=760");
      if (!popup) {
        setError("Please allow popups to connect GitHub.");
        resolve(false);
        return;
      }
      let settled = false;
      let checkClosed: number;
      const onMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin || event.data?.type !== "enosx-github-oauth") return;
        const account = event.data.payload?.account as GitHubAccount | undefined;
        if (!account?.token) {
          setError(event.data.payload?.error || "GitHub connection failed");
          finish(false);
          return;
        }
        finish(await addAccount(account.username, account.token));
      };
      const finish = (success: boolean) => {
        if (settled) return;
        settled = true;
        window.removeEventListener("message", onMessage);
        window.clearInterval(checkClosed);
        resolve(success);
      };
      checkClosed = window.setInterval(() => {
        if (popup.closed) finish(false);
      }, 500);
      window.addEventListener("message", onMessage);
    });
  }, [addAccount, setError]);

  const removeAccount = useCallback((id: string) => {
    setState(prev => {
      const updated = prev.accounts.filter(a => a.id !== id);
      saveAccounts(updated);
      return { ...prev, accounts: updated, activeAccount: updated[0] ?? null, repos: [], currentRepo: null };
    });
  }, []);

  const switchAccount = useCallback((id: string) => {
    setState(prev => {
      const account = prev.accounts.find(a => a.id === id);
      if (!account) return prev;
      return { ...prev, activeAccount: account, repos: [], currentRepo: null, files: [], currentFile: null };
    });
  }, []);

  const fetchRepos = useCallback(async () => {
    setState(prev => {
      if (!prev.activeAccount) return { ...prev, error: 'No active account' };
      return { ...prev, isLoading: true, error: null };
    });
    const account = state.activeAccount;
    if (!account) return;
    try {
      const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${account.token}`,
          Accept: 'application/vnd.github+json',
        },
      });
      if (!res.ok) throw new Error('Failed to fetch repositories');
      const data = await res.json();
      const repos: GitHubRepo[] = data.map((r: any) => ({
        name: r.name,
        owner: r.owner.login,
        fullName: r.full_name,
        url: r.html_url,
        branch: r.default_branch,
        defaultBranch: r.default_branch,
        description: r.description,
        private: r.private,
        language: r.language,
        updatedAt: r.updated_at,
      }));
      setState(prev => ({ ...prev, repos, isLoading: false }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch repos');
      setLoading(false);
    }
  }, [state.activeAccount, setLoading, setError]);

  const addRepoByName = useCallback(async (fullName: string) => {
    const account = state.activeAccount;
    if (!account) return;
    setLoading(true);
    try {
      const res = await fetch(`https://api.github.com/repos/${fullName}`, {
        headers: {
          Authorization: `Bearer ${account.token}`,
          Accept: 'application/vnd.github+json',
        },
      });
      if (!res.ok) throw new Error('Repository not found');
      const r = await res.json();
      const repo: GitHubRepo = {
        name: r.name,
        owner: r.owner.login,
        fullName: r.full_name,
        url: r.html_url,
        branch: r.default_branch,
        defaultBranch: r.default_branch,
        description: r.description,
        private: r.private,
        language: r.language,
        updatedAt: r.updated_at,
      };
      setState(prev => ({
        ...prev,
        repos: [repo, ...prev.repos.filter(x => x.fullName !== repo.fullName)],
        isLoading: false,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add repo');
      setLoading(false);
    }
  }, [state.activeAccount, setLoading, setError]);

  const selectRepo = useCallback(async (repo: GitHubRepo) => {
    const account = state.activeAccount;
    if (!account) return;
    setLoading(true);
    setError(null);
    try {
      const [branchRes, filesRes] = await Promise.all([
        fetch(`https://api.github.com/repos/${repo.fullName}/branches`, {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${account.token}`, Accept: 'application/vnd.github+json' },
        }),
        fetch(`https://api.github.com/repos/${repo.fullName}/contents?ref=${repo.branch}`, {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${account.token}`, Accept: 'application/vnd.github+json' },
        }),
      ]);
      const branchData = branchRes.ok ? await branchRes.json() : [];
      const filesData = filesRes.ok ? await filesRes.json() : [];
      const branches: GitHubBranch[] = branchData.map((b: any) => ({ name: b.name, sha: b.commit.sha }));
      const files: GitHubFile[] = Array.isArray(filesData)
        ? filesData.map((f: any) => ({ path: f.path, name: f.name, type: f.type === 'dir' ? 'dir' : 'file', sha: f.sha, size: f.size }))
        : [];
      localStorage.setItem(CURRENT_REPO_KEY, JSON.stringify(repo));
      setState(prev => ({ ...prev, currentRepo: repo, branches, files, currentFile: null, isLoading: false }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select repo');
      setLoading(false);
    }
  }, [state.activeAccount, setLoading, setError]);

  const selectBranch = useCallback(async (branchName: string) => {
    setState(prev => {
      if (!prev.currentRepo) return prev;
      return { ...prev, currentRepo: { ...prev.currentRepo, branch: branchName } };
    });
  }, []);

  const browseDirectory = useCallback(async (path: string) => {
    const account = state.activeAccount;
    const repo = state.currentRepo;
    if (!account || !repo) return;
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.github.com/repos/${repo.fullName}/contents/${path}?ref=${repo.branch}`,
        { headers: { Authorization: `Bearer ${account.token}`, Accept: 'application/vnd.github+json' } }
      );
      if (!res.ok) throw new Error('Failed to browse directory');
      const data = await res.json();
      const files: GitHubFile[] = Array.isArray(data)
        ? data.map((f: any) => ({ path: f.path, name: f.name, type: f.type === 'dir' ? 'dir' : 'file', sha: f.sha, size: f.size }))
        : [];
      setState(prev => ({ ...prev, files, isLoading: false }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to browse');
      setLoading(false);
    }
  }, [state.activeAccount, state.currentRepo, setLoading, setError]);

  const selectFile = useCallback(async (file: GitHubFile) => {
    if (file.type === 'dir') { browseDirectory(file.path); return; }
    const account = state.activeAccount;
    const repo = state.currentRepo;
    if (!account || !repo) return;
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.github.com/repos/${repo.fullName}/contents/${file.path}?ref=${repo.branch}`,
        { headers: { Authorization: `Bearer ${account.token}`, Accept: 'application/vnd.github+json' } }
      );
      if (!res.ok) throw new Error('Failed to fetch file');
      const data = await res.json();
      const content = data.encoding === 'base64' ? atob(data.content.replace(/\n/g, '')) : data.content;
      setState(prev => ({ ...prev, currentFile: { ...file, content, sha: data.sha }, isLoading: false }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
      setLoading(false);
    }
  }, [state.activeAccount, state.currentRepo, browseDirectory, setLoading, setError]);

  const updateFileContent = useCallback((content: string) => {
    setState(prev => ({ ...prev, currentFile: prev.currentFile ? { ...prev.currentFile, content } : null }));
  }, []);

  const pushChanges = useCallback(async (commitMessage: string): Promise<boolean> => {
    const account = state.activeAccount;
    const repo = state.currentRepo;
    const file = state.currentFile;
    if (!account || !repo || !file || !file.content) {
      setError('No repo, file, or account selected');
      return false;
    }
    setLoading(true);
    setError(null);
    try {
      const encodedContent = btoa(unescape(encodeURIComponent(file.content)));
      const body: any = { message: commitMessage, content: encodedContent, branch: repo.branch };
      if (file.sha) body.sha = file.sha;
      const res = await fetch(
        `https://api.github.com/repos/${repo.fullName}/contents/${file.path}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${account.token}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to push changes');
      }
      const result = await res.json();
      setState(prev => ({
        ...prev,
        currentFile: prev.currentFile ? { ...prev.currentFile, sha: result.content.sha } : null,
        isLoading: false,
      }));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Push failed');
      setLoading(false);
      return false;
    }
  }, [state.activeAccount, state.currentRepo, state.currentFile, setLoading, setError]);

  const createFile = useCallback(async (path: string, content: string, commitMessage: string): Promise<boolean> => {
    const account = state.activeAccount;
    const repo = state.currentRepo;
    if (!account || !repo) return false;
    setLoading(true);
    try {
      const encodedContent = btoa(unescape(encodeURIComponent(content)));
      const res = await fetch(
        `https://api.github.com/repos/${repo.fullName}/contents/${path}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${account.token}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: commitMessage, content: encodedContent, branch: repo.branch }),
        }
      );
      if (!res.ok) throw new Error('Failed to create file');
      setLoading(false);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create file failed');
      setLoading(false);
      return false;
    }
  }, [state.activeAccount, state.currentRepo, setLoading, setError]);

  const upsertFile = useCallback(async (path: string, content: string, commitMessage: string): Promise<boolean> => {
    const account = state.activeAccount;
    const repo = state.currentRepo;
    if (!account || !repo) { setError('Select a GitHub account and repository first'); return false; }
    setLoading(true); setError(null);
    try {
      const fileRes = await fetch(`https://api.github.com/repos/${repo.fullName}/contents/${path}?ref=${repo.branch}`, { headers: { Authorization: `Bearer ${account.token}`, Accept: 'application/vnd.github+json' } });
      const existing = fileRes.ok ? await fileRes.json() : null;
      const encodedContent = btoa(unescape(encodeURIComponent(content)));
      const body: any = { message: commitMessage, content: encodedContent, branch: repo.branch };
      if (existing?.sha) body.sha = existing.sha;
      const res = await fetch(`https://api.github.com/repos/${repo.fullName}/contents/${path}`, { method: 'PUT', headers: { Authorization: `Bearer ${account.token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const data = await res.json().catch(() => null); throw new Error(data?.message || 'Knowledge Bank push failed'); }
      setLoading(false); return true;
    } catch (err) { setError(err instanceof Error ? err.message : 'Knowledge Bank push failed'); setLoading(false); return false; }
  }, [state.activeAccount, state.currentRepo, setLoading, setError]);

  const deleteFile = useCallback(async (path: string, commitMessage: string): Promise<boolean> => {
    const account = state.activeAccount;
    const repo = state.currentRepo;
    if (!account || !repo) return false;
    setLoading(true);
    try {
      // First, get the file SHA
      const getRes = await fetch(
        `https://api.github.com/repos/${repo.fullName}/contents/${path}?ref=${repo.branch}`,
        { headers: { Authorization: `Bearer ${account.token}`, Accept: "application/vnd.github+json" } }
      );
      if (!getRes.ok) throw new Error('Failed to fetch file for deletion');
      const fileData = await getRes.json();
      
      // Delete the file
      const deleteRes = await fetch(
        `https://api.github.com/repos/${repo.fullName}/contents/${path}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${account.token}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: commitMessage, sha: fileData.sha, branch: repo.branch }),
        }
      );
      if (!deleteRes.ok) throw new Error('Failed to delete file');
      setLoading(false);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete file failed');
      setLoading(false);
      return false;
    }
  }, [state.activeAccount, state.currentRepo, setLoading, setError]);

  const createPullRequest = useCallback(async (title: string, head: string, base: string, body?: string): Promise<any> => {
    const account = state.activeAccount;
    const repo = state.currentRepo;
    if (!account || !repo) return null;
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.github.com/repos/${repo.fullName}/pulls`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${account.token}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title, head, base, body: body || "" }),
        }
      );
      if (!res.ok) throw new Error('Failed to create pull request');
      const prData = await res.json();
      setLoading(false);
      return prData;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create PR failed');
      setLoading(false);
      return null;
    }
  }, [state.activeAccount, state.currentRepo, setLoading, setError]);

  const getPullRequests = useCallback(async (state_filter: 'open' | 'closed' | 'all' = 'open'): Promise<any[]> => {
    const account = state.activeAccount;
    const repo = state.currentRepo;
    if (!account || !repo) return [];
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.github.com/repos/${repo.fullName}/pulls?state=${state_filter}&per_page=50`,
        { headers: { Authorization: `Bearer ${account.token}`, Accept: "application/vnd.github+json" } }
      );
      if (!res.ok) throw new Error('Failed to fetch pull requests');
      const prs = await res.json();
      setLoading(false);
      return prs;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fetch PRs failed');
      setLoading(false);
      return [];
    }
  }, [state.activeAccount, state.currentRepo, setLoading, setError]);

  // Legacy setters
  const setRepos = useCallback((repos: GitHubRepo[]) => setState(prev => ({ ...prev, repos })), []);
  const setFiles = useCallback((files: GitHubFile[]) => setState(prev => ({ ...prev, files })), []);
  const updateFile = useCallback((content: string) => updateFileContent(content), [updateFileContent]);

  return {
    accounts: state.accounts,
    activeAccount: state.activeAccount,
    repos: state.repos,
    currentRepo: state.currentRepo,
    branches: state.branches,
    files: state.files,
    currentFile: state.currentFile,
    isLoading: state.isLoading,
    error: state.error,
    addAccount,
    connectWithOAuth,
    removeAccount,
    switchAccount,
    fetchRepos,
    addRepoByName,
    selectRepo,
    selectBranch,
    browseDirectory,
    selectFile,
    updateFileContent,
    updateFile,
    pushChanges,
    createFile,
    upsertFile,
    deleteFile,
    createPullRequest,
    getPullRequests,
    setRepos,
    setFiles,
  };
}
