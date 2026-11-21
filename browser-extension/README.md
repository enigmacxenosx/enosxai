# ENOSX AI Browser Bridge (Chrome/Edge)

This optional Manifest V3 extension connects the ENOSX AI web app to a page the user chooses to share. The extension requests `activeTab` access only after the user opens the toolbar popup. It reads the active page's title, URL, and visible text (up to 12,000 characters); it never reads cookies, local storage, passwords, or browser history. Shared content is staged in the chat UI and is sent to the AI only when the user sends a message.

## Install for development

1. Open `chrome://extensions` (Chrome) or `edge://extensions` (Edge).
2. Enable Developer mode.
3. Choose **Load unpacked** and select this `browser-extension` folder.
4. Open `https://enosxai.vercel.app` (or the local Vite app) in a tab.
5. Open a normal webpage in another tab, click the ENOSX AI Browser Bridge toolbar icon, and choose **Share current page**. Return to ENOSX AI; the page should appear as a staged context card.

The extension is not installed automatically and this repository change does not publish a browser-store listing.

## Browser actions

The app may queue one `click_element` or `fill_form` proposal after the user reviews it in the app. The queue expires after two minutes and is stored in extension session storage. To execute it, open the matching target page, click the extension icon, inspect the target and proposed values, then select **Approve and run this action**. The origin, path, and query must match; a separate action needs a separate approval. Form filling dispatches input/change events but never submits the form. Password fields, hidden/disabled fields, unsupported elements, and page/target mismatches are blocked. A click on a submit control can submit a form, so the extension labels that case before approval. Canceling clears the pending action. After execution, ENOSX AI receives a one-time status notice; click status confirms dispatch, not the website's resulting state. Undelivered notices expire after five minutes.

## Manual verification checklist

- Share a page and verify its title, URL, and text appear in ENOSX AI before any chat send.
- Remove the staged page and verify it is not added to a message.
- Queue a test click on a harmless button; verify the action is shown in the extension only on the matching page and runs only after the popup approval.
- Queue a test fill on a non-sensitive field; verify the preview shows the exact value, filling does not submit, and the queue is one-shot.
- Verify the originating assistant message shows “Waiting for approval” after queueing and remains there until the extension reports an outcome.
- Approve a harmless click and verify the activity changes to succeeded with wording that confirms dispatch, not the website's resulting state; force a failed target and verify it changes to failed.
- Cancel a queued action in the popup and verify the originating activity changes to cancelled; closing the popup without approval must leave it waiting.
- Verify password fields, unsupported controls, a different URL, and expired actions cannot run.
- Test with the extension disabled: the app must report that the browser bridge did not respond and must not claim the action was queued.
