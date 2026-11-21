import type { AssistantAction } from "@/lib/types";

export interface SharedBrowserPage {
  title: string;
  url: string;
  text: string;
  sharedAt?: string;
}

export interface BrowserActionResult {
  actionType: "click_element" | "fill_form";
  url: string;
  message: string;
  completedAt: string;
}

export const SHARED_BROWSER_PAGE_EVENT = "enosx-browser-page-shared";
const MAX_PAGE_TEXT = 12_000;
const MAX_SELECTOR_LENGTH = 300;
const MAX_FIELD_VALUE_LENGTH = 4_000;

export function sanitizeSharedBrowserPage(value: unknown): SharedBrowserPage | null {
  if (!value || typeof value !== "object") return null;
  const page = value as Record<string, unknown>;
  if (typeof page.url !== "string" || typeof page.title !== "string" || typeof page.text !== "string") return null;
  try {
    const url = new URL(page.url);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) return null;
    return {
      title: page.title.slice(0, 240),
      url: url.toString().slice(0, 2048),
      text: page.text.slice(0, MAX_PAGE_TEXT),
      sharedAt: typeof page.sharedAt === "string" ? page.sharedAt.slice(0, 40) : undefined,
    };
  } catch {
    return null;
  }
}

export function sanitizeBrowserActionResult(value: unknown): BrowserActionResult | null {
  if (!value || typeof value !== "object") return null;
  const result = value as Record<string, unknown>;
  if (result.actionType !== "click_element" && result.actionType !== "fill_form") return null;
  if (typeof result.url !== "string" || typeof result.message !== "string" || typeof result.completedAt !== "string") return null;
  try {
    const url = new URL(result.url);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) return null;
    return {
      actionType: result.actionType,
      url: url.toString().slice(0, 2048),
      message: result.message.slice(0, 500),
      completedAt: result.completedAt.slice(0, 40),
    };
  } catch {
    return null;
  }
}

export function validateBrowserAction(action: AssistantAction): string | null {
  if (!action || !["click_element", "fill_form"].includes(action.type)) return "Only click and form-fill actions are supported.";
  if (typeof action.url !== "string" || action.url.length > 2048) return "The action needs a valid target URL.";
  try {
    const url = new URL(action.url);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) return "Only public HTTP(S) targets are supported.";
  } catch {
    return "The action target URL is invalid.";
  }
  if (action.type === "click_element") {
    if (typeof action.selector !== "string" || !action.selector.trim() || action.selector.length > MAX_SELECTOR_LENGTH) return "The action needs a bounded CSS selector.";
    return null;
  }
  if (!Array.isArray(action.fields) || action.fields.length < 1 || action.fields.length > 10) return "The action needs 1 to 10 form fields.";
  if (action.fields.some((field) => !field || typeof field.selector !== "string" || !field.selector.trim()
    || field.selector.length > MAX_SELECTOR_LENGTH
    || typeof field.value !== "string"
    || field.value.length > MAX_FIELD_VALUE_LENGTH)) return "One or more form fields are invalid or too large.";
  return null;
}

export function installBrowserExtensionBridge(
  onSharedPage: (page: SharedBrowserPage) => void,
  onActionResult?: (result: BrowserActionResult) => void,
): () => void {
  const onMessage = (event: MessageEvent) => {
    if (event.source !== window || event.origin !== window.location.origin) return;
    const message = event.data;
    if (!message || message.source !== "enosx-browser-extension") return;
    if (message.type === "SHARED_PAGE") {
      const page = sanitizeSharedBrowserPage(message.page);
      if (!page) return;
      window.dispatchEvent(new CustomEvent(SHARED_BROWSER_PAGE_EVENT, { detail: page }));
      onSharedPage(page);
      return;
    }
    if (message.type === "BROWSER_ACTION_RESULT" && onActionResult) {
      const result = sanitizeBrowserActionResult(message.result);
      if (result) onActionResult(result);
    }
  };
  window.addEventListener("message", onMessage);
  return () => window.removeEventListener("message", onMessage);
}

export function queueBrowserAction(action: AssistantAction): Promise<{ ok: boolean; error?: string }> {
  const validationError = validateBrowserAction(action);
  if (validationError) return Promise.resolve({ ok: false, error: validationError });
  const requestId = crypto.randomUUID();
  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      resolve({ ok: false, error: "Browser Bridge did not respond. Install or enable the ENOSX AI Browser Bridge extension." });
    }, 1800);
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const message = event.data;
      if (message?.source !== "enosx-browser-extension"
        || message.type !== "BROWSER_ACTION_QUEUE_RESULT"
        || message.requestId !== requestId) return;
      cleanup();
      resolve(message.result?.ok
        ? { ok: true }
        : { ok: false, error: typeof message.result?.error === "string" ? message.result.error : "The action could not be queued." });
    };
    const cleanup = () => {
      window.clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
    };
    window.addEventListener("message", onMessage);
    window.postMessage({ source: "enosx-ai-app", type: "QUEUE_BROWSER_ACTION", requestId, action }, window.location.origin);
  });
}
