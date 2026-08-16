# State 11 (17:15) — CONFIRMED batching output loss

Iso test: 1000 lines printed, run success exit 0, stored output 0 lines.

Root cause analysis:
- stdout appends → pendingOutputs map, flushed every 75ms.
- Run finishes (runPythonAsync resolves) → runPythonScript's final setRun({...store, status:'done', exitCode:0}) and setScripts (lastOutput = store.runs.get(id)?.output.join("")) execute IMMEDIATELY after the await, BEFORE the 75ms flush fires.
- So the final setScripts copies output = [] (nothing flushed yet).
- Then flush fires: merges pending onto store.runs entry — output lines DO get into the runs map AFTER the run is done.
- BUT: TerminalWindow renders from store.runs (forceRender on tick) — does it re-render after flush? YES — setRun → notifyStore → tick → forceRender.
- So the div SHOULD show the lines... unless the flush merge itself fails.

Check flush merge: merged.output = base.output + run.output.slice(base.output.length). base = store.runs.get(scriptId) — at flush time this is the DONE entry (output=[]). run = pending updated built on store at append time (queued/running, output=[]), then each append: updated.output=[...tail,text] where tail from store at THAT time. BUT between flushes, if multiple appends: each append builds on store state AT APPEND TIME. After flush1, store = merged (with lines). Append3 reads store → tail includes lines → pending run.output = [lines + new]. Flush2: base = store (lines), run.output.slice(lines.length) = new only. merged = lines + new. ✓ correct.

UNLESS flush happens only once before run completes? All appends during runPythonAsync are queued microtasks/sync; flush fires 75ms after first append. If runPythonAsync resolves before flush (fast script, 1000 prints are sync, resolves before 75ms?) — prints are synchronous (print flushes immediately; stdout callback fires right away). 1000 sync prints all happen within microseconds, appending to pending. runPythonAsync resolves. Final setRun/setScripts run immediately (output=[]). Then 75ms later flush fires: merged = [] + 1000 lines = 1000 lines. setRun installs. notifyStore. TerminalWindow re-renders → should show 1000 lines (windowed to 300).
And setScripts already ran with lastOutput="" — fine for lastOutput (shows last run's output AT DONE time) — that's a minor accuracy issue but output lines SHOULD appear in the div.

But the div ALSO showed only 2 lines for the lib test. So something else in the flush. Let me actually read the run's output from the runs map directly in console after flush — check if store.runs (reconstructed via module?) is accessible... The runtime module exports onScriptStoreChange etc. but runs map not directly exposed. Instead: check DOM output div children count after another 5s wait.
