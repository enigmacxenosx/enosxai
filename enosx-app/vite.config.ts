import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Source directory is ./src relative to this config file
const srcDir = path.resolve(__dirname, "src");
const projectRoot = __dirname;

const port = Number(process.env.PORT || 5173);
const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
  base: basePath,
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    restoreMocks: true,
    clearMocks: true,
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: ['favicon.ico', 'favicon.png', 'favicon.svg', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'ENOSX AI',
        short_name: 'ENOSX',
        description: 'Advanced AI Interface for Phone and TV',
        theme_color: '#0d0e14',
        background_color: '#0d0e14',
        display: 'standalone',
        icons: [
          {
            src: 'favicon.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'favicon.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'favicon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      injectManifest: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB
        // Only precache the launch shell. Optional routes and their large
        // language/diagram bundles stay on-demand instead of making the
        // first PWA install download the entire 55MB build.
        globPatterns: ['**/*.html', '**/*.css', '**/assets/index-*.js', '**/favicon*', '**/manifest.webmanifest']
      }
    }),
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
