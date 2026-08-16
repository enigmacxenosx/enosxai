# Lib test run state 1 (16:52:29)

Ran pyodide-lib-test.py via the Run button. Result: script card shows status **Error** immediately after starting (status label "Error" visible in script list; output panel shows only the source code, no run output lines yet — the output div appears to show the SCRIPT CONTENT not run output, because output is empty and code preview shows).

Need to wait and check: the run may still be loading Pyodide (lazy load via CDN jsdelivr script tag). The "Error" badge may be stale from an earlier failed run attempt, OR a real run failure.

Next: check run state via localStorage (enosx-workspace-runs? runs stored in runtime module only, NOT persisted — runs are module-level Map, not in localStorage). Actually runs are only in-memory. Check run output via localStorage won't help. Instead wait a few seconds then re-query the page's run state from the DOM badge and output div content.

Hypothesis: `asyncio.run(main())` at module level — runPythonAsync handles top-level async; but Pyodide 0.26.4 runPythonAsync with top-level async is fine. However `runPythonAsync` with `await` inside top-level... it's fine.
Possible failure: micropip install needs network — but that's later stage; error appeared immediately, so more likely the `_asyncio.run(main())` line? No — Pyodide supports top-level await. Actually runPythonAsync: if code contains top-level await it resolves with the awaited value. `asyncio.run(main())` is sync — works.
More likely: the script was run while Pyodide was still loading from CDN (runPythonScript awaits loadPyodide; errors during load get caught and reported). If jsdelivr blocked in sandbox, load fails → error.
