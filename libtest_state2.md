# Lib test diagnosis (16:54)

Two confirmed issues:
1. `asyncio.run()` raises RuntimeError: cannot be called from a running event loop — because runPythonAsync executes code inside Pyodide's own event loop. FIX: use top-level `await main()` (Pyodide supports top-level await in runPythonAsync). But then host CPython py_compile fails (await outside function) — acceptable; we verified syntax via ast.parse. Better: wrap in `if _IN_PYODIDE` check:
   ```
   import sys
   _in_pyodide = "pyodide" in sys.modules or hasattr(sys, "version") and "pyodide" in str(sys.version_info)  # unreliable
   ```
   Simpler: top-level await — works in Pyodide; keep asyncio.run commented. For host compat we can detect: `try: _loop = asyncio.get_running_loop(); ...except RuntimeError: ...`. Use:
   ```
   try:
       _running = asyncio.get_running_loop()
       await main()          # Pyodide: already in a loop
   except RuntimeError:
       asyncio.run(main())   # host CPython
   ```
   But top-level await needs to be wrapped in an async function to be valid host syntax... Actually top-level await is valid Python 3.8+ syntax everywhere; py_compile rejected it only because await is at module level in a script compiled normally? No — module-level await IS valid syntax (py_compile only fails in older versions). Our py_compile earlier said SyntaxError — that's Python 3.11? Actually module-level await is valid since 3.8. py_compile DID error. Hmm — it errored with "'await' outside function" which means our Python version's compile rejects module-level await in scripts... That's odd; module-level await requires the module to be run as a coroutine (e.g., python -m). For script execution py_compile treats it as error.
   Decision: use the get_running_loop trick INSIDE an async main, called synchronously:
   ```
   async def main(): ...
   def _entry():
       try:
           loop = asyncio.get_running_loop()
       except RuntimeError:
           loop = None
       if loop:
           import asyncio as _a
           loop.create_task(main())
       else:
           asyncio.run(main())
   ```
   In Pyodide, create_task will run in Pyodide's loop. Pyodide's runPythonAsync waits for module execution to finish — top-level sync code returning a task won't wait! Better approach used widely: top-level await works in runPythonAsync. Use:
   ```
   async def main(): ...
   await main()
   ```
   This fails host py_compile but is valid Python; the file is only ever run in Pyodide. Acceptable tradeoff, note in comments.
2. numpy import fails: PythonError (traceback cut). In Pyodide v0.26.4 "full" distribution numpy IS included. The failure may be transient/cut off. Need to retest numpy import with full traceback. Also note: Pyodide needs numpy loaded via `pyodide.loadPackage('numpy')` in some versions even in full. Actually the full package should include it automatically. Test again and read full traceback.

Also IMPORTANT for the app's runPythonScript: the app catches errors and shows traceback — the terminal output showed "Output will appear here" + exit code 1 — the stderr append happens via the shared pyRunIdRef; output routing fine.

CONFIRMED: numpy NOT installed by default even from the "full" pyodide.js bundle in this page. The full JS bundle includes the packages, but loadPyodide() default does not auto-load all; they must be explicitly loaded via pyodide.loadPackage() or micropip.install().

FIX FOR TEST SCRIPT: add at start of stage2 (or before):
```
import micropip
await micropip.install(["numpy", "pyyaml"])
```
Or in JS, before run: await pyodide.loadPackage("numpy"). For the app, a small improvement would be to auto-load packages when import lines are detected — out of scope unless user asks.

Plan: update pyodide_lib_test.py to install numpy+pyyaml via micropip at the start, keep asyncio.run wrapper using the get_running_loop trick:
```
try:
    _loop = asyncio.get_running_loop()
except RuntimeError:
    _loop = None
if _loop is not None:
    import asyncio as __asyncio
    __asyncio.ensure_future(main())
else:
    import asyncio as __asyncio
    __asyncio.run(main())
```
Hmm — ensure_future creates task but runPythonAsync finishes sync portion without waiting. Actually with top-level code in runPythonAsync, Pyodide waits for the awaited top-level await only. ensure_future won't be awaited → script returns before main runs → output incomplete.
Simplest robust approach: top-level `await main()` — valid Python 3.8+, works in Pyodide and also in Pyodide's own REPL. For host testing we use ast/compile check instead of running. We already verified syntax with py_compile failure → use `python -c "import ast; ast.parse(open(...).read())"` only (syntax is valid; py_compile's "await outside function" is because scripts can't have module-level await in CPython execution — actually CPython CAN execute module-level await since 3.8 when run with -m... no, CPython module execution does not support module-level await. `python script.py` with module-level await raises SyntaxError? It raises RuntimeError 'no running event loop'? Earlier py_compile gave SyntaxError.
Final: keep top-level await main(); note file must run in Pyodide. Replace `_asyncio.run(main())` with `await main()` (remove the asyncio import wrapper). Then re-inject into localStorage and re-run.
