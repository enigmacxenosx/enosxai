const SHARE_KEY = "enosxPendingShare";
const ACTION_KEY = "enosxPendingAction";
const RESULT_KEY = "enosxPendingActionResult";
const ACTION_TTL_MS = 2 * 60 * 1000;
const RESULT_TTL_MS = 5 * 60 * 1000;

function isValidAction(action) {
  if (!action || !["click_element", "fill_form"].includes(action.type)) return false;
  if (typeof action.url !== "string" || action.url.length > 2048) return false;
  try {
    const target = new URL(action.url);
    if (!["http:", "https:"].includes(target.protocol) || target.username || target.password) return false;
  } catch {
    return false;
  }
  if (action.type === "click_element") {
    return typeof action.selector === "string" && action.selector.trim().length > 0 && action.selector.length <= 300;
  }
  return Array.isArray(action.fields)
    && action.fields.length > 0
    && action.fields.length <= 10
    && action.fields.every((field) => typeof field?.selector === "string"
      && field.selector.trim().length > 0
      && field.selector.length <= 300
      && typeof field.value === "string"
      && field.value.length <= 4000);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "ENOSX_STORE_SHARED_PAGE") {
    const page = message.page;
    if (!page || typeof page.url !== "string" || typeof page.title !== "string" || typeof page.text !== "string") {
      sendResponse({ ok: false, error: "Invalid page data." });
      return;
    }
    chrome.storage.session.set({ [SHARE_KEY]: { ...page, receivedAt: Date.now() } })
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false, error: "Could not store the page for ENOSX AI." }));
    return true;
  }

  if (message?.type === "ENOSX_GET_SHARED_PAGE") {
    chrome.storage.session.get(SHARE_KEY).then(async (stored) => {
      const page = stored[SHARE_KEY];
      if (page) await chrome.storage.session.remove(SHARE_KEY);
      sendResponse({ ok: true, page: page && Date.now() - page.receivedAt <= ACTION_TTL_MS ? page : null });
    }).catch(() => sendResponse({ ok: false, page: null }));
    return true;
  }

  if (message?.type === "ENOSX_QUEUE_BROWSER_ACTION") {
    if (!isValidAction(message.action)) {
      sendResponse({ ok: false, error: "This browser action is missing required details or is not supported." });
      return;
    }
    chrome.storage.session.get(ACTION_KEY).then(async (stored) => {
      const existing = stored[ACTION_KEY];
      if (existing && existing.expiresAt > Date.now()) {
        sendResponse({ ok: false, error: "Another browser action is already waiting for review. Complete or clear it first." });
        return;
      }
      const queued = {
        id: crypto.randomUUID(),
        activityId: typeof message.activityId === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(message.activityId) ? message.activityId : "",
        action: message.action,
        queuedAt: Date.now(),
        expiresAt: Date.now() + ACTION_TTL_MS,
      };
      await chrome.storage.session.set({ [ACTION_KEY]: queued });
      sendResponse({ ok: true, id: queued.id, expiresAt: queued.expiresAt });
    }).catch(() => sendResponse({ ok: false, error: "Could not queue the browser action." }));
    return true;
  }

  if (message?.type === "ENOSX_GET_PENDING_BROWSER_ACTION") {
    chrome.storage.session.get(ACTION_KEY).then(async (stored) => {
      const queued = stored[ACTION_KEY];
      if (queued && queued.expiresAt <= Date.now()) {
        await chrome.storage.session.remove(ACTION_KEY);
        sendResponse({ ok: true, pending: null });
        return;
      }
      sendResponse({ ok: true, pending: queued || null });
    }).catch(() => sendResponse({ ok: false, pending: null }));
    return true;
  }

  if (message?.type === "ENOSX_CLEAR_PENDING_BROWSER_ACTION") {
    chrome.storage.session.remove(ACTION_KEY)
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message?.type === "ENOSX_STORE_BROWSER_ACTION_RESULT") {
    if (!message.result || typeof message.result.message !== "string" || typeof message.result.url !== "string"
      || !["click_element", "fill_form"].includes(message.result.actionType)
      || typeof message.result.completedAt !== "string"
      || (message.result.status !== undefined && !["succeeded", "failed", "cancelled"].includes(message.result.status))
      || (message.result.activityId !== undefined && (typeof message.result.activityId !== "string" || message.result.activityId.length > 100))) {
      sendResponse({ ok: false });
      return;
    }
    chrome.storage.session.set({ [RESULT_KEY]: { payload: message.result, storedAt: Date.now() } })
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message?.type === "ENOSX_GET_BROWSER_ACTION_RESULT") {
    chrome.storage.session.get(RESULT_KEY).then(async (stored) => {
      const result = stored[RESULT_KEY];
      if (result) await chrome.storage.session.remove(RESULT_KEY);
      sendResponse({ ok: true, result: result && Date.now() - result.storedAt <= RESULT_TTL_MS ? result.payload : null });
    }).catch(() => sendResponse({ ok: false, result: null }));
    return true;
  }

  return false;
});
