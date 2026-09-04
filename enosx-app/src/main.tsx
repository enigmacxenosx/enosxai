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

createRoot(document.getElementById("root")!).render(<App />);
