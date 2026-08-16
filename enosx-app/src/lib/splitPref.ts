/*
 * ENOSX AI — Shared split-screen preference
 * One global setting used by both the Workspace page (/workspace) and the
 * Chat page (/). Flipping the toggle on either page flips it on the other.
 */

export const SPLIT_PREF_KEY = "enosx-workspace-split-enabled-v1";

export function getSplitEnabled(): boolean {
  try {
    const saved = localStorage.getItem(SPLIT_PREF_KEY);
    if (saved === null) return true; // first-time visitors get split on
    return saved !== "false";
  } catch {
    return true;
  }
}

export function setSplitEnabled(next: boolean) {
  try {
    localStorage.setItem(SPLIT_PREF_KEY, String(next));
  } catch {
    /* storage unavailable */
  }
}

type Listener = () => void;
const listeners = new Set<Listener>();

export function onSplitPrefChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifySplitPrefChanged() {
  listeners.forEach((fn) => fn());
}

// Keep in sync when another tab toggles the preference.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === SPLIT_PREF_KEY) notifySplitPrefChanged();
  });
}
