# State 8 (17:06) — final approach decision

CONFIRMED:
- `js.pyodide` NOT accessible from Python (AttributeError: pyodide) — can't bootstrap from script side.
- `py.loadPackage(['micropip','numpy'])` WORKS from JS.

DECISION: implement auto package loading in the APP (useScriptRuntime.ts runPythonScript):
1. Before runPythonAsync, scan script content for `import X` lines.
2. For each import whose module is in a known package map {numpy:'numpy', pandas:'pandas', matplotlib:'matplotlib', yaml:'pyyaml', requests:'requests', scipy:'scipy', micropip:'micropip', sympy:'sympy', ...}, load via py.loadPackage(name).
3. Pyodide's loadPackage is idempotent (skips already-loaded). Await all.
4. This makes external libraries just work in the Script Console — big UX win for the auto-live-coding feature too.

Then REVERT the test script's `import js / js.pyodide.loadPackage` lines (they cause the error run), keeping micropip.install("pyyaml") for stage3 (micropip available after loadPackage('micropip')).

Steps:
1. Edit useScriptRuntime.ts: add PACKAGE_MAP + loadPackagesFor(code) before runPythonAsync.
2. Revert test script bootstrap lines.
3. Typecheck, build, restart preview, copy test script, reload browser, run test (up to 3 min), verify ALL STAGES PASSED.
4. Also verify hello.py + greet2.bat still work (regression).
5. Commit + push.
6. Write Word doc summary + deliver.

Run output verification after fix: poll window.__ltDone for 'ALL STAGES PASSED'.
