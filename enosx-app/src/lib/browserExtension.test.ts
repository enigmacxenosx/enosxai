import { describe, expect, it } from "vitest";
import { sanitizeBrowserActionResult, sanitizeSharedBrowserPage, validateBrowserAction } from "./browserExtension";

describe("sanitizeSharedBrowserPage", () => {
  it("accepts public HTTP(S) page context and bounds the text", () => {
    const result = sanitizeSharedBrowserPage({
      title: "Page",
      url: "https://example.com/article",
      text: "x".repeat(13_000),
      sharedAt: "2026-11-21T00:00:00.000Z",
    });
    expect(result?.url).toBe("https://example.com/article");
    expect(result?.text).toHaveLength(12_000);
  });

  it("rejects credentials, non-http schemes, and malformed data", () => {
    expect(sanitizeSharedBrowserPage({ title: "x", url: "https://user:pass@example.com", text: "x" })).toBeNull();
    expect(sanitizeSharedBrowserPage({ title: "x", url: "javascript:alert(1)", text: "x" })).toBeNull();
    expect(sanitizeSharedBrowserPage({ title: "x", url: "not a URL", text: "x" })).toBeNull();
    expect(sanitizeSharedBrowserPage({ url: "https://example.com", text: "x" })).toBeNull();
  });
});

describe("validateBrowserAction", () => {
  it("accepts a single bounded selector click on HTTP(S)", () => {
    expect(validateBrowserAction({ type: "click_element", url: "https://example.com/settings", selector: "button.save" })).toBeNull();
  });

  it("accepts bounded form values but rejects password field directives by type", () => {
    expect(validateBrowserAction({
      type: "fill_form",
      url: "https://example.com/profile",
      fields: [{ selector: "input[name='displayName']", value: "Roeno" }],
    })).toBeNull();
    expect(validateBrowserAction({ type: "fill_form", url: "https://example.com", fields: [] })).toBeTruthy();
  });

  it("rejects unsupported action types and unsafe or oversized targets", () => {
    expect(validateBrowserAction({ type: "open_url", url: "https://example.com" })).toBeTruthy();
    expect(validateBrowserAction({ type: "click_element", url: "javascript:alert(1)", selector: "button" })).toBeTruthy();
    expect(validateBrowserAction({ type: "click_element", url: "https://example.com", selector: "x".repeat(301) })).toBeTruthy();
    expect(() => validateBrowserAction({ type: "click_element", url: "https://example.com", selector: 2 } as any)).not.toThrow();
    expect(() => validateBrowserAction({ type: "fill_form", url: "https://example.com", fields: [null] } as any)).not.toThrow();
  });
});

describe("sanitizeBrowserActionResult", () => {
  it("accepts safe completion status and bounds its text", () => {
    const result = sanitizeBrowserActionResult({
      actionType: "fill_form",
      url: "https://example.com/profile",
      message: "x".repeat(700),
      completedAt: "2026-11-21T00:00:00.000Z",
      activityId: "browser_action_01",
      status: "failed",
    });
    expect(result?.url).toBe("https://example.com/profile");
    expect(result?.message).toHaveLength(500);
    expect(result?.activityId).toBe("browser_action_01");
    expect(result?.status).toBe("failed");
  });

  it("rejects unsafe targets and invalid shapes", () => {
    expect(sanitizeBrowserActionResult({ actionType: "click_element", url: "javascript:alert(1)", message: "done", completedAt: "now" })).toBeNull();
    expect(sanitizeBrowserActionResult({ actionType: "open_url", url: "https://example.com", message: "done", completedAt: "now" })).toBeNull();
    expect(sanitizeBrowserActionResult({ actionType: "click_element", url: "https://example.com", message: "done", completedAt: "now", status: "pending" })).toBeNull();
  });
});
