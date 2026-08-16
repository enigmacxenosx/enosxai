# State 4 (16:57) — CRITICAL BUG FOUND

Even hello.py (which worked before per earlier session) now shows exit 0 but EMPTY output. So stdout capture is broken across ALL python runs in the current build.

This bug was likely introduced in the earlier session's edits OR it existed before (earlier tests passed output... actually earlier session verified fibonacci output appeared in terminal — but maybe that was on the OLD build before latest commits? The latest verified output was greet2.bat (batch) — never re-verified python after the unescape commit).

Look at runPythonScript again (lines 141-163 of useScriptRuntime.ts):
- pyRunIdRef.current = script.id;  (line 143)
- await loadPyodide();  (line 145) — uses cached promise if present
- stdout callback: (text) => appendRunOutput(pyRunIdRef.current, text + "\n") — reads ref at call time. Should be correct.

WAIT. appendRunOutput(runId, text): existing = store.runs.get(runId). At this point store.runs should contain the run (setRun was called with status running at line 142 BEFORE loadPyodide). Fine.

Hmm — but what if the run FINISHES and setRun final state was saved, and THEN the stdout callback fires? Python print calls happen during runPythonAsync; after await resolves, no more prints. Fine.

THE REAL ISSUE MAYBE: stdout callback from the CACHED pyodide instance — the cached promise was created on page load; its resolve used the loadScript then Pyodide({...}) with the stdout closure. That closure reads pyRunIdRef.current at call time — correct.

UNLESS... the script content run earlier was the FIRST run ever (previous failures), and... no.

TEST: check whether output went to the WRONG run by running hello.py and dumping ALL runs via localStorage? runs aren't persisted. Dump via DOM of ALL script cards' output divs.

Alternative theory: maybe the TerminalWindow output div I'm reading IS correct (empty output), because appendRunOutput is never called — maybe pyodide's stdout isn't firing because Pyodide({stdout}) was called BEFORE pyRunIdRef.current was set, and the closure... no, closure reads ref at call time.

OH WAIT — I just realized: `setRun` creates a new Map AND a new run object, but `appendRunOutput` does:
  const existing = store.runs.get(runId);
  if (!existing) return;
  setRun({ ...existing, output: [...existing.output, text], ... });
That's fine.

BUT: in runPythonScript, after runPythonAsync resolves:
  setRun({ ...run, status: "done", exitCode: 0 });
where `run` is the ORIGINAL captured run object ({output: []}). If stdout appends happened to store.runs.get(id) creating newer objects, THIS setRun overwrites them with the stale `run` object (output: [])!!
YES! `run` was captured at line 444 (runScript): const run = {...output:[]}. Every setRun({...run, status:'running'}) at line 142 overwrites with stale output too! So all output appends are lost when setRun({...run,...}) is called — because `...run` spreads the stale captured object which lacks the appended output.

That's the bug: runPythonScript always spreads the original `run` (output: []) instead of the current store entry.

FIX in useScriptRuntime.ts runPythonScript: replace `setRun({ ...run, status: "running" })` with `setRun({ ...(store.runs.get(script.id) ?? run), status: "running" })` and same for done/error branches: `...(store.runs.get(script.id) ?? run)`.

This will also be FIXED by the P1 batching optimization (pending map approach), but we should fix it now regardless.
