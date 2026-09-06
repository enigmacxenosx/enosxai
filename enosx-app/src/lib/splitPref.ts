/*
 * ENOSX AI — Shared split-screen preference
 * One global setting used by both the Workspace page (/workspace) and the
 * Chat page (/). Flipping the toggle on either page flips it on the other.
 * The regular chat route starts in chat-only mode; users can explicitly open
 * Workspace/Split when they want the Enosx Computer surface.
 */

export const SPLIT_PREF_KEY = "enosx-workspace-split-enabled-v2";

export function getSplitEnabled(): boolean {
  try {
    const saved = localStorage.getItem(SPLIT_PREF_KEY);
    if (saved === null) return false; // first-time visitors start in chat only
    return saved !== "false";
  } catch {
    return false;
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
