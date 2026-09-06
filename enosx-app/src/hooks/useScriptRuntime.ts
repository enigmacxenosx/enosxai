/*
 * ENOSX AI — Script Runtime
 * Enables Enosx AI to create and run scripts inside the web workspace:
 * - Python (.py)   → REAL execution via Pyodide (CPython compiled to WebAssembly,
 *                    loaded on demand from the official CDN)
 * - Shell (.sh)    → sandboxed simulation (white-listed commands, echo pass-through)
 * - Batch (.bat)   → sandboxed Windows-terminal simulation (realistic cmd.exe-style output)
 *
 * This module uses a singleton shared store (like useBrowser) so the Terminal
 * window in the computer pane and the chat pane share script state and output.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export type ScriptLanguage = "python" | "shell" | "batch";

export interface ScriptFile {
  id: string;
  name: string;
  language: ScriptLanguage;
  content: string;
  createdAt: number;
  lastOutput?: string;
  lastExitCode?: number;
  lastStatus?: "success" | "error";
}

export interface ScriptRun {
  scriptId: string;
  scriptName: string;
  status: "queued" | "running" | "done" | "error";
  output: string[];
  exitCode: number | null;
}

export const DEFAULT_SCRIPTS_DIR = "C:\\Enosx\\Scripts";

const STORAGE_KEY = "enosx-workspace-scripts-v1";

function loadScripts(): ScriptFile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ScriptFile[];
  } catch {
    /* use default */
  }
  return [];
}

function saveScripts(scripts: ScriptFile[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scripts.slice(-50)));
  } catch {
    /* storage unavailable */
  }
}

// ---------------------------------------------------------------------------
// Shared singleton store (one instance per page load)
// ---------------------------------------------------------------------------

let store: { scripts: ScriptFile[]; runs: Map<string, ScriptRun>; listeners: Set<() => void>; tick: number } = {
  scripts: loadScripts(),
  runs: new Map(),
  listeners: new Set(),
  tick: 0,
};

function notifyStore() {
  store.tick += 1;
  store.listeners.forEach((fn) => fn());
  schedulePersist();
}

// ---------------------------------------------------------------------------
// P3 — Debounced localStorage persistence
// Writes to localStorage at most every ~1.5 s (never mid-stream), avoiding
// repeated multi-megabyte JSON serializations on every output chunk.
// ---------------------------------------------------------------------------
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist() {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    saveScripts(store.scripts);
  }, 1500);
}

function setScripts(updater: (scripts: ScriptFile[]) => ScriptFile[]) {
  store.scripts = [...updater(store.scripts)];
  notifyStore();
}

function setRun(run: ScriptRun) {
  // Store a fresh object each time so consumers observing `runs` (including
  // `scripts` via the same notification) re-render on every output line.
  store.runs = new Map(store.runs);
  store.runs.set(run.scriptId, { ...run });
  notifyStore();
}

export function onScriptStoreChange(listener: () => void) {
  store.listeners.add(listener);
  return () => store.listeners.delete(listener);
}

export function getScriptRuns(): Map<string, ScriptRun> {
  return store.runs;
}

// ---------------------------------------------------------------------------
// Python execution via Pyodide (real CPython in WebAssembly)
// ---------------------------------------------------------------------------

type PyodideLike = {
  runPythonAsync(code: string): Promise<unknown>;
  setStdout?(opts: { batched?: (s: string) => void }): void;
  setStderr?(opts: { batched?: (s: string) => void }): void;
};

let pyodidePromise: Promise<PyodideLike> | null = null;

// Holds the script id of the run that is currently executing, so the shared
// pyodide instance routes stdout/stderr to the right run.
const pyRunIdRef = { current: "__py__" };

