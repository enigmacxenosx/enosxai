# State 27 (17:26) — THE REAL BUG FOUND

flush2: pendingLen=1. My design flaw: each append snapshots `store.runs.get(runId)` — but the store never contains the unflushed pending lines! So each new append's `output:[...tail, text]` starts from an EMPTY tail (nothing flushed yet) and only the current text. pending.set REPLACES — so pending always holds just the LAST append's line. The flush merges 1 line. Then next run/appends after flush see store with 1 line → pending builds on that → next flush merges 1 new line. Net effect: only the last line before each flush survives. For fast runs (<75ms): only the VERY LAST print survives. For slow runs: lines in 75ms bursts, one per burst — losing everything else.

THE FIX — accumulate against the previous pending entry instead of store when present:

```ts
function appendRunOutput(runId: string, text: string, isErr = false) {
  (window as any).__app = (window as any).__app || { n: 0 };
  (window as any).__app.n += 1;
  const prior = pendingOutputs.get(runId) ?? store.runs.get(runId);
  if (!prior) return;
  const existing = prior.run ?? prior;  // but store entries aren't {run:ScriptRun}...
```

Cleaner: keep pending entry's run as the accumulator:
```ts
const priorRun = pendingOutputs.get(runId)?.run ?? store.runs.get(runId);
if (!priorRun) return;
const tail = priorRun.output.length > MAX_OUTPUT_LINES ? priorRun.output.slice(priorRun.output.length - MAX_OUTPUT_LINES) : priorRun.output;
const updated: ScriptRun = { ...priorRun, output: [...tail, text], exitCode: isErr ? (priorRun.exitCode ?? 0) || 1 : priorRun.exitCode };
pendingOutputs.set(runId, { run: updated, err: isErr });
```

This is the correct fix. Then the flush merge can stay (base = store or run, merge with slice — still fine since pending accumulates correctly now).
