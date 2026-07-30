# ENOSX AI Assistant

An AI assistant web app powered by Groq's LLM, with a cyberpunk glassmorphism design, multimodal capabilities, and theme switching.

## Run & Operate

- Frontend workflow: `artifacts/enosx-assistant: web`
- API workflow: `artifacts/api-server: API Server`
- `pnpm run typecheck` — full typecheck across all packages
- Required env: `GROQ_API_KEY` — Groq API key (set in Replit Secrets tab)
- Optional env: `GITHUB_TOKEN` — for GitHub context feature

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + Tailwind v4 + wouter (routing) + framer-motion
- API: Express 5 (handles `/api/chat` streaming + `/api/github/context`)
- Theme: "Crimson Matrix" — cyberpunk glassmorphism, dark-first, multi-theme support

## Where things live

- `artifacts/enosx-assistant/` — React + Vite frontend
  - `src/App.tsx` — root app with wouter router + theme/context providers
  - `src/pages/ChatPage.tsx` — main chat interface
  - `src/pages/AboutPage.tsx` — about page
  - `src/components/SplashPage.tsx` — 3.5s animated splash intro
  - `src/hooks/useGroq.ts` — streaming chat hook (calls `/api/chat`)
  - `src/contexts/ThemeContext.tsx` — theme switching (dark/neon/cyberpunk/minimal/light)
  - `src/index.css` — Tailwind v4 + custom CSS with "Crimson Matrix" design tokens
- `artifacts/api-server/` — Express API server
  - `src/routes/chat.ts` — `/api/chat` (Groq streaming) + `/api/github/context`
  - `src/routes/health.ts` — `/api/healthz`

## Architecture decisions

- The `/api/chat` route proxies to Groq API with SSE streaming — API key stays server-side.
- The app uses wouter for client routing with `BASE_URL` base path for Replit proxy compatibility.
- `SplashPage` is a 3.5s animated intro — expected behavior, not a hang.
- Tailwind v4 with `@tailwindcss/vite` (no postcss config needed).
- The app has a built-in fallback Groq API key for demo/development; set `GROQ_API_KEY` env var for production.

## Product

- AI chat assistant with streaming responses from Groq (llama-3.3-70b)
- Multimodal UI: voice input, camera feed, file drop, clipboard detection
- Multiple themes: Crimson (default), Neon, Cyberpunk, Minimal, Light
- God Mode for advanced AI interactions
- GitHub context awareness (reads repo structure to inform answers)
- System action chaining (open URLs, launch apps)
- Animated splash intro, animated AI face/orb, command bar

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Do NOT run `pnpm dev` at workspace root — it has no dev script.
- The splash screen lasts 3.5s intentionally — not a bug.
- `GROQ_API_KEY` env var must be set in Replit Secrets tab — the app will return an error if missing.
- Vite config requires `PORT` and `BASE_PATH` env vars (provided automatically by Replit workflows).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
