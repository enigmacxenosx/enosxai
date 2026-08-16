# State 7 (17:03) — micropip ModuleNotFoundError

Console direct test confirms: `No module named 'micropip'`. The "full" pyodide.js bundle does NOT include micropip. micropip must be loaded via `pyodide.loadPackage('micropip')` (or installed).

FIX: modify test script to first call micropip bootstrap. In Pyodide 0.26, micropip can be loaded with:
  import micropip  # fails
instead use JS-side: pyodide.loadPackage('micropip') then import micropip.

In Python there's no direct API; the common pattern: use js module:
  from js import pyodide  # pyodide not exposed to python by default
Actually in Pyodide, `js.pyodide` IS available (auto-imported). Try:
  import js
  js.pyodide.loadPackageFromURL  # ?
Simpler robust pattern: at top of script:
  try:
      import micropip
  except ModuleNotFoundError:
      from pyodide.ffi import to_js  # no...
Best practice per Pyodide docs: micropip is in the "default" packages set only for certain builds. In v0.26.4, micropip exists in the full package list at: https://cdn.jsdelivr.net/pyodide/v0.26.4/full/micropip-0.6.0-py3-none-any.whl — loadable via pyodide.loadPackage('micropip').

From Python side in runPythonAsync, `js` module is available (Pyodide auto-provides it). So script can do:
  import js
  js.pyodide.loadPackage('micropip')
  import micropip

ALSO NOTE: numpy also requires loadPackage('numpy') — the direct test loaded numpy?? It errored on micropip first. numpy is in 'full' but not auto-installed per earlier test (ModuleNotFoundError numpy). Need js.pyodide.loadPackage('numpy') too.

Update test script: add bootstrap at top (after banner1 or before stage2):
  import js
  js.pyodide.loadPackage(['micropip', 'numpy'])

Keep script self-contained. Re-inject into localStorage, reload, rerun.
