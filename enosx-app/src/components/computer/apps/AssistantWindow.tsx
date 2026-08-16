import { ArrowRight, Bot, Command, Keyboard, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { useComputerWorkspace } from "@/contexts/ComputerWorkspaceContext";

export function AssistantWindow() {
  const { config } = useTheme();
  const [, setLocation] = useLocation();
  const { openWindow } = useComputerWorkspace();

  return (
    <div className="flex h-full flex-col gap-4 p-4 text-white/80">
      <div className="rounded-xl border p-4" style={{ borderColor: `rgba(${config.accentRgb}, 0.18)`, background: `linear-gradient(135deg, rgba(${config.accentRgb}, 0.12), rgba(255,255,255,0.03))` }}>
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ color: config.accent, background: `rgba(${config.accentRgb},0.16)` }}><Bot size={18} /></span>
          <div>
            <p className="text-sm font-semibold text-white/90">Your workspace is ready.</p>
            <p className="text-[11px] text-white/45">Open a tool, then ask EnosxAI what to do next.</p>
          </div>
        </div>
        <button type="button" onClick={() => setLocation("/")} className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs font-semibold transition hover:bg-white/10" style={{ borderColor: `rgba(${config.accentRgb},0.24)`, color: config.accent }}>
          Continue in full Chat <ArrowRight size={14} />
        </button>
      </div>

      <div className="grid gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">Workspace shortcuts</p>
        <button type="button" onClick={() => openWindow("browser")} className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5 text-left transition hover:bg-white/8">
          <Command size={14} className="text-violet-300" />
          <span><span className="block text-xs text-white/75">Read a public webpage</span><span className="block text-[10px] text-white/35">Uses the existing read-only browser tool.</span></span>
        </button>
        <button type="button" onClick={() => openWindow("files")} className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5 text-left transition hover:bg-white/8">
          <Keyboard size={14} className="text-amber-300" />
          <span><span className="block text-xs text-white/75">Add file context</span><span className="block text-[10px] text-white/35">Only files you explicitly select are shown.</span></span>
        </button>
      </div>

      <div className="mt-auto flex gap-2 rounded-lg border border-emerald-400/15 bg-emerald-400/5 p-3 text-[10px] leading-relaxed text-emerald-100/65">
        <ShieldCheck size={14} className="mt-0.5 flex-shrink-0 text-emerald-300" />
        <span>This web workspace does not launch native processes, inspect your operating system, or run arbitrary terminal commands.</span>
      </div>
    </div>
  );
}
