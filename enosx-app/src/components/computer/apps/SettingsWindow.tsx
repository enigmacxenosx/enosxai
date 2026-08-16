import { ExternalLink, LayoutDashboard, RotateCcw, ShieldCheck, Wallpaper } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useComputerWorkspace } from "@/contexts/ComputerWorkspaceContext";

export function SettingsWindow() {
  const { config } = useTheme();
  const { resetLayout } = useComputerWorkspace();

  const openBackgroundPicker = () => {
    const handler = (window as Window & { __openBackgroundPicker?: () => void }).__openBackgroundPicker;
    if (handler) handler();
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4 text-white/80">
      <div className="grid gap-2">
        <button type="button" onClick={resetLayout} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-left transition hover:bg-white/8"><LayoutDashboard size={17} className="text-white/60" /><span className="flex-1"><span className="block text-xs font-semibold text-white/80">Reset window layout</span><span className="block text-[10px] text-white/35">Restore the safe default positions and open apps.</span></span><RotateCcw size={14} className="text-white/30" /></button>
        <button type="button" onClick={openBackgroundPicker} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-left transition hover:bg-white/8"><Wallpaper size={17} style={{ color: config.accent }} /><span className="flex-1"><span className="block text-xs font-semibold text-white/80">Change background</span><span className="block text-[10px] text-white/35">Uses the existing Enosx wallpaper picker.</span></span><ExternalLink size={14} className="text-white/30" /></button>
      </div>
      <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/5 p-4"><div className="mb-2 flex items-center gap-2 text-emerald-200"><ShieldCheck size={15} /><span className="text-xs font-semibold">Web workspace boundary</span></div><p className="text-[11px] leading-relaxed text-emerald-100/60">Enosx Computer is a browser workspace. It does not claim native OS control, launch arbitrary processes, browse the filesystem, or execute terminal commands. Those capabilities belong to a future permissioned desktop shell.</p></div>
      <div className="mt-auto rounded-xl border border-white/8 bg-black/15 p-3 text-[10px] leading-relaxed text-white/35">Window positions and sizes are saved locally in this browser and clamped to the viewport when the workspace is resized.</div>
    </div>
  );
}
