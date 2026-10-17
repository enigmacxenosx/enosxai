import { toast } from "sonner";

const recentReports = new Map<string, number>();
const REPORT_DEDUPE_WINDOW_MS = 60_000;

function plainText(value: unknown, maxLength: number) {
  return String(value ?? "Unknown error")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
    .slice(0, maxLength);
}

/** Send technical error details only; never attach chat text, files, or account data. */
export function reportClientError(error: unknown, source = "client", extraStack = "") {
  if (typeof window === "undefined") return;
  const errorObject = error instanceof Error ? error : undefined;
  const message = plainText(errorObject?.message ?? error, 500);
  const stack = plainText(extraStack || errorObject?.stack || "", 1800);
  const key = `${source}:${message}:${stack.slice(0, 160)}`;
  const now = Date.now();
  if ((recentReports.get(key) ?? 0) > now - REPORT_DEDUPE_WINDOW_MS) return;
  recentReports.set(key, now);
  for (const [reportedKey, timestamp] of recentReports) {
    if (timestamp <= now - REPORT_DEDUPE_WINDOW_MS) recentReports.delete(reportedKey);
  }

  const payload = {
    message,
    stack,
    source: plainText(source, 80),
    path: plainText(window.location.pathname, 200),
    appVersion: "0.1.24",
    userAgent: plainText(window.navigator.userAgent, 300),
    occurredAt: new Date(now).toISOString(),
  };
  void fetch("/api/error-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // Reporting is best-effort and must never disrupt the user's current task.
  });
}

export function showError(...args: Parameters<typeof toast.error>) {
  toast.error(...args);
  reportClientError(args[0], "user-visible-error");
}

export function installGlobalErrorReporting() {
  if (typeof window === "undefined") return;
  window.addEventListener("error", (event) => {
    reportClientError(event.error ?? event.message, "window.error");
  });
  window.addEventListener("unhandledrejection", (event) => {
    reportClientError(event.reason, "unhandledrejection");
  });
}