function loadPyodide(): Promise<PyodideLike> {
  if (pyodidePromise) return pyodidePromise;
  pyodidePromise = new Promise<PyodideLike>((resolve, reject) => {
    const win = window as any;
    const loadScript = (src: string) =>
      new Promise<void>((res, rej) => {
        const s = document.createElement("script");
        s.src = src;
        s.async = true;
        s.onload = () => res();
        s.onerror = () => rej(new Error(`Failed to load ${src}`));
        document.head.appendChild(s);
      });
    loadScript("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js")
      .then(() => {
        const Pyodide = win.loadPyodide as (opts?: any) => Promise<any>;
        if (!Pyodide) throw new Error("Pyodide global not found");
        // stdout/stderr are attached with the currently running script id at
        // call time, so each run captures its own output.
        // lineBuffered: true — without it Pyodide buffers stdout and only the
        // final chunk (or nothing) reaches the callback, so most output was
        // silently lost for every run.
        return Pyodide({
          stdout: (text: string) => appendRunOutput(pyRunIdRef.current, text + "\n"),
          stderr: (text: string) => appendRunOutput(pyRunIdRef.current, text + "\n", true),
          lineBuffered: true,
        });
      })
      .then(resolve, reject);
  });
  return pyodidePromise;
}

// ---------------------------------------------------------------------------
// Auto-loading of external packages
// The "full" Pyodide distribution ships many packages (numpy, pandas, …) but
// does NOT install them automatically. Before running a script we scan its
// imports and load any recognised packages via Pyodide's loadPackage
// (idempotent — already-loaded packages are skipped). micropip itself must be
// loaded explicitly before `import micropip` works.
// ---------------------------------------------------------------------------

const PYTHON_PACKAGE_MAP: Record<string, string> = {
  numpy: "numpy",
  pandas: "pandas",
  scipy: "scipy",
  matplotlib: "matplotlib",
  "matplotlib.pyplot": "matplotlib",
  yaml: "pyyaml",
  requests: "requests",
  beautifulsoup4: "beautifulsoup4",
  bs4: "beautifulsoup4",
  sympy: "sympy",
  micropip: "micropip",
};

function loadPackagesFor(code: string, pyodide: PyodideLike): Promise<unknown> {
  const names = new Set<string>();
  for (const line of code.split("\n")) {
    const m = /^\s*(?:import|from)\s+([A-Za-z0-9_.]+)/.exec(line);
    if (!m) continue;
    const mod = m[1];
    if (PYTHON_PACKAGE_MAP[mod]) names.add(PYTHON_PACKAGE_MAP[mod]);
  }
  if (names.size === 0) return Promise.resolve();
  const load = (pyodide as any).loadPackage;
  if (typeof load !== "function") return Promise.resolve();
  return Promise.resolve(load.call(pyodide, [...names]));
}

