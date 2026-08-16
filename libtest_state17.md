# State 17 (17:20) — ROOT CAUSE FOUND

Code at lines 146-149:
  Pyodide({
    stdout: (text) => appendRunOutput(pyRunIdRef.current, text + "\n"),
    stderr: ...
  })
Missing `lineBuffered: true`!

Pyodide 0.26 defaults to FULLY BUFFERED stdout (Python's default IO buffering). Output is delivered to the JS callback only when the buffer flushes — which for a fast script happens once at interpreter teardown, with the LAST buffer contents (or all contents joined... our test showed only 'line 999' meaning the internal Pyodide buffer only retained the last chunk due to... actually Pyodide flushes everything at exit; the fact that only 'line 999' arrived is because Python print goes to line-buffered-ish internal stream and the JS hook gets called on flush... whatever the internals, the FIX is documented):

FIX: add `lineBuffered: true` to the loadPyodide options. This makes stdout fire per completed line, giving live streaming (and fixing output capture).

After fix, also retest: iso1000 should show pendingLines=1000 in flush log (then batching kicks in → multiple flushes) and div shows ~300 lines windowed.
Then lib test rerun → ALL STAGES PASSED expected.

Then: remove debug log (__flushLog lines), typecheck, build, commit, push, docx, deliver.
