# Task state (2026-08-16 16:51) — current user request

## Request
1. Run the pyodide lib test script (test_scripts/pyodide_lib_test.py, syntax-verified OK) in the workspace Script Console and verify numpy + pyyaml load/execute in WASM.
2. Implement the 5 terminal performance optimizations (in terminal_performance_optimization_report.md) in useScriptRuntime.ts + TerminalWindow.tsx and push to GitHub.

## Local environment
- Repo: ~/enosxai, branch main, latest commit f8a7b69 (clean after commit; untracked: diagnosis.md, final_state.md, verify_state*.md, summary files)
- Preview server on :4500 (vite preview, log /tmp/preview.log), API proxy on :8080 (node ~/enosxai/scripts/api-proxy.mjs, log /tmp/proxy.log) — BOTH RUNNING
- Browser has service worker registered (may serve stale bundle; if stuck on splash, unregister SW via console: navigator.serviceWorker.getRegistrations().then(r=>r.forEach(x=>x.unregister())) then reload)
- Browser at http://localhost:4500/ — app loaded, split-screen layout working, 5 scripts in console (hello.py, system-info.sh, setup.bat, hello_fib.py, greet2.bat)

## Plan for lib test (browser)
- Paste test script via UI: click Script Console (Terminal icon element 65), find "new script" affordance or ask AI to create it. Better: use console to directly write the localStorage key? The runtime store is module-internal; easier: paste content into a new script via TerminalWindow UI if it has a create button, else ask AI in chat.
- Test script content is at ~/enosxai/test_scripts/pyodide_lib_test.py (83 lines; uses asyncio.run wrapper + await-able stages 2-4 with numpy+multipip pyyaml).
- NOTE: pyodide_lib_test.py uses `_asyncio.run(main())` — Pyodide's runPythonAsync handles sync top-level asyncio.run fine.

## The 5 optimizations to implement
P1. Batched output flush: appendRunOutput accumulates in pending Map, flush timer 75ms, then one setRun per batch.
P2. Cap output at MAX_OUTPUT_LINES=2000 per run (slice(-2000)).
P3. Debounced localStorage persistence (1500ms, schedulePersist via schedule in notifyStore only for scripts changes; persist runs only when run status is done/error).
P4. TerminalWindow auto-scroll: instant (no behavior:smooth), only when user at bottom (scrollHeight - scrollTop - clientHeight < 24).
P5. Output tail windowing in TerminalWindow JSX: render r.output.slice(-300).

## Deliverables already written
- ~/enosxai/test_scripts/pyodide_lib_test.py
- ~/enosxai/terminal_performance_optimization_report.md
- ~/enosxai/summary_split_screen_auto_coding.md (previous task)

## After implementation
- typecheck: npx tsc -p tsconfig.json --noEmit
- build: npx vite build (dist/public/)
- restart preview (kill + restart vite preview :4500), unregister SW, retest: run greet2.bat or hello.py + the lib test
- commit + push (e.g., "Optimize terminal streaming: batched output, output cap, debounced persistence, instant auto-scroll, tail windowing")
- Word doc summary required per user preference — create .docx summary of work done.
