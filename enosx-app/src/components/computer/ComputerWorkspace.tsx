import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BatteryCharging, Clock3, Menu, Wifi } from "lucide-react";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { useDeviceType } from "@/hooks/useDeviceType";
import { useComputerWorkspace, type ComputerWindowState } from "@/contexts/ComputerWorkspaceContext";
import { ComputerDock } from "./ComputerDock";
import { ComputerLauncher } from "./ComputerLauncher";
import { ComputerWindow } from "./ComputerWindow";
import { AssistantWindow } from "./apps/AssistantWindow";
import { BrowserWindow } from "./apps/BrowserWindow";
import { FilesWindow } from "./apps/FilesWindow";
import { GitHubWindow } from "./apps/GitHubWindow";
import { SettingsWindow } from "./apps/SettingsWindow";
import { TerminalWindow } from "./apps/TerminalWindow";

function WindowBody({ appId }: { appId: ComputerWindowState["appId"] }) {
  switch (appId) {
    case "assistant": return <AssistantWindow />;
    case "browser": return <BrowserWindow />;
    case "github": return <GitHubWindow />;
    case "files": return <FilesWindow />;
    case "terminal": return <TerminalWindow />;
    case "settings": return <SettingsWindow />;
    default: return null;
  }
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(date);
}

export function ComputerWorkspace() {
  const { config } = useTheme();
  const [, setLocation] = useLocation();
  const deviceType = useDeviceType();
  const isCompact = deviceType === "phone" || deviceType === "tablet";
  const {
    windows,
    activeWindowId,
    isLauncherOpen,
    openWindow,
    focusWindow,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    restoreWindow,
    moveWindow,
    resizeWindow,
    setLauncherOpen,
    clampToViewport,
  } = useComputerWorkspace();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setLauncherOpen(true);
      }
      if (event.key === "Escape" && isLauncherOpen) setLauncherOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLauncherOpen, setLauncherOpen]);

  useEffect(() => {
    const clamp = () => clampToViewport(window.innerWidth, Math.max(320, window.innerHeight - 76));
    clamp();
    window.addEventListener("resize", clamp);
    return () => window.removeEventListener("resize", clamp);
  }, [clampToViewport]);

  const visibleWindows = useMemo(() => windows.filter((window) => window.lifecycle !== "minimized"), [windows]);
  const activeWindow = windows.find((window) => window.id === activeWindowId) ?? visibleWindows[visibleWindows.length - 1];
  const mobileWindow = activeWindow ? { ...activeWindow, lifecycle: "maximized" as const } : null;

  return (
    <div className="relative h-full w-full overflow-hidden text-white selection:bg-cyan-300/20">
      <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(circle at 20% 0%, rgba(${config.accentRgb},0.15), transparent 36%), radial-gradient(circle at 90% 90%, rgba(80,120,255,0.12), transparent 38%)` }} />
      <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />

      <header className="relative z-[1050] flex h-14 items-center justify-between border-b px-4 md:px-6" style={{ borderColor: `rgba(${config.accentRgb},0.14)`, background: `rgba(6,8,14,0.5)` }}>
        <div className="flex items-center gap-3">
          <button type="button" aria-label="Back to Chat" title="Back to Chat" onClick={() => setLocation("/")} className="rounded-lg border border-white/10 p-2 text-white/55 transition hover:bg-white/10 hover:text-white"><ArrowLeft size={15} /></button>
          <div><p className="text-xs font-bold tracking-[0.16em] text-white/90">ENOSX COMPUTER</p><p className="hidden text-[9px] uppercase tracking-[0.15em] text-white/35 sm:block">Workspace surface · {isCompact ? "compact mode" : "desktop mode"}</p></div>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-white/40"><span className="hidden items-center gap-1.5 sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.8)]" />Workspace ready</span><span className="flex items-center gap-1"><Wifi size={12} />Local</span><span className="hidden items-center gap-1 sm:flex"><BatteryCharging size={12} />Web</span><span className="flex items-center gap-1"><Clock3 size={12} />{formatTime(now)}</span></div>
      </header>

      {isCompact && activeWindow && (
        <div className="relative z-10 flex h-10 items-center gap-2 border-b px-3 text-[10px] text-white/45" style={{ borderColor: `rgba(${config.accentRgb},0.1)`, background: "rgba(0,0,0,0.18)" }}>
          <Menu size={13} /> <span>Compact workspace</span><span className="text-white/20">·</span><span className="text-white/70">{activeWindow.title}</span>
        </div>
      )}

      <main className="absolute inset-x-0 bottom-0 top-14 overflow-hidden">
        {!activeWindow && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-white/45"><p className="text-sm font-semibold text-white/70">Your workspace is clear.</p><p className="max-w-sm text-xs">Open an application from the dock or launcher to begin.</p></div>
        )}
        {isCompact ? (
          mobileWindow && <ComputerWindow windowState={mobileWindow} isActive onFocus={() => focusWindow(mobileWindow.id)} onClose={() => closeWindow(mobileWindow.id)} onMinimize={() => minimizeWindow(mobileWindow.id)} onMaximize={() => maximizeWindow(mobileWindow.id)} onRestore={() => restoreWindow(mobileWindow.id)} onMove={(x, y) => moveWindow(mobileWindow.id, x, y)} onResize={(width, height) => resizeWindow(mobileWindow.id, width, height)}><WindowBody appId={mobileWindow.appId} /></ComputerWindow>
        ) : (
          visibleWindows.map((window) => (
            <ComputerWindow key={window.id} windowState={window} isActive={window.id === activeWindowId} onFocus={() => focusWindow(window.id)} onClose={() => closeWindow(window.id)} onMinimize={() => minimizeWindow(window.id)} onMaximize={() => maximizeWindow(window.id)} onRestore={() => restoreWindow(window.id)} onMove={(x, y) => moveWindow(window.id, x, y)} onResize={(width, height) => resizeWindow(window.id, width, height)}><WindowBody appId={window.appId} /></ComputerWindow>
          ))
        )}
      </main>

      <ComputerDock />
      <ComputerLauncher />
      <div className="pointer-events-none absolute bottom-2 left-4 z-[1000] hidden text-[9px] uppercase tracking-[0.17em] text-white/25 md:block">Ctrl / Cmd + K · Launch applications</div>
    </div>
  );
}
