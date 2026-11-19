import { afterEach, describe, expect, it, vi } from "vitest";
import { getMessageFeedback, submitMessageFeedback } from "./feedback";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("response feedback", () => {
  it("stores the selected star rating locally and submits only safe metadata", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 202 }));
    const record = submitMessageFeedback("assistant-1", 4, { aiMode: "ex-pro" });

    expect(record.rating).toBe(4);
    expect(getMessageFeedback("assistant-1")?.rating).toBe(4);
    expect(fetchMock).toHaveBeenCalledOnce();
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toMatchObject({ messageId: "assistant-1", rating: 4, aiMode: "ex-pro" });
    expect(body).not.toHaveProperty("content");
    expect(body).not.toHaveProperty("messages");
  });

  it("migrates previously stored binary feedback to the closest star rating", () => {
    localStorage.setItem("enosx_feedback_records", JSON.stringify({
      "legacy-message": { messageId: "legacy-message", rating: "down", submittedAt: new Date().toISOString() },
    }));

    expect(getMessageFeedback("legacy-message")?.rating).toBe(1);
  });
});
