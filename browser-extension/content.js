const APP_ORIGINS = new Set([
  "https://enosxai.vercel.app",
  "https://enosx.ai",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function postToApp(type, payload) {
  window.postMessage({ source: "enosx-browser-extension", type, ...payload }, location.origin);
}

async function deliverPendingPage() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "ENOSX_GET_SHARED_PAGE" });
    if (response?.page) postToApp("SHARED_PAGE", { page: response.page });
  } catch {
    // The extension can be re-opened and the user can share the tab again.
  }
}

async function deliverPendingActionResult() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "ENOSX_GET_BROWSER_ACTION_RESULT" });
    if (response?.result) postToApp("BROWSER_ACTION_RESULT", { result: response.result });
  } catch {
    // Results are session-only; the app can continue even if delivery is unavailable.
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "ENOSX_DELIVER_SHARED_PAGE") void deliverPendingPage();
  if (message?.type === "ENOSX_DELIVER_BROWSER_ACTION_RESULT") void deliverPendingActionResult();
});

window.addEventListener("message", async (event) => {
  if (event.source !== window || event.origin !== location.origin || !APP_ORIGINS.has(event.origin)) return;
  const request = event.data;
  if (!request || request.source !== "enosx-ai-app" || request.type !== "QUEUE_BROWSER_ACTION") return;
  const requestId = typeof request.requestId === "string" ? request.requestId : "";

  try {
    const result = await chrome.runtime.sendMessage({
      type: "ENOSX_QUEUE_BROWSER_ACTION",
      action: request.action,
    });
    postToApp("BROWSER_ACTION_QUEUE_RESULT", { requestId, result });
  } catch {
    postToApp("BROWSER_ACTION_QUEUE_RESULT", {
      requestId,
      result: { ok: false, error: "ENOSX AI Browser Bridge is unavailable." },
    });
  }
});

void deliverPendingPage();
void deliverPendingActionResult();
