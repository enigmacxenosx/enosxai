import type { ActionActivity, ActionActivityStatus } from "@/lib/types";

const VALID_STATUSES = new Set<ActionActivityStatus>([
  "running",
  "waiting_for_approval",
  "succeeded",
  "failed",
  "cancelled",
]);
const MAX_ACTIVITIES = 30;
const MAX_LABEL_LENGTH = 160;
const MAX_DETAIL_LENGTH = 240;

export function normalizeActionActivities(value: unknown): ActionActivity[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const normalized = value.flatMap((item): ActionActivity[] => {
    if (!item || typeof item !== "object") return [];
    const activity = item as Record<string, unknown>;
    if (typeof activity.id !== "string" || typeof activity.label !== "string") return [];
    if (typeof activity.status !== "string" || !VALID_STATUSES.has(activity.status as ActionActivityStatus)) return [];
    const detail = typeof activity.detail === "string" ? activity.detail.slice(0, MAX_DETAIL_LENGTH) : undefined;
    return [{
      id: activity.id.slice(0, 100),
      label: activity.label.slice(0, MAX_LABEL_LENGTH),
      status: activity.status as ActionActivityStatus,
      ...(detail ? { detail } : {}),
      ...(typeof activity.updatedAt === "string" ? { updatedAt: activity.updatedAt.slice(0, 40) } : {}),
    }];
  });
  return normalized.length ? normalized.slice(-MAX_ACTIVITIES) : undefined;
}

export function upsertActionActivity(
  activities: ActionActivity[] | undefined,
  update: ActionActivity,
): ActionActivity[] {
  const current = activities ?? [];
  const existingIndex = current.findIndex((activity) => activity.id === update.id);
  if (existingIndex < 0) return [...current, update].slice(-MAX_ACTIVITIES);

  const next = [...current];
  const existing = current[existingIndex];
  next[existingIndex] = {
    ...existing,
    ...update,
    detail: update.detail ?? existing.detail,
  };
  return next;
}
