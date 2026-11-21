const APP_URL = "https://enosxai.vercel.app/";
const APP_URLS = [
  "https://enosxai.vercel.app/*",
  "https://enosx.ai/*",
  "http://localhost:5173/*",
  "http://127.0.0.1:5173/*",
];
const MAX_SHARED_TEXT = 12000;
const shareButton = document.getElementById("share-page");
const statusNode = document.getElementById("status");
const actionCard = document.getElementById("action-card");
const actionSummary = document.getElementById("action-summary");
const actionTarget = document.getElementById("action-target");
const actionWarning = document.getElementById("action-warning");
const approveButton = document.getElementById("approve-action");
const cancelButton = document.getElementById("cancel-action");
let currentAction = null;
let currentTab = null;

async function reportActionOutcome(status, message) {
  if (!currentAction?.action) return;
  const result = {
    activityId: currentAction.activityId || "",
    status,
    actionType: currentAction.action.type,
    url: currentAction.action.url,
    message: String(message || "Browser action finished.").slice(0, 500),
    completedAt: new Date().toISOString(),
  };
  try {
    await chrome.runtime.sendMessage({ type: "ENOSX_STORE_BROWSER_ACTION_RESULT", result });
    const appTabs = await chrome.tabs.query({ url: APP_URLS });
    const appTab = appTabs.find((tab) => tab.id);
    if (appTab?.id) {
      try {
        await chrome.tabs.sendMessage(appTab.id, { type: "ENOSX_DELIVER_BROWSER_ACTION_RESULT" });
      } catch {
        // Keep the one-time result in extension session storage for the next app load.
      }
    }
  } catch {
    // The approved browser action remains visible in the extension even if the app is unavailable.
  }
}

function setStatus(text) {
  statusNode.textContent = text;
}

function isAppUrl(value) {
  try {
    const url = new URL(value);
    return ["https://enosxai.vercel.app", "https://enosx.ai", "http://localhost:5173", "http://127.0.0.1:5173"].includes(url.origin);
  } catch {
    return false;
  }
}

function sameTargetPage(currentUrl, expectedUrl) {
  try {
    const current = new URL(currentUrl);
    const expected = new URL(expectedUrl);
    const currentPath = current.pathname.replace(/\/$/, "") || "/";
    const expectedPath = expected.pathname.replace(/\/$/, "") || "/";
    return current.origin === expected.origin && currentPath === expectedPath && current.search === expected.search;
  } catch {
    return false;
  }
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab || null;
}

async function shareCurrentPage() {
  shareButton.disabled = true;
  try {
    currentTab = await getActiveTab();
    if (!currentTab?.id || !currentTab.url || !/^https?:\/\//i.test(currentTab.url)) {
      throw new Error("This page cannot be shared. Open a normal HTTP or HTTPS webpage first.");
    }
    if (isAppUrl(currentTab.url)) {
      throw new Error("Switch to the page you want to share, then click the extension again.");
    }
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: (limit) => ({
        title: String(document.title || "").slice(0, 240),
        url: location.href.slice(0, 2048),
        text: String(document.body?.innerText || "").slice(0, limit),
        sharedAt: new Date().toISOString(),
      }),
      args: [MAX_SHARED_TEXT],
    });
    const page = result?.result;
    if (!page?.url || !page.text) throw new Error("No visible page text was available to share.");
    const stored = await chrome.runtime.sendMessage({ type: "ENOSX_STORE_SHARED_PAGE", page });
    if (!stored?.ok) throw new Error(stored?.error || "Could not prepare the page for sharing.");

    const appTabs = await chrome.tabs.query({ url: APP_URLS });
    const appTab = appTabs.find((tab) => tab.id);
    if (appTab?.id) {
      try {
        await chrome.tabs.sendMessage(appTab.id, { type: "ENOSX_DELIVER_SHARED_PAGE" });
      } catch {
        await chrome.tabs.update(appTab.id, { active: true });
      }
      setStatus(`Shared “${page.title || new URL(page.url).hostname}” with ENOSX AI. It is staged, not sent.`);
    } else {
      await chrome.tabs.create({ url: APP_URL });
      setStatus(`Opened ENOSX AI and shared “${page.title || new URL(page.url).hostname}”.`);
    }
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Could not share this page.");
  } finally {
    shareButton.disabled = false;
  }
}

