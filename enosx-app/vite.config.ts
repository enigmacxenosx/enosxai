import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Source directory is ./src relative to this config file
const srcDir = path.resolve(__dirname, "src");
const projectRoot = __dirname;

const port = Number(process.env.PORT || 5173);
const basePath = process.env.BASE_PATH || "/";

// Replit-specific plugins are only loaded when running inside Replit
// (detected by the REPL_ID environment variable)
// Use dynamic require-style imports to avoid TS module resolution errors
let replitPlugins: any[] = [];
if (process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const runtimeErrorOverlay = require("@replit/vite-plugin-runtime-error-modal").default;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { cartographer } = require("@replit/vite-plugin-cartographer");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { devBanner } = require("@replit/vite-plugin-dev-banner");
    replitPlugins = [
      runtimeErrorOverlay(),
      cartographer({ root: projectRoot }),
      devBanner(),
    ];
  } catch {
    // Replit plugins not available outside Replit
  }
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    ...replitPlugins,
  ],
  resolve: {
    alias: {
      "@": srcDir,
      "@assets": path.resolve(projectRoot, "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },

  build: {
    outDir: path.resolve(projectRoot, "dist/public"),
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
    proxy: {
      "/api": {
        target: `http://localhost:8080`,
        changeOrigin: true,
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
