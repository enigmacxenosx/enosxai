export type MediaJobKind = "image" | "video";
export type MediaJobStatus = "running" | "succeeded" | "failed" | "cancelled";

export interface MediaJob {
  id: string;
  kind: MediaJobKind;
  prompt: string;
  status: MediaJobStatus;
  createdAt: string;
  updatedAt: string;
  assetUrl?: string;
  error?: string;
}

const STORAGE_KEY = "enosx-media-generation-jobs";
const MAX_JOBS = 40;

function readJobs(): MediaJob[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((job): job is MediaJob => Boolean(job?.id && job?.kind && job?.status)) : [];
  } catch {
    return [];
  }
}

function writeJobs(jobs: MediaJob[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs.slice(0, MAX_JOBS))); } catch { /* local persistence is best effort */ }
  window.dispatchEvent(new CustomEvent("enosx:media-jobs-updated"));
}

export function listMediaJobs(): MediaJob[] {
  return readJobs().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function createMediaJob(kind: MediaJobKind, prompt: string, id: string): MediaJob {
  const now = new Date().toISOString();
  const job: MediaJob = { id, kind, prompt: prompt.trim().slice(0, 500), status: "running", createdAt: now, updatedAt: now };
  writeJobs([job, ...readJobs().filter((entry) => entry.id !== id)]);
  return job;
}

export function updateMediaJob(id: string, patch: Partial<Pick<MediaJob, "status" | "assetUrl" | "error">>): MediaJob | null {
  let updated: MediaJob | null = null;
  const jobs = readJobs().map((job) => {
    if (job.id !== id) return job;
    updated = { ...job, ...patch, updatedAt: new Date().toISOString() };
    return updated;
  });
  writeJobs(jobs);
  return updated;
}
