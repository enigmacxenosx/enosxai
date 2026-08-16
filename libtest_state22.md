# State 22 — patch live, don't reload

Patch window.loadPyodide in current page (module's pyodidePromise was already created? if first run happened, promise cached with original loadPyodide). To bypass: also reset the module's cache — can't reach module scope. BUT: I can replace loadPyodide's result: my wrapper calls orig → fresh pyodide instance returned → module's cached promise still points to old instance! So if pyodidePromise already resolved with old instance (no lineBuffered), all runs use it.

KEY QUESTION: did the old instance get created WITHOUT lineBuffered? On fresh page (17:22 reload), first run → loadPyodide → instance with lineBuffered:true (fresh build). So cached instance HAS lineBuffered:true. My direct test showed LB:true → 20 callbacks. STILL 20 callbacks.

So callbacks fire. Output lost somewhere in app pipeline. The only app-specific code between callback and render: appendRunOutput → pendingOutputs → flush → setRun → notifyStore → TerminalWindow renders output.slice(-300).

TEST: in the app page, call (window as any).__testAppend? Not exposed. Call the app's own code path: invoke a fresh Python run with a simple print via console, routing through... no direct handle.

ALTERNATIVE: check the React component tree — maybe TerminalWindow renders a DIFFERENT state. The runs map is shared module state. Render reads store.runs via getScriptRuns(). TerminalWindow's output section: r.output.map((line,i)=>...). If store.runs has 1000 entries, div has 300 children. It has 1 child → store.runs has 1 entry for this run.

SO: flush DID merge only 1 line. appendRunOutput called once. pyodide stdout callback fired once. Contradiction with direct test?? UNLESS the app's runPythonAsync ran in a SUBPROCESS/worker-like context with different stdout handling... no.

WAIT. CRITICAL REALIZATION: my direct test used `runPythonAsync(code)` with code = `'for i in range(20):\n    print("a", i)'` (double-quoted in JS, single line with \n). The app runs the same shape. My direct test got 20 callbacks with lineBuffered:FALSE. The app instance has lineBuffered:TRUE. Maybe in Pyodide 0.26, lineBuffered:true + custom stdout callback = callback fired ONCE with full buffer flushed at end?? My direct test with LB:true also got 20 ("withLB":20). Hmm.

Oh wait — withLB:20 means with lineBuffered true I also got 20. So both 20.

I'M GOING IN CIRCLES. Let me instrument FOR REAL using an override of `window.__pyodideSpy`: monkey-patch loadPyodide NOW (no reload), then force module's cached promise to re-resolve? Module caches pyodidePromise — can't reset. But the module's promise resolved with an instance; new instances from patched orig won't be used by the module.

CLEAN TEST: inject a script whose content, when run via runPythonAsync in console WITH THE APP'S OPTIONS, reproduces the single callback. Copy the app's exact options: lineBuffered:true + stdout appending to a window array. If THAT also gives 1 callback in console, we found the Pyodide behavior. If 1000 callbacks, the module code differs from my mental model (e.g., the module uses setStdout batching after load?).
