import { describe, expect, it } from "vitest";
import { getActivityMessages, getActivityStatus, type AgentActivityEvent } from "./agentActivity";

describe("agent activity events", () => {
  it("keeps narration and errors in event order while omitting status-only events", () => {
    const events: AgentActivityEvent[] = [
      { type: "status", state: "thinking" },
      { type: "message", text: "Request received" },
      { type: "status", state: "working" },
      { type: "message", text: "Writing your response" },
    ];

    expect(getActivityMessages(events)).toEqual([
      { type: "message", text: "Request received" },
      { type: "message", text: "Writing your response" },
    ]);
  });

  it("shows Thinking or Working while active and Finished after completion", () => {
    expect(getActivityStatus([{ type: "status", state: "thinking" }], true)).toBe("thinking");
    expect(getActivityStatus([{ type: "status", state: "working" }], true)).toBe("working");
    expect(getActivityStatus([{ type: "status", state: "working" }, { type: "done" }], true)).toBe("finished");
    expect(getActivityStatus([{ type: "status", state: "working" }], false)).toBe("finished");
  });

  it("prioritizes an error over a stale active or done status", () => {
    expect(getActivityStatus([
      { type: "status", state: "working" },
      { type: "error", message: "Connection failed" },
    ], true)).toBe("error");
  });

  it("falls back to Thinking when an active stream has not emitted status yet", () => {
    expect(getActivityStatus([], true)).toBe("thinking");
  });
});
