/*
 * ENOSX AI — response feedback
 * Five-star ratings are stored locally and relayed to /api/feedback. Submission
 * is best-effort and never includes the conversation text.
 */
import { ENOSX_APP_VERSION } from "@/lib/appVersion";

export type MessageFeedbackRating = 1 | 2 | 3 | 4 | 5;

export interface MessageFeedback {
  messageId: string;
  rating: MessageFeedbackRating;
  note?: string;
  submittedAt: string;
}

const STORAGE_KEY = "enosx_feedback_records";
const MAX_RECORDS = 300;

type StoredFeedback = Omit<MessageFeedback, "rating"> & { rating: MessageFeedbackRating | "up" | "down" };

function loadRecords(): Record<string, StoredFeedback> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function saveRecords(records: Record<string, StoredFeedback>) {
  try {
    const entries = Object.entries(records);
    if (entries.length > MAX_RECORDS) {
      entries.sort(([, left], [, right]) => Date.parse(right.submittedAt) - Date.parse(left.submittedAt));
      records = Object.fromEntries(entries.slice(0, MAX_RECORDS));
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Local persistence is a convenience; failure must never block feedback.
  }
}

export function getMessageFeedback(messageId: string): MessageFeedback | null {
  if (typeof window === "undefined") return null;
  const stored = loadRecords()[messageId];
  if (!stored) return null;
  const rating = stored.rating === "up" ? 5 : stored.rating === "down" ? 1 : stored.rating;
  if (![1, 2, 3, 4, 5].includes(rating)) return null;
  return { ...stored, rating: rating as MessageFeedbackRating };
}

/** Record a rating locally and relay it to the team. Returns the stored record. */
export function submitMessageFeedback(
  messageId: string,
  rating: MessageFeedbackRating,
  options?: { note?: string; aiMode?: string },
): MessageFeedback {
  const record: MessageFeedback = {
    messageId,
    rating,
    note: options?.note,
    submittedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    const records = loadRecords();
    records[messageId] = record;
    saveRecords(records);

    void fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messageId,
        rating,
        note: options?.note?.slice(0, 800),
        aiMode: options?.aiMode,
        appVersion: ENOSX_APP_VERSION,
        path: window.location.pathname,
      }),
      keepalive: true,
    }).catch(() => {
      // Feedback delivery is best-effort; the local record still counts.
    });
  }

  return record;
}
