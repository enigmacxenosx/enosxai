# State 23 (17:23)

Console with EXACT app options (lineBuffered:true) → 1000 callbacks. Pyodide is fine. The app's cached pyodide instance was created WITHOUT lineBuffered → the app loaded an OLD build. The SW is serving stale assets. At 17:21 the page claimed to load TerminalWindow-BngMRDmN.js (the new chunk) — but maybe that was cached by the SW from the new build while the MAIN app chunk (index-xxx.js containing TerminalWindow code? no — TerminalWindow is separate chunk) ... hmm BngMRDmN.js has lineBuffered:!0 per dist. So the chunk loaded IS new. But the instance created from it should have LB:true.

WAIT — maybe the run didn't even use lineBuffered because... the module's loadPyodide call passed lineBuffered:true — dist verified. Instance created → 1000 callbacks expected.

UNLESS the app's FIRST run (hello.py style earlier page loads) created the cached promise before my patch... on fresh page with new build, first run → new instance with LB:true → 1000 callbacks. But observed 1.

THEREFORE the app's chunk that ran is NOT the new one despite BngMRDmN appearing in performance entries... maybe performance entries showed the new chunk being REQUESTED (cached by SW) but actually EXECUTED old code from memory cache?? Unlikely.

OR: the module's runPythonScript uses the app's `pyodide` from loadPyodide() — but what if there's ANOTHER loadPyodide definition or the module imported loadPyodide from somewhere? No — it's window.loadScript loading CDN pyodide.js.

ALTERNATIVE EXPLANATION: the app's run DID get 1000 callbacks but the output WAS rendered and I'm reading the WRONG element. 'line 999' + footer = 31 chars. nChildren=2. hasOmitted=false. Rendered div genuinely tiny.

DECISIVE: patch window.loadPyodide synchronously (without reload — module's pyodidePromise already resolved? On this fresh page, module's first run already happened and created an instance; promise cached). My patch won't affect cached promise. But I can test the module's instance indirectly: override pyRunIdRef? unreachable.

BEST MOVE: clear the SW cache completely + unregister + navigate fresh, and ALSO verify by console that after reload, the module's chunk hash matches dist's current hash (read dist index.html → assets list → compare with performance entries). Do this carefully.
