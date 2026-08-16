# State 9 (17:14)

Run exit 0. Output div children (windowed P5, CHUNK=300 — but output < 300 lines, so windowing NOT the cause of missing lines): only 3 elements:
1. "===..." (footer separator? part of stage4 yaml output?)
2. "is fully operational."
3. "$ ✓ exited with code 0"

P5 windowing only cuts when output > 300 lines. This output has ~30 lines → all should render. So only 2 text lines rendered total. Where did stages 1-3 output go?

Hypothesis: my merge in flushPendingOutputs — run.output.slice(base.output.length):
- Flush1: base = store.get(id) (queued, output []); pending run.output = [...tail(0), text1..N] → merged = base.output(0) + run.output.slice(0) = all. Good.
- Flush2+ ... same logic, base now has flushed output. run.output.slice(base.output.length) = NEW lines only. Good.
- BUT wait: the error run (bootstrap version) earlier: run finished → store.setRun error. Then the NEW run: runScript → setRun(new run obj, output []). pending may contain entries from... no, flush clears on each run.
- The real issue might be earlier: when run errored (exited 1), runScript's finally-ish setRun error... then NEW run started: setRun(new queued) — fine.

Actually look at output: "===================... " + "is fully operational." These are lines from stage4 yaml dump end + final print. So middle output is GONE.

WAIT — max-h-40 + overflow-auto div with P5 windowing... I used `r.output.slice(-CHUNK)` and rendered a "… older lines omitted" line when skipped>0. If skipped>0 that line appears. I see "===…" as first element — that's the SEPARATOR line plus possibly "… N older lines omitted …"! "===" could be the omitted-message line (my string is "… N older lines omitted …"). Hmm no, "===" is different.

Actually my window shows: skipped > 0 → renders `… N older lines omitted …`. I see "===... " — that starts with "=" not "…". Hmm.

BUT: if output.length > 300 → P2 cap is 2000. Could there really be > 300 output lines?? Micropip install prints verbose progress! `micropip.install("pyyaml")` prints package download progress lines (Installing..., downloading..., each ~1 line; numpy wheel 14MB download prints byte progress). micropip CAN print dozens of lines. Plus `js.pyodide...`? No.

Actually micropip.print is used in micropip 0.6 — it may emit progress prints. numpy loadPackage in JS doesn't print. Hmm — maybe ~30-50 lines, not 300.

WAIT — the div shows "===…" — my code renders `{skipped > 0 && <div>… {skipped.toLocaleString()} older lines omitted …</div>}` — the string contains both "…" chars: "… 34 older lines omitted …". The first char "…" is a single ellipsis glyph; the extracted text may render as "…" (U+2026). But the console showed "===... " — hmm.

Actually look more carefully: element text is "=====================... " wait the extraction shows "\"========================================================\\n\"". That's 56 "=" characters — EXACTLY a banner line from stage4 yaml output (`print("="*56)` banner at stage4 start)! No — stage4 doesn't have a banner; main does: banner("...") called for stages 2-4. YAML dump output is lines like "mean: ...". Hmm.

Let me just check localStorage script's lastOutput — that's the ground truth of what the run produced. Also re-read the div with full children text including the omitted line.