function actionText(action) {
  if (action.type === "click_element") return `Click element: ${action.selector}`;
  return `Fill ${action.fields?.length || 0} form field(s)`;
}

async function inspectAction(tab, action) {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (actionSpec) => {
      const visible = (element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
      };
      const describe = (element) => ({
        tag: element.tagName.toLowerCase(),
        text: (element.innerText || element.textContent || element.getAttribute("aria-label") || element.value || "").trim().slice(0, 180),
        type: element instanceof HTMLButtonElement || element instanceof HTMLInputElement ? element.type : element.getAttribute("type") || "",
        disabled: Boolean(element.disabled),
        href: element instanceof HTMLAnchorElement ? element.href : "",
        visible: visible(element),
      });
      try {
        if (actionSpec.type === "click_element") {
          const found = document.querySelector(actionSpec.selector);
          if (!found) return { ok: false, error: "The requested element was not found on this page." };
          const element = found.closest("button,a,[role='button'],input[type='button'],input[type='submit'],input[type='reset']") || found;
          const details = describe(element);
          const supported = element.matches("button,a,[role='button'],input[type='button'],input[type='submit'],input[type='reset']");
          if (!supported) return { ok: false, error: "Only visible buttons, links, and button-like controls can be clicked." };
          if (!details.visible || details.disabled) return { ok: false, error: "The target control is hidden or disabled." };
          return { ok: true, target: details };
        }
        const targets = [];
        for (const field of actionSpec.fields || []) {
          const element = document.querySelector(field.selector);
          if (!element) return { ok: false, error: `Field not found: ${field.selector}` };
          const tag = element.tagName.toLowerCase();
          const type = (element.getAttribute("type") || "").toLowerCase();
          if (type === "password") return { ok: false, error: "Password fields are never filled by ENOSX AI." };
          if (!["input", "textarea", "select"].includes(tag) && element.getAttribute("contenteditable") !== "true") {
            return { ok: false, error: `Unsupported form field: ${field.selector}` };
          }
          if (element.disabled || element.readOnly || !visible(element)) return { ok: false, error: `Field is hidden, disabled, or read-only: ${field.selector}` };
          targets.push({ ...describe(element), selector: field.selector, proposedValue: field.value.slice(0, 4000) });
        }
        return { ok: true, targets };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Could not inspect the target." };
      }
    },
    args: [action],
  });
  return result?.result || { ok: false, error: "Could not inspect the target page." };
}

async function renderPendingAction() {
  const tab = await getActiveTab();
  currentTab = tab;
  const response = await chrome.runtime.sendMessage({ type: "ENOSX_GET_PENDING_BROWSER_ACTION" });
  const pending = response?.pending;
  if (!pending) {
    actionCard.hidden = true;
    return;
  }
  currentAction = pending;
  actionCard.hidden = false;
  actionSummary.textContent = `${actionText(pending.action)} on ${pending.action.url}`;
  actionWarning.textContent = "Review the page and exact target below. Clicking Approve and run performs this one action only. It may have a real effect on the website.";

  if (!tab?.id || !tab.url || !sameTargetPage(tab.url, pending.action.url)) {
    actionTarget.textContent = "Open the exact target page in this tab, then reopen the extension to review the action.";
    approveButton.disabled = true;
    return;
  }
  try {
    const inspection = await inspectAction(tab, pending.action);
    if (!inspection.ok) throw new Error(inspection.error || "Target could not be verified.");
    actionTarget.textContent = pending.action.type === "click_element"
      ? `Target: <${inspection.target.tag}> ${inspection.target.text || "(no visible label)"}${inspection.target.type ? ` · type=${inspection.target.type}` : ""}${inspection.target.href ? ` · ${inspection.target.href}` : ""}`
      : inspection.targets.map((target) => `Field: ${target.text || target.selector}\nProposed value: ${target.proposedValue}`).join("\n\n");
    if (pending.action.type === "click_element" && inspection.target.type.toLowerCase() === "submit") {
      actionWarning.textContent = "This is a submit control. Approving may submit the page's form; inspect the exact target and page before continuing.";
    }
    approveButton.disabled = false;
  } catch (error) {
    actionTarget.textContent = error instanceof Error ? error.message : "The target could not be verified.";
    approveButton.disabled = true;
  }
}

