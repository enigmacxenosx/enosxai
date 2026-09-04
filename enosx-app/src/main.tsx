import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
// @ts-ignore - virtual module handled by vite-plugin-pwa
import { registerSW } from 'virtual:pwa-register';

// Register service worker for PWA
const updateSW = registerSW({
  onNeedRefresh() {
    // Apply deployments immediately so users do not remain on a stale app
    // shell waiting for a confirmation dialog that may never be noticed.
    void updateSW(true);
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
});

// The web app remains unchanged; this branch is activated only inside the
// Tauri desktop shell. Updates are signed and require user approval before
// download, then the app restarts into the new version.
if ("__TAURI_INTERNALS__" in window) {
  void (async () => {
    const [{ check }, { ask }, { relaunch }] = await Promise.all([
      import("@tauri-apps/plugin-updater"),
      import("@tauri-apps/plugin-dialog"),
      import("@tauri-apps/plugin-process"),
    ]);
    const update = await check();
    if (!update) return;
    const approved = await ask(
      `ENOSX AI ${update.version} is available. Install it now?`,
      { title: "ENOSX AI update", kind: "info" },
    );
    if (!approved) return;
    await update.downloadAndInstall();
    await relaunch();
  })().catch((error) => {
    console.error("ENOSX AI update check failed", error);
  });
}

createRoot(document.getElementById("root")!).render(<App />);
