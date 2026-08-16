# Task state (16:58) — lib test + 5 optimizations

## Current request (user)
1. Run pyodide lib test; verify numpy + pyyaml load/execute in WASM. — IN PROGRESS
2. Implement 5 terminal optimizations in useScriptRuntime.ts + TerminalWindow.tsx, push to GitHub. — IN PROGRESS

## Key findings
- Bug found & fixed in useScriptRuntime.ts runPythonScript: it spread the STALE captured `run` object (output:[]) on setRun calls, wiping stdout appends. Fixed to spread `store.runs.get(script.id) ?? run` for running/done/error branches (lines 142, 147, 156). Same fix applied to runShellScript (lines 270, 278). Batch runShell OK already (uses `current` from store at last tick) but its line 376 `setRun({ ...run, status: "running" })` also stale — FIX STILL NEEDED.
- lib test script: ~/enosxai/test_scripts/pyodide_lib_test.py (final version uses micropip.install numpy+pyyaml, top-level `await main()`). AST-verified. Copied to ~/enosxai/enosx-app/dist/public/pyodide_lib_test.py for local fetch during testing.
- Test script is in browser localStorage (enosx-workspace-scripts-v1, name pyodide-lib-test.py). To re-run: click Run button (aria-label "Run pyodide-lib-test.py") — takes up to 60s first time (numpy download). Output check via DOM: find button by aria-label, outer = btn.parentElement.parentElement.parentElement, output = outer.querySelector('div.font-mono'), children after <PRE> tag are run output lines; final footer "$ ✓ exited with code N".
- Pyodide: window.loadPyodide available; "full" bundle does NOT auto-install numpy — needs micropip.install("numpy") or pyodide.loadPackage("numpy"). asyncio.run() fails in Pyodide (running event loop) → use top-level await.
- Local env: preview :4500 running (log /tmp/preview.log), proxy :8080 running (log /tmp/proxy.log). Repo ~/enosxai main, last commit f8a7b69. After edits: typecheck `npx tsc -p tsconfig.json --noEmit`, build `npx vite build`, kill + restart vite preview (pkill -f "vite preview" then cd ~/enosxai/enosx-app && npx vite preview --port 4500 > /tmp/preview.log 2>&1 &), copy test script to dist/public again, browser: service worker may cache old bundle — unregister via navigator.serviceWorker.getRegistrations().then(r=>r.forEach(x=>x.unregister())) then reload.
- Vercel rate-limited — user redeploys manually. Not blocking.

## Remaining optimizations to implement (from terminal_performance_optimization_report.md)
P1. Batched output flush in appendRunOutput: pending Map<runId, ScriptRun>, 75ms flush timer, one setRun per batch.
P2. MAX_OUTPUT_LINES = 2000 cap in appendRunOutput output slice.
P3. Debounced localStorage persistence: schedulePersist() 1500ms; persist runs only when status done/error (in setScripts only save finished runs' output to lastOutput — already done; add debounced saveScripts call instead of every notifyStore? notifyStore saves scripts every tick — throttle that).
P4. TerminalWindow.tsx auto-scroll: replace behavior:"smooth"/top:999999 with instant scroll only when near bottom (scrollHeight - scrollTop - clientHeight < 24).
P5. TerminalWindow output tail windowing: render r.output.slice(-300).

## After implementation
1. typecheck + build, restart preview, verify: (a) hello.py output now visible (regression test of bugfix), (b) greet2.bat runs with output, (c) pyodide-lib-test.py shows ALL STAGES PASSED with numpy version + yaml parse output.
2. Commit + push. Commit message idea: "Fix python stdout loss in script runs and add terminal streaming performance optimizations".
3. Deliver: user gets test results + optimizations. Also create a Word doc summary per user preference? Previous delivery used md; knowledge says Word doc. Create enosx_terminal_optimizations.docx via pandoc or python-docx. (python-docx may not be installed; check with pip3 list | grep -i docx; else install or use pandoc.)

## Deliverables already in ~/enosxai
- test_scripts/pyodide_lib_test.py (FINAL version to keep — matches what's injected in browser)
- terminal_performance_optimization_report.md
- summary_split_screen_auto_coding.md (previous task)
