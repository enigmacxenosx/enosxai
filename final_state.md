# Final state snapshot (2026-08-16 ~16:25, pre-compaction)

## Commits pushed (main branch, GitHub enigmacxenosx/enosxai)
1. ea100e7 — Auto-execute proposed actions (launch_app etc.) live in computer pane when split is on
2. f8a7b69 — Unescape double-escaped newlines in AI-created script content

Typecheck and build both pass. Deployed via Vercel, but Vercel deployments RATE-LIMITED ~24h (started ~15:40 on 2026-08-16) — live site still serves older bundle.

## Verified features (via local vite preview on :4500 with api-proxy on :8080 forwarding to enosxai.vercel.app)
- Split-screen workspace on /workspace: VERIFIED
- Split toggle on /workspace page: VERIFIED
- Standalone split toggle on Chat page ("Split: On/Off" button top of chat): VERIFIED, shared via localStorage key enosx-workspace-split-enabled-v1
- AI auto-coding in computer pane: VERIFIED end-to-end:
  - Asked "write greet.bat and run it" -> Script Console showed "Script created: greet.bat (batch)" toast, script appeared automatically (5 scripts total), run executed ("exited with code 0"), proposed action "Launch terminal" auto-opened terminal window with toast "Opened terminal in the workspace".
  - Earlier: fibonacci python script hello_fib.py created+run automatically.
- Python scripts run for real via Pyodide; shell/batch are labeled simulations.
- Minor bug fixed: escaped \n in AI's create_script JSON (now unescaped in useCommandChain.ts).

## Remaining UI test (in progress)
App stuck on splash after service-worker unregister + reload — need to reload once more, then resend "write greet2.bat..." to verify the unescape fix renders multiline batch output correctly. Live API itself healthy (curl 3s response 200); earlier UI "No response received" was intermittent (stream parser / proxy flake), not a code bug.

## Deliverables plan
- Write /home/ubuntu/enosxai/summary_split_screen_auto_coding.md covering: split workspace, toggle (page + chat), persistence, auto-live-coding pipeline (parseWorkspaceActions + proposed-action auto-execution + mapWorkspaceAppId + window brokers), script runtime (Pyodide/simulated), known caveats (Vercel rate limit, batch sim label, model emits actions as proposed chips or [[ACTION:...]] blocks).
- Deliver result message to user.

## Key technical notes
- Repo: ~/enosxai (enigmacxenosx/enosxai, main). Build: cd ~/enosxai/enosx-app && npx vite build (dist/public/). Typecheck: npx tsc -p tsconfig.json --noEmit. Preview: npx vite preview --port 4500 (needs node ~/enosxai/scripts/api-proxy.mjs on :8080).
- Live: enosxai.vercel.app (Vercel auto-deploys main).
- Providers: ChatPage renders ComputerWorkspaceProvider around workspaceBody; Window broker pattern (window.__chatExecuteWorkspaceActions, __chatOpenWorkspaceWindow) connects handleSend to WorkspaceActionsController.
- API model: openai/gpt-oss-20b via OpenRouter (free); system prompt extended with create_script/run_script/launch_app docs when split on (workspaceDirectives.ts).
