# State 18 (17:20)

Still: only 'line 999' appears. lineBuffered fix in code, built, served. Hypotheses:
1. Service worker still serving stale bundle (sw.unregister then 8s reload — but SW re-registers on load! Need to unregister AND reload in same flow, or use caches API to clear).
2. The preview server's dist has old build — unlikely (build ran just before).
3. Pyodide's loadScript: pyodide.js v0.26.4 loaded from CDN — fine, new params sent.
4. CRITICAL: pyodidePromise is module-level — persists across React renders but NOT across page reloads. Fine.
5. Maybe the SW cache contains index.html too, serving old HTML referencing old chunk. The unregister + reload should fix. But my sequence: unregister → setTimeout 8s → (still on same page) → run test. The page was NOT reloaded after unregister! The SW is unregistered but the current page (with old bundle already loaded) remains. Old app code = old loadPyodide without lineBuffered. NEED TO RELOAD after unregister.

Fix: after unregister, do location.reload() or navigate to http://localhost:4500/?v=8.
