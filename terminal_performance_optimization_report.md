# Terminal Streaming & Auto-Focus Performance Optimization Report

**Scope:** ENOSX AI web workspace (`enosxai`), Script Console (`TerminalWindow.tsx`) and script runtime (`useScriptRuntime.ts`)
**Date:** August 16, 2026

## 1. How the Current Implementation Works

The Script Console streams Python output from a single shared Pyodide instance. Every `print()` call triggers `setRun()` in the runtime, which clones the entire `runs` map and notifies all listeners; the Terminal window subscribes to those notifications and re-renders the whole script list on every single line of output. Auto-scroll is handled by a `useEffect` watching `[scripts, runs, selectedId]` that calls `scrollTo({ top: 999999, behavior: "smooth" })` on the selected script's output element whenever anything changes.

## 2. Performance Bottlenecks Identified

| # | Bottleneck | Location | Impact at Scale |
|---|---|---|---|
| 1 | **Full-map clone + notify on every output chunk** | `setRun()` / `appendRunOutput()` | Every print line clones the entire runs map and triggers a full-listener notification. A 50,000-line data dump = 50,000 React re-renders of the entire window |
| 2 | **Whole script list re-renders on every line** | `useEffect(() => onScriptStoreChange(forceRender))` | `TerminalWindow` re-renders all N script cards, language badges, buttons, and code previews per output line |
| 3 | **Output array re-allocated per line** | `output: [...existing.output, text]` | For 50k lines the output array copy grows to several MB and is garbage collected each frame |
| 4 | **Smooth-scroll effect on every store change** | `useEffect` with `behavior: "smooth"` | Smooth scrolling animates over hundreds of ms; new lines arriving mid-animation cause scroll jitter and visible lag |
| 5 | **localStorage save on every store tick** | `notifyStore()` → `saveScripts()` | Each tick JSON-serializes all scripts + full run output histories and writes to localStorage — a 5 MB serialization per chunk blocks the main thread |
| 6 | **No output cap** | `ScriptRun.output: string[]` | Output grows without limit; old completed runs keep full output in memory and storage |
| 7 | **`output.map()` keying per render** | `TerminalWindow` JSX | Keying every `<div>` by index forces React to diff thousands of DOM nodes per line |

## 3. Recommended Optimizations (in priority order)

### P1 — Batch output updates (throttled streaming)

Instead of notifying per print call, accumulate output chunks and flush on a 50–100 ms timer. Users still perceive "live" streaming (10–20 flushes per second) while cutting re-render volume by two orders of magnitude:

```ts
// In useScriptRuntime.ts
let flushTimer: ReturnType<typeof setTimeout> | null = null;
function appendRunOutput(runId: string, text: string, isErr = false) {
  const existing = store.runs.get(runId);
  if (!existing) return;
  const updated = {
    ...existing,
    output: [...existing.output, text],
    exitCode: isErr ? (existing.exitCode ?? 0) || 1 : existing.exitCode,
  } as ScriptRun;
  pending.set(runId, updated);
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      pending.forEach((run) => setRun(run)); // one re-render per batch
      pending.clear();
    }, 75);
  }
}
```

### P2 — Cap output history and persist only the tail

```ts
const MAX_OUTPUT_LINES = 2_000; // per run
output: [...existing.output.slice(-MAX_OUTPUT_LINES), text]
```

### P3 — Debounce localStorage persistence

Write to localStorage at most every 1–2 seconds and only for finished runs, not mid-stream:

```ts
let persistTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePersist() {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    saveScripts(store.scripts);
  }, 1500);
}
```

### P4 — Replace smooth-scroll with instant + user-intent-aware scrolling

```ts
const autoScroll = (el: HTMLDivElement) => {
  // Only auto-scroll when the user hasn't manually scrolled up
  const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
  if (atBottom) el.scrollTo({ top: el.scrollHeight }); // instant, no animation
};
```

The current 999999 trick forces maximum scroll distance every time and, combined with `behavior: "smooth"`, queues competing animations on every line — this is the single most visible source of terminal "jank."

### P5 — Virtualize large outputs (optional, for codebase-scale runs)

For very large outputs (tens of thousands of lines), replace `output.map(...)` with a windowed slice:

```tsx
const CHUNK = 300; // render only the tail visible to the user
const visible = r.output.slice(-CHUNK);
```

Combined with P1–P4 this keeps per-frame DOM work bounded regardless of total output size.

## 4. Expected Gains

| Metric | Before | After (P1–P5) |
|---|---|---|
| Re-renders for a 10,000-line script | ~10,000 full-list re-renders | ~100 batched re-renders |
| Main-thread serialization per chunk | Full store JSON each print | Debounced, ~1 per 1.5 s |
| Scroll jank on fast output | High (competing smooth animations) | None (instant, intent-aware) |
| Memory for long runs | Unbounded | Capped at 2k lines/run |

## 5. How to Apply

These are code changes I can implement directly in `useScriptRuntime.ts` and `TerminalWindow.tsx` — they are drop-in improvements that do not change the public API (`createScript`, `runScript`, `deleteScript`, or the window brokers) and will keep working with the existing split-screen and auto-live-coding pipeline. Say the word and I will implement, test, and push them.
