/*
 * ENOSX AI — TerminalWindow
 * The workspace script console: the AI's .py / .sh / .bat scripts live here.
 * Python runs for real in the browser (Pyodide / WebAssembly CPython);
 * shell and batch run in a clearly labeled sandboxed simulation.
 */
import { useEffect, useRef, useState } from "react";
import { Code2, Play, Trash2, FileCode2, Terminal as TerminalIcon, ShieldCheck } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useScriptRuntime, type ScriptFile } from "@/hooks/useScriptRuntime";

const LANG_META: Record<ScriptFile["language"], { label: string; color: string; icon: "python" | "shell" | "batch" }> = {
  python: { label: "Python", color: "#3b82f6", icon: "python" },
  shell: { label: "Shell", color: "#22c55e", icon: "shell" },
  batch: { label: "Batch", color: "#a78bfa", icon: "batch" },
};

function LangBadge({ script }: { script: ScriptFile }) {
  const meta = LANG_META[script.language];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
      style={{ background: `${meta.color}22`, color: meta.color, border: `1px solid ${meta.color}44` }}
    >
      <Code2 size={9} /> {meta.label}
    </span>
  );
}

export function TerminalWindow() {
  const { config } = useTheme();
  const { scripts, runs, createScript, deleteScript, runScript } = useScriptRuntime();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const outputRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const initialized = useRef(false);

  // Seed demo scripts on first open (same spirit as other windows' welcome state)
  useEffect(() => {
    if (initialized.current || scripts.length > 0) return;
    initialized.current = true;
    const py = createScript("hello.py", "python", 'print("Hello from Enosx AI!")\nfor i in range(1, 4):\n    print(f"Counting workspace powers: {i}")\nprint("Done — scripts are running for real in the browser.")');
    createScript("system-info.sh", "shell", "# Workspace environment snapshot\nwhoami\nhostname\nuname -a\nls\npwd\necho \"All checks passed — Enosx workspace is online.\"");
    createScript("setup.bat", "batch", "@echo off\nREM Enosx workspace setup script\necho Initializing Enosx workspace...\nset PROJECT=EnosxAI\nset VERSION=1.0\necho Project: %PROJECT% v%VERSION%\ndir\nver\nwhoami\necho Setup complete.\npause");
    setSelectedId(py.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // P4 — Intent-aware instant auto-scroll:
  // Only auto-scroll when the user is already at the bottom (they haven't
  // manually scrolled up to inspect history), and scroll instantly. This
  // eliminates the competing smooth-scroll animations that caused visible
  // jank on fast output streams.
  useEffect(() => {
    const el = selectedId ? outputRefs.current.get(selectedId) : undefined;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    if (atBottom) {
      el.scrollTo({ top: el.scrollHeight });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scripts, runs, selectedId]);

  const selected = scripts.find((s) => s.id === selectedId) ?? scripts[0] ?? null;
  const run = selected ? runs.get(selected.id) : undefined;

  return (
    <div className="flex h-full flex-col gap-3 p-4 text-white/85">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ color: config.accent, background: `rgba(${config.accentRgb},0.14)` }}>
          <TerminalIcon size={16} />
        </span>
        <div>
          <p className="text-xs font-bold tracking-wide">Script Console</p>
          <p className="text-[9px] uppercase tracking-[0.18em] text-white/35">Python · Shell · Batch</p>
        </div>
      </div>

      {/* Script library */}
      <div className="min-h-0 flex-1 overflow-auto">
        <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-white/35">Scripts · {scripts.length}</p>
        <div className="space-y-2">
          {scripts.map((script) => {
            const r = runs.get(script.id);
            const isSelected = selected?.id === script.id;
            return (
              <div
                key={script.id}
                className="rounded-xl border bg-black/15 transition"
                style={{ borderColor: isSelected ? `rgba(${config.accentRgb},0.5)` : "rgba(255,255,255,0.08)", background: isSelected ? `rgba(${config.accentRgb},0.08)` : undefined }}
              >
                <div className="flex items-center gap-2 px-3 py-2">
                  <FileCode2 size={14} className="flex-shrink-0" style={{ color: LANG_META[script.language].color }} />
                  <button type="button" onClick={() => setSelectedId(script.id)} className="min-w-0 flex-1 truncate text-left text-xs font-semibold text-white/80 hover:text-white">
                    {script.name}
                  </button>
                  <LangBadge script={script} />
                  {r?.status === "running" && <span className="text-[9px] font-bold uppercase tracking-wider text-amber-300">Running…</span>}
                  {r?.status === "done" && <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-300">Done</span>}
                  {r?.status === "error" && <span className="text-[9px] font-bold uppercase tracking-wider text-red-300">Error</span>}
                  <button
                    type="button"
                    title="Run script"
                    aria-label={`Run ${script.name}`}
                    disabled={r?.status === "running"}
                    onClick={() => {
                      setSelectedId(script.id);
                      runScript(script.id);
                    }}
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-emerald-300 transition hover:bg-emerald-400/15 disabled:opacity-40"
                  >
                    <Play size={12} />
                  </button>
                  <button
                    type="button"
                    title="Delete script"
                    aria-label={`Delete ${script.name}`}
                    onClick={() => {
                      deleteScript(script.id);
                      if (selectedId === script.id) setSelectedId(null);
                    }}
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-white/35 transition hover:bg-red-400/15 hover:text-red-300"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                {isSelected && (
                  <div className="border-t border-white/5">
                    <pre className="max-h-32 overflow-auto rounded-b-none bg-black/30 px-3 py-2 text-[10px] leading-relaxed text-white/55">
                      <code>{script.content}</code>
                    </pre>
                    <div
                      ref={(el) => {
                        if (el) outputRefs.current.set(script.id, el);
                      }}
                      className="max-h-40 overflow-auto rounded-b-xl bg-black/60 px-3 py-2 font-mono text-[10px] leading-relaxed"
                      style={{ color: config.accent }}
                    >
                      {r && r.output.length > 0 ? (
                        (() => {
                          // P5 — window the visible output to the tail only;
                          // total output stays bounded (2k lines max in the
                          // runtime), and per-frame DOM work stays constant.
                          const CHUNK = 300;
                          const visible = r.output.slice(-CHUNK);
                          const skipped = r.output.length - visible.length;
                          return (
                            <>
                              {skipped > 0 && <div className="text-white/25">… {skipped.toLocaleString()} older lines omitted …</div>}
                              {visible.map((line, i) => (
                                <div key={i} className="whitespace-pre-wrap">
                                  {line === "" ? "\u00A0" : line}
                                </div>
                              ))}
                            </>
                          );
                        })()
                      ) : r?.status === "queued" ? (
                        <div className="text-white/35">Preparing run…</div>
                      ) : r?.status === "running" ? (
                        <div className="text-white/35">$ executing {script.name}<span className="thinking-pulse">...</span></div>
                      ) : (
                        <div className="text-white/30">Output will appear here when the script runs.</div>
                      )}
                      {r?.status === "done" && r.exitCode === 0 && <div className="mt-1 text-emerald-300">$ ✓ exited with code 0</div>}
                      {r?.status === "error" && <div className="mt-1 text-red-300">$ ✗ exited with code {r.exitCode ?? 1}</div>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {scripts.length === 0 && (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-center text-white/30">
              <FileCode2 size={22} />
              <p className="text-xs">No scripts yet.</p>
              <p className="max-w-xs text-[10px]">Ask ENOSX AI to create a script — it will appear here and run live.</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 rounded-lg border border-emerald-400/15 bg-emerald-400/5 p-3 text-[10px] leading-relaxed text-emerald-100/65">
        <ShieldCheck size={14} className="mt-0.5 flex-shrink-0 text-emerald-300" />
        <span>
          Python runs for real in your browser (WebAssembly). Shell and batch scripts run in a labeled simulation —
          this web workspace does not launch native processes or touch your operating system.
        </span>
      </div>
    </div>
  );
}
