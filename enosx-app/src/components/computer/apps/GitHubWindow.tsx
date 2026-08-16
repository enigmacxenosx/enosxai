import { ArrowUpRight, GitBranch, Github, LockKeyhole, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";

export function GitHubWindow() {
  const { config } = useTheme();
  const [, setLocation] = useLocation();

  return (
    <div className="flex h-full flex-col gap-4 p-4 text-white/80">
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white"><Github size={20} /></span>
        <div><p className="text-sm font-semibold text-white/90">GitHub stays connected to its existing panel.</p><p className="mt-1 text-[11px] text-white/40">This workspace window is a safe launch surface, not a second repository editor.</p></div>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-white/8 bg-black/15 p-3"><GitBranch size={14} className="mb-2 text-white/55" /><p className="text-[10px] uppercase tracking-wider text-white/35">Workflow</p><p className="mt-1 text-xs text-white/75">Browse · edit · push</p></div>
        <div className="rounded-lg border border-white/8 bg-black/15 p-3"><ShieldCheck size={14} className="mb-2 text-emerald-300" /><p className="text-[10px] uppercase tracking-wider text-white/35">Approval</p><p className="mt-1 text-xs text-white/75">Review before changes</p></div>
        <div className="rounded-lg border border-white/8 bg-black/15 p-3"><LockKeyhole size={14} className="mb-2 text-amber-300" /><p className="text-[10px] uppercase tracking-wider text-white/35">Boundary</p><p className="mt-1 text-xs text-white/75">No silent pushes</p></div>
      </div>
      <div className="mt-auto rounded-xl border p-4" style={{ borderColor: `rgba(${config.accentRgb},0.18)`, background: `rgba(${config.accentRgb},0.06)` }}>
        <p className="text-xs leading-relaxed text-white/60">Open Chat to use the established GitHub panel, repository picker, editor, and push flow. Your computer layout is saved independently.</p>
        <button type="button" onClick={() => setLocation("/")} className="mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition hover:bg-white/10" style={{ borderColor: `rgba(${config.accentRgb},0.28)`, color: config.accent }}>
          Open Chat and GitHub panel <ArrowUpRight size={13} />
        </button>
      </div>
    </div>
  );
}
