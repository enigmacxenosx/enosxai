# State 6 (17:03)

Run finishes fast (~20s) with output containing ONLY: "Note: micropip needs network access to cdn.jsdelivr.net." + exit 0.
That line does NOT appear in any print() in the script. Suspicious.
Note: the stored script content may have changed (localStorage injection earlier updated content; but the app reads content at run time from store.scripts — localStorage hydrates on page load; page was reloaded at 16:59 → content should be final version).

Wait — "Note: micropip needs network access to cdn.jsdelivr.net." — where does this come from? It appears in the SCRIPT COMMENT near stage3: the comment lines include `#   * Only network access is needed; packages are fetched from cdn.jsdelivr.net.` — NOT a match. And `Note:` exact prefix appears in the module docstring at top? Top docstring: "# libraries via micropip (the pure-Python/wasm pip port that works in Pyodide)." — no.

AH — the line is literally a comment line that Pyodide echoed?? No, comments aren't printed.

Check what micropip prints: when micropip.install fails (network error), it raises an exception — caught, prints FAILED:... no Note line.

Wait wait — look at the app's appendRunOutput: stdout callback gets text + "\n". Each output element in div is one array entry. 2 children: the "Note..." line and the footer. So exactly 1 output line was appended.

What if the run used an OLD script version? The old version's first run (pre-fix) failed with Error immediately — its output empty. Not this.

THE LINE MATCHES: the script header comment near the top: "# Paste this into the Script Console ...". No.
Actually maybe it IS in the script: stage3 comment: "external pure-Python packages download and\nimport correctly from the CDN at runtime." No.
Search: "Note: micropip needs network access to cdn.jsdelivr.net." — only in my analysis notes, not the script.

Hmm. Could Pyodide's runPythonAsync print the echoed first comment? No.

Possibility: runPythonAsync output captured via pyRunIdRef.current — if pyRunIdRef pointed to a DIFFERENT script id, appends go to another run... but the run we see IS this script's run (footer exit 0, done). setRun happens on script.id. Output lines go to pyRunIdRef.current = script.id set at runPythonScript start. Correct.

Unless: the run finished before any real appends because the SCRIPT CONTENT ran is the OLD failing version?? The old version ended with `asyncio.run(main())` inside an IIFE async wrapper... that threw RuntimeError asyncio.run cannot be called from running event loop → run finished with... wait, the old version DID produce Stage 1 output in my earlier direct-console test (8 lines then error). So old content would produce 8 lines + traceback → error status. Not matching (we have exit 0).

Mystery. Direct test: load Pyodide in console, run the exact stored script content, see what prints. That will tell us what the script actually does in Pyodide right now.