async function executeApprovedAction() {
  if (!currentAction || !currentTab?.id || !currentTab.url || !sameTargetPage(currentTab.url, currentAction.action.url)) {
    setStatus("Target page changed. Reopen the extension on the matching page and review again.");
    await renderPendingAction();
    return;
  }
  approveButton.disabled = true;
  cancelButton.disabled = true;
  setStatus("Running the single action you approved…");
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: (actionSpec) => {
        const visible = (element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
        };
        try {
          if (actionSpec.type === "click_element") {
            const found = document.querySelector(actionSpec.selector);
            if (!found) return { ok: false, error: "The target is no longer on the page." };
            const element = found.closest("button,a,[role='button'],input[type='button'],input[type='submit'],input[type='reset']") || found;
            if (!element.matches("button,a,[role='button'],input[type='button'],input[type='submit'],input[type='reset']") || !visible(element) || element.disabled) {
              return { ok: false, error: "The target is no longer an enabled, visible button or link." };
            }
            element.click();
            return { ok: true, result: "The approved click was dispatched. Verify the website's response." };
          }
          for (const field of actionSpec.fields || []) {
            const element = document.querySelector(field.selector);
            if (!element) return { ok: false, error: `Field no longer found: ${field.selector}` };
            const tag = element.tagName.toLowerCase();
            const type = (element.getAttribute("type") || "").toLowerCase();
            if (type === "password") return { ok: false, error: "Password fields are never filled by ENOSX AI." };
            if (!["input", "textarea", "select"].includes(tag) && element.getAttribute("contenteditable") !== "true") return { ok: false, error: "Unsupported form field." };
            if (element.disabled || element.readOnly || !visible(element)) return { ok: false, error: "The field is hidden, disabled, or read-only." };
            if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
              const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
              const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
              if (setter) setter.call(element, field.value);
              else element.value = field.value;
            } else {
              element.textContent = field.value;
            }
            element.dispatchEvent(new Event("input", { bubbles: true }));
            element.dispatchEvent(new Event("change", { bubbles: true }));
          }
          return { ok: true, result: "The approved field values were filled. The form was not submitted." };
        } catch (error) {
          return { ok: false, error: error instanceof Error ? error.message : "The action failed." };
        }
      },
      args: [currentAction.action],
    });
    const actionResult = result?.result;
    if (!actionResult?.ok) throw new Error(actionResult?.error || "The action did not complete.");
    await reportActionOutcome("succeeded", actionResult.result || "Approved browser action completed.");
    try {
      await chrome.runtime.sendMessage({ type: "ENOSX_CLEAR_PENDING_BROWSER_ACTION" });
    } catch {
      // The action already ran; do not downgrade its reported outcome if cleanup fails.
    }
    setStatus(actionResult.result || "Approved action completed.");
    actionCard.hidden = true;
    currentAction = null;
  } catch (error) {
    const message = error instanceof Error ? error.message : "The action failed.";
    await reportActionOutcome("failed", message);
    setStatus(message);
    approveButton.disabled = false;
    cancelButton.disabled = false;
  }
}

async function cancelPendingAction() {
  await reportActionOutcome("cancelled", "Canceled by the user before execution.");
  await chrome.runtime.sendMessage({ type: "ENOSX_CLEAR_PENDING_BROWSER_ACTION" });
  currentAction = null;
  actionCard.hidden = true;
  setStatus("Pending action canceled.");
}

shareButton.addEventListener("click", () => void shareCurrentPage());
approveButton.addEventListener("click", () => void executeApprovedAction());
cancelButton.addEventListener("click", () => void cancelPendingAction());
void renderPendingAction();
