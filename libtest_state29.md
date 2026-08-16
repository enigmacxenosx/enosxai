# State 29 (17:28) — ROOT BUG FIXED, final steps

## ROOT CAUSE (the big one)
In useScriptRuntime.ts, `appendRunOutput` built each pending snapshot off `store.runs.get(runId)` — but the store is only updated at flush time. So every append started from a stale (empty) tail, and `pendingOutputs.set()` replaced the entry each time → only the LAST line before each 75ms flush survived. Fast runs lost everything except the final print.

## FIXES APPLIED (verified working)
1. **Accumulator fix** in appendRunOutput: build off `pendingOutputs.get(runId)?.run ?? store.runs.get(runId)`. Verified: iso1000.py (1000 lines) — 302 DOM children, windowing works, all lines captured.
2. **Flush terminal sync**: when flushed merged run has status done/error, setScripts updates lastOutput/lastExitCode/lastStatus.
3. **lineBuffered: true** in Pyodide load options (stdout buffering hardening — kept even though direct tests showed per-line callbacks either way).

## Also found earlier (already in code)
- Stale-spread bugfixes in runPythonScript/shell/batch setRun calls (spread current store entry, not captured run).
- P1 batching 75ms, P2 cap 2000 lines, P3 persist debounce 1.5s, P4 intent-aware auto-scroll, P5 window 300 lines (TerminalWindow.tsx), auto package loading (PYTHON_PACKAGE_MAP).
- JSON-escape unescaping for create_script content.

## Instrumentation to REMOVE
- `window.__app` counter in appendRunOutput (lines ~256-258) — remove the two (window as any).__app lines.

## REMAINING STEPS
1. Remove __app instrumentation lines.
2. Typecheck + build.
3. Restart preview, full cache bust (unregister SW + caches.delete + reload ?v=14).
4. Retest iso1000: verify lastOutputLen > 0 too (terminal sync fix).
5. Retest pyodide-lib-test.py: inject fresh content from http://localhost:4500/pyodide-lib-test.py into localStorage (script name 'pyodide-lib-test.py'), click Run, poll up to 3 min for "ALL STAGES PASSED". (numpy+micropip download ~30-90s)
6. Clean up: delete iso1000.py from localStorage scripts.
7. Commit & push: cd ~/enosxai && git add -A && git commit -m "..." && git push origin main
8. Note: Vercel auto-deploy may still be rate-limited (~24h from 15:40 2026-08-16); tell user to redeploy manually at vercel.com if not deployed.
9. Write docx: pandoc /home/ubuntu/enosxai/summary_split_screen_auto_coding.md -o /home/ubuntu/enosxai/ENOSX_AI_Workspace_Summary.docx (summary doc already written earlier) — OR write fresh verification report with the output-capture bug fix. Deliver docx + test script + perf report.

## Test results so far (for report)
- iso1000.py 1000-line stress test: PASS (1000/1000 lines, windowed 300, auto-scroll).
- hello.py: PASS (3 lines).
- greet2.bat / setup.bat (batch sim): PASS exit 0.
- pyodide lib test: needs retest with fixes (earlier attempts failed due to output-capture bug + missing loadPackage auto-loading; both now fixed).

## Key facts
- Repo ~/enosxai, preview :4500, proxy :8080. Test script served at /pyodide-lib-test.py from dist/public (copy from ~/enosxai/test_scripts/pyodide_lib_test.py).
- Cache bust recipe: navigator.serviceWorker.getRegistrations().then(r=>unregister) + caches.keys().then(delete) + location.href with new ?v= param.
- Run script in UI: [...document.querySelectorAll('button[aria-label^="Run"]')].find(x=>x.getAttribute('aria-label')==='Run X.py').click()
- Lib test inject recipe: localStorage 'enosx-workspace-scripts-v1' JSON array; fetch('http://localhost:4500/pyodide-lib-test.py') → t.content; then location.reload().