async function runPythonScript(script: ScriptFile, run: ScriptRun): Promise<void> {
  setRun({ ...(store.runs.get(script.id) ?? run), status: "running" });
  pyRunIdRef.current = script.id;
  try {
    const pyodide = await loadPyodide();
    await loadPackagesFor(script.content, pyodide);
    await pyodide.runPythonAsync(script.content);
    setRun({ ...(store.runs.get(script.id) ?? run), status: "done", exitCode: 0 });
    setScripts((scripts) =>
      scripts.map((s) =>
        s.id === script.id ? { ...s, lastOutput: store.runs.get(script.id)?.output.join("") ?? "", lastExitCode: 0, lastStatus: "success" } : s
      )
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    appendRunOutput("__py__", `Traceback (most recent call last):\n${message}\n`, true);
    setRun({ ...(store.runs.get(script.id) ?? run), status: "error", exitCode: 1 });
    setScripts((scripts) =>
      scripts.map((s) =>
        s.id === script.id ? { ...s, lastOutput: store.runs.get(script.id)?.output.join("") ?? "", lastExitCode: 1, lastStatus: "error" } : s
      )
    );
  }
}

// Active python run id tracker for stdout routing
let activePyRunId: string | null = null;

// ---------------------------------------------------------------------------
// P1 — Batched output updates (throttled streaming)
// Accumulates output chunks and flushes at most every 75 ms, cutting
// re-render volume by two orders of magnitude while keeping output visibly
// "live" (~10–13 flushes per second).
// ---------------------------------------------------------------------------
const MAX_OUTPUT_LINES = 2_000; // P2 — cap output history per run
const pendingOutputs = new Map<string, { run: ScriptRun; err: boolean }>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flushPendingOutputs() {
  flushTimer = null;
  if (pendingOutputs.size === 0) return;
  const snapshot = new Map(pendingOutputs);
  pendingOutputs.clear();
  snapshot.forEach(({ run }) => {
    // The pending entry already holds the accumulated output since the last
    // flush; merge it onto the freshest store state so status/exitCode set by
    // runPythonScript during the window are never lost.
    const base = store.runs.get(run.scriptId) ?? run;
    const merged: ScriptRun = {
      ...base,
      output: [...base.output, ...run.output.slice(base.output.length)],
      exitCode: base.exitCode ?? run.exitCode,
      status: base.status === "error" || base.status === "done" ? base.status : run.status,
    };
    setRun(merged);
    // If the run finished while output was still pending, sync the stored
    // script's lastOutput/exit/status so they reflect the full output.
    if (merged.status === "done" || merged.status === "error") {
      setScripts((scripts) =>
        scripts.map((s) =>
          s.id === merged.scriptId
            ? { ...s, lastOutput: merged.output.join(""), lastExitCode: merged.exitCode ?? 1, lastStatus: merged.status === "done" ? "success" : "error" }
            : s
        )
      );
    }
  });
}

function appendRunOutput(runId: string, text: string, isErr = false) {
  // Accumulate against the current pending entry if one exists, otherwise
  // against the store. Building every snapshot off the store would discard
  // all unflushed lines (the store is only updated at flush time), so each
  // new append would start from a stale tail and only the last line before
  // each flush would survive.
  const priorRun = pendingOutputs.get(runId)?.run ?? store.runs.get(runId);
  if (!priorRun) return;
  // P2 — keep the tail only; long runs never grow past the cap
  const tail = priorRun.output.length > MAX_OUTPUT_LINES
    ? priorRun.output.slice(priorRun.output.length - MAX_OUTPUT_LINES)
    : priorRun.output;
  const updated: ScriptRun = {
    ...priorRun,
    output: [...tail, text],
    exitCode: isErr ? (priorRun.exitCode ?? 0) || 1 : priorRun.exitCode,
  };
  pendingOutputs.set(runId, { run: updated, err: isErr });
  if (!flushTimer) {
    flushTimer = setTimeout(flushPendingOutputs, 75);
  }
}

// ---------------------------------------------------------------------------
// Shell simulation (white-listed commands, echo pass-through)
// ---------------------------------------------------------------------------

const SHELL_ENV: Record<string, string> = {
  HOME: "/home/enosx",
  USER: "enosx",
  SHELL: "/bin/bash",
  OS: "Enosx Web Workspace (Linux simulation)",
};

function execShellLine(line: string, env: Record<string, string>, state: { cwd: string; files: string[]; vars: Record<string, string>; out: string[] }) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  if (trimmed.startsWith("echo ")) {
    const rest = trimmed.slice(5);
    const unquoted = rest.replace(/^["']|["']$/g, "");
    state.out.push(substituteVars(unquoted, env, state.vars));
    return;
  }
  if (trimmed.startsWith("export ")) {
    const eq = trimmed.indexOf("=");
    if (eq > 0) {
      const name = trimmed.slice(7, eq);
      state.vars[name] = trimmed.slice(eq + 1).replace(/^["']|["']$/g, "");
      env[name] = state.vars[name];
    }
    return;
  }
  if (trimmed.startsWith("VAR=") || /^[A-Z_]+=\S/.test(trimmed)) {
    const eq = trimmed.indexOf("=");
    state.vars[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
    return;
  }
  const parts = trimmed.split(/\s+/);
  const cmd = parts[0];
  const args = parts.slice(1).map((a) => a.replace(/^["']|["']$/g, ""));
  switch (cmd) {
    case "pwd":
      state.out.push(state.cwd);
      break;
    case "ls": {
      const listed = args.length ? args : state.files;
      state.out.push(listed.join("  ") || "");
      break;
    }
    case "cat":
      state.out.push(`[cat] content of ${args[0] ?? ""}`);
      break;
    case "mkdir":
      if (args[0]) {
        state.files.push(args[0]);
        state.out.push(`Created directory: ${args[0]}`);
      }
      break;
    case "date":
      state.out.push(new Date().toString());
      break;
    case "whoami":
      state.out.push(env.USER);
      break;
    case "hostname":
      state.out.push("enosx-web-workspace");
      break;
    case "uname":
      state.out.push(args.includes("-a") ? "Enosx Web Workspace 1.0 webasm x86_64" : "Enosx Web Workspace");
      break;
    case "env":
      state.out.push(...Object.entries({ ...env, ...state.vars }).map(([k, v]) => `${k}=${v}`));
      break;
    case "clear":
    case "reset":
      state.out.length = 0;
      break;
    case "sleep":
      state.out.push(`(waited ${args[0] ?? "1"}s)`);
      break;
    case "exit":
      state.out.push(`exit ${args[0] ?? "0"}`);
      break;
    default:
      state.out.push(`bash: ${cmd}: command not found (sandboxed shell — available: echo, pwd, ls, cat, mkdir, date, whoami, hostname, uname, env, clear, sleep, exit)`);
  }
}

function substituteVars(text: string, env: Record<string, string>, vars: Record<string, string>): string {
  return text.replace(/\$\{?([A-Z_][A-Z0-9_]*)\}?/g, (_m, name) => vars[name] ?? env[name] ?? "");
}

function runShellScript(script: ScriptFile, run: ScriptRun) {
  const lines = script.content.split(/\r?\n/);
  const state = { cwd: "/home/enosx", files: ["workspace"], vars: { ...SHELL_ENV }, out: [] as string[] };
  setRun({ ...(store.runs.get(script.id) ?? run), status: "running" });
  lines.forEach((line, i) => {
    setTimeout(() => {
      const current = store.runs.get(script.id);
      if (!current || current.status !== "running") return;
      execShellLine(line, { ...SHELL_ENV }, state);
      setRun({ ...current, output: [...state.out] });
      if (i === lines.length - 1) {
        setRun({ ...(store.runs.get(script.id) ?? current), output: [...state.out], status: "done", exitCode: 0 });
        setScripts((scripts) =>
          scripts.map((s) =>
            s.id === script.id ? { ...s, lastOutput: state.out.join("\n"), lastExitCode: 0, lastStatus: "success" } : s
          )
        );
      }
    }, i * 250);
  });
  if (lines.length === 0) {
    setRun({ ...run, status: "done", exitCode: 0 });
  }
}

// ---------------------------------------------------------------------------
// Batch simulation (Windows cmd.exe style)
// ---------------------------------------------------------------------------

const BATCH_INFO = {
  computerName: "ENOSX-WS",
  userName: "Enosx",
  os: "Enosx Web Workspace (Windows simulation)",
};

function execBatchLine(rawLine: string, state: { cwd: string; files: string[]; vars: Record<string, string>; out: string[] }) {
  const line = rawLine.trimEnd();
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("REM") || trimmed.startsWith("rem") || trimmed === "@echo on" || trimmed === "@echo off" || trimmed === "echo off") return;
  const cleaned = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  if (cleaned.toLowerCase().startsWith("echo ")) {
    state.out.push(cleaned.slice(5));
    return;
  }
  if (cleaned.toLowerCase().startsWith("set ")) {
    const rest = cleaned.slice(4);
    const eq = rest.indexOf("=");
    if (eq > 0) state.vars[rest.slice(0, eq).trim().toUpperCase()] = rest.slice(eq + 1).trim();
    return;
  }
  const lower = cleaned.toLowerCase();
  const args = cleaned.split(/\s+/).slice(1);
  if (lower.startsWith("dir")) {
    state.out.push(` Volume in drive ${state.cwd.slice(0, 1)} has no label.`);
    state.out.push(` Directory of ${state.cwd}`);
    state.out.push("");
    state.files.forEach((f) => state.out.push(`  ${new Date().toLocaleTimeString()}    <DIR>          ${f}`));
    state.out.push(`               0 File(s)              0 bytes`);
    state.out.push(`               ${state.files.length} Dir(s)   1073741824 bytes free`);
    return;
  }
  if (lower.startsWith("mkdir") || lower.startsWith("md ")) {
    if (args[0]) {
      state.files.push(args[0]);
      state.out.push(` Created directory: ${args[0]}`);
    }
    return;
  }
  if (lower === "date" || lower === "time") {
    state.out.push(`The current ${lower} is: ${new Date().toLocaleString()}`);
    return;
  }
  if (lower === "ver") {
    state.out.push(`\n${BATCH_INFO.os}\n`);
    return;
  }
  if (lower === "whoami") {
    state.out.push(`${BATCH_INFO.computerName}\\${BATCH_INFO.userName}`);
    return;
  }
  if (lower === "hostname") {
    state.out.push(BATCH_INFO.computerName);
    return;
  }
  if (lower === "cls" || lower === "clear") {
    state.out.length = 0;
    return;
  }
  if (lower === "pause") {
    state.out.push("Press any key to continue . . .");
    return;
  }
  if (lower === "title " || lower.startsWith("title ")) {
    return;
  }
  if (lower.startsWith("copy ") || lower.startsWith("ren ") || lower.startsWith("rename ") || lower.startsWith("del ") || lower.startsWith("type ") || lower.startsWith("call ")) {
    state.out.push(`(simulated) ${cleaned}`);
    return;
  }
  state.out.push(`'${cleaned}' is not recognized as a supported command in this web workspace.`);
  state.out.push("Supported: echo, set, dir, mkdir/md, date, time, ver, whoami, hostname, cls, pause, title, copy, ren, del, type, call, rem");
}

function runBatchScript(script: ScriptFile, run: ScriptRun) {
  const lines = script.content.split(/\r?\n/);
  const state = { cwd: "C:\\Enosx\\Scripts", files: ["projects", "backups"], vars: { PATH: "C:\\Windows\\System32" }, out: [] as string[] };
  state.out.push(`Microsoft Windows [${BATCH_INFO.os}]`);
  state.out.push(`(c) Enosx Technologies. All rights reserved.`);
  state.out.push("");
  setRun({ ...(store.runs.get(script.id) ?? run), status: "running" });
  lines.forEach((line, i) => {
    setTimeout(() => {
      const current = store.runs.get(script.id);
      if (!current || current.status !== "running") return;
      execBatchLine(line, state);
      setRun({ ...current, output: [...state.out] });
      if (i === lines.length - 1) {
        setRun({ ...current, output: [...state.out], status: "done", exitCode: 0 });
        setScripts((scripts) =>
          scripts.map((s) =>
            s.id === script.id ? { ...s, lastOutput: state.out.join("\r\n"), lastExitCode: 0, lastStatus: "success" } : s
          )
        );
      }
    }, i * 300);
  });
  if (lines.length === 0) {
    setRun({ ...run, status: "done", exitCode: 0 });
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function useScriptRuntime() {
  const [, forceRender] = useState(0);
  const subscribed = useRef(false);

  useEffect(() => {
    if (!subscribed.current) {
      subscribed.current = true;
      onScriptStoreChange(() => forceRender((t) => t + 1));
    }
  }, []);

  const scripts = store.scripts;
  const runs = store.runs;

  const createScript = useCallback((name: string, language: ScriptLanguage, content: string): ScriptFile => {
    const ext = name.split(".").pop()?.toLowerCase();
    const lang: ScriptLanguage =
      language || (ext === "bat" || ext === "cmd" ? "batch" : ext === "sh" ? "shell" : "python");
    const script: ScriptFile = {
      id: `script-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      language: lang,
      content,
      createdAt: Date.now(),
    };
    setScripts((list) => [...list, script]);
    return script;
  }, []);

  const updateScript = useCallback((id: string, content: string) => {
    setScripts((list) => list.map((script) => script.id === id ? { ...script, content } : script));
  }, []);

  const deleteScript = useCallback((id: string) => {
    setScripts((list) => list.filter((s) => s.id !== id));
    store.runs.delete(id);
    notifyStore();
  }, []);

  const runScript = useCallback((scriptId: string) => {
    const script = store.scripts.find((s) => s.id === scriptId);
    if (!script) return;
    if (script.content.trim().length === 0) {
      setRun({ scriptId, scriptName: script.name, status: "error", output: ["(empty script — nothing to run)"], exitCode: 1 });
      return;
    }
    const run: ScriptRun = { scriptId, scriptName: script.name, status: "queued", output: [], exitCode: null };
    setRun(run);
    // Flush immediately on run start so "running" state is visible right away
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushPendingOutputs();
    }
    if (script.language === "python") {
      activePyRunId = scriptId;
      void runPythonScript(script, run);
    } else if (script.language === "shell") {
      runShellScript(script, run);
    } else {
      runBatchScript(script, run);
    }
  }, []);

  return { scripts, runs, createScript, updateScript, deleteScript, runScript };
}
