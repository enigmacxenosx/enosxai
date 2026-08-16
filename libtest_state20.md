# State 20 (17:22)

Next action: monkey-patch window.loadPyodide to wrap stdout callbacks with a counter, reload page, run iso1000, read counter. This definitively shows how many times the app's Pyodide calls stdout.

Also verify runScript flow: maybe runScript in the app catches and re-runs? The Run button calls runScript(id). Fine.
