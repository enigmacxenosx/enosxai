import { describe, expect, it } from "vitest";
import { normalizeActionActivities, upsertActionActivity } from "./actionActivity";
import type { ActionActivity } from "./types";

describe("normalizeActionActivities", () => {
  it("filters invalid events and bounds labels, details, and history length", () => {
    const normalized = normalizeActionActivities([
      null,
      { id: "ok", label: "L".repeat(200), status: "running", detail: "D".repeat(300) },
      { id: "bad", label: "unknown status", status: "complete" },
      ...Array.from({ length: 35 }, (_, index) => ({ id: `e${index}`, label: `Event ${index}`, status: "succeeded" })),
    ]);
    expect(normalized).toHaveLength(30);
    expect(normalized?.[0].id).toBe("e5");
    expect(normalized?.[0].label).toBe("Event 5");
  });

  it("rejects values that are not arrays and leaves empty arrays undefined", () => {
    expect(normalizeActionActivities(null)).toBeUndefined();
    expect(normalizeActionActivities([{ id: "bad", label: "bad", status: "invalid" }])).toBeUndefined();
  });
});

describe("upsertActionActivity", () => {
  it("adds new events and updates an existing event without duplicating it", () => {
    const start: ActionActivity = { id: "image", label: "Generate image", status: "running", detail: "Started" };
    const pending: ActionActivity = { id: "browser", label: "Browser action", status: "waiting_for_approval" };
    const completed: ActionActivity = { id: "image", label: "Generate image", status: "succeeded", detail: "Finished" };
    const first = upsertActionActivity(undefined, start);
    const withPending = upsertActionActivity(first, pending);
    const updated = upsertActionActivity(withPending, completed);
    expect(updated).toHaveLength(2);
    expect(updated[0]).toMatchObject({ id: "image", status: "succeeded", detail: "Finished" });
    expect(updated[1]).toMatchObject({ id: "browser", status: "waiting_for_approval" });
  });
});
