# State 14 (17:17)

Console log from flushPendingOutputs not appearing in browser_console_view output (possibly filtered/async). Alternative debug channel: replace console.log with (window as any).__flushLog pushes to array. Then read window.__flushLog after run.

Current task: diagnose why only last line persists. Steps:
1. Edit useScriptRuntime.ts flush: replace console.log with (window as any).__flushLog.push(...) (init array if undefined).
2. Rebuild vite build; restart preview (kill old, npx vite preview --port 4500).
3. Browser: unregister SW, reload http://localhost:4500/?v=5, run iso1000.py, wait 10s, read window.__flushLog.
4. Interpret: if flush fires once with pendingLines=1000, baseLines=0 → merge gives 1000 lines, should persist. Then bug must be elsewhere (setRun in flush works? maybe store.runs entry is the SAME object ref as pending run? NO — merged is new object).
   If flush never fires → timer never runs? Impossible.
   If flush fires many times with growing pendingLines → merge works, look at RENDER/windowing.
5. Also verify: output div children count for iso1000 after run.
6. Then remove debug, final typecheck/build/commit/push.
7. Deliverables pending: Word doc summary (pandoc: `pandoc summary.md -o summary.docx`), attachments: docx + test script + performance report md.

Key info:
- repo ~/enosxai (enigmacxenosx/enosxai main), preview :4500, proxy :8080 running.
- Test script served at http://localhost:4500/pyodide-lib-test.py (copied from ~/enosxai/test_scripts/pyodide_lib_test.py).
- Lib test run on 17:14: exit 0, lastOutput showed only partial (before batching bug was found); isolation (iso1000) showed only last line persisted.
- All features implemented: bugfix stale-spread, P1 batching 75ms, P2 cap 2000, P3 persist debounce 1.5s, P4 intent-aware scroll, P5 window 300, auto package loading (PYTHON_PACKAGE_MAP).
- Earlier successful run (17:00 before batching): hello.py output visible after bugfix (pre-batching code? no — that run was AFTER batching... hello.py printed 3 lines, all visible. Why does iso1000 fail?
  WAIT — hello.py test at 16:59-17:00 PASSED with 3 lines visible. Batching bug would affect it too... unless timing: hello.py finishes fast; flush fires 75ms after run done? pending still has 3 lines; flush merges → store updated → DOM re-render... it DID show 3 lines at 16:59:52. So batching WORKED for hello.py?!
  Hmm but iso1000 and lib test lose lines. Difference: 3 lines vs 1000. 
  OH!!! setRun(merged) in flush: merged.status keeps base or pending. Fine.
  BUT — wait, maybe React batching: many setRun calls in flush (only 1 per runId, fine).
  MAYBE THE BUG: pendingOutputs.set(runId, ...) — each append REPLACES with run built from CURRENT store entry. After flush, store updated. Append continues. BUT: what if appendRunOutput is called BEFORE store reflects flush because of React deferred state? No — store is module-level, synchronous.
  MAYBE: Pyodide stdout called 1000 times synchronously during runPythonAsync; each appends to pending (output grows to 1000). All within the same JS task. Then setTimeout(flush, 75) registered once. runPythonAsync resolves; final setRun(done) and setScripts(lastOutput) run SYNCHRONOUSLY — store entry = done, output=[] STILL (nothing flushed). Then microtask queue... then 75ms → flush: pending run.output = 1000 lines. base = done entry, base.output.length=0. merged = 1000 lines, status = done (base.status==='done'). setRun(merged). notifyStore → listeners re-render.
  So store.runs has 1000 lines. TerminalWindow renders r.output.slice(-300)=300 lines.
  BUT observed: 1 line. CONTRADICTION stands.
  UNLESS... the `existing` in appendRunOutput: after the FIRST flush? No single flush for 1000 lines if appends all land before 75ms — one flush.
  Hmm wait: runPythonAsync is async; prints are sync inside it. runPythonAsync resolves AFTER all prints. 75ms timer fires ~75ms after FIRST print — prints take microseconds, so timer fires ~75ms AFTER the run already finished and final setRun happened. ONE flush with 1000 lines. merged 1000 lines, done. ✓→ should render.
  I MUST use window.__flushLog to see the truth. Maybe store.runs.get(run.scriptId) is undefined at flush (script deleted?) — merged base=run (pending) → merged=1000 lines anyway. Still fine.
