/*
 * ENOSX AI — WorkspaceComputerPane
 * Manus-style right pane: the live Enosx Computer workspace surface.
 * Windowed apps (browser, files, github, assistant, settings) run inside
 * this pane, and AI command-chain actions drive them visibly.
 */
import { useEffect, useMemo, useState } from "react";
import { BatteryCharging, Clock3, RefreshCw, Wifi } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useDeviceType } from "@/hooks/useDeviceType";
import {
  useComputerWorkspace,
  type ComputerWindowState,
} from "@/contexts/ComputerWorkspaceContext";
import { ComputerDock } from "@/components/computer/ComputerDock";
import { ComputerLauncher } from "@/components/computer/ComputerLauncher";
import { ComputerWindow } from "@/components/computer/ComputerWindow";
import { AssistantWindow } from "@/components/computer/apps/AssistantWindow";
import { BrowserWindow } from "@/components/computer/apps/BrowserWindow";
import { FilesWindow } from "@/components/computer/apps/FilesWindow";
import { GitHubWindow } from "@/components/computer/apps/GitHubWindow";
import { SettingsWindow } from "@/components/computer/apps/SettingsWindow";

function WindowBody({ appId }: { appId: ComputerWindowState["appId"] }) {
  switch (appId) {
    case "assistant": return <AssistantWindow />;
    case "browser": return <BrowserWindow />;
    case "github": return <GitHubWindow />;
    case "files": return <FilesWindow />;
    case "settings": return <SettingsWindow />;
    default: return null;
  }
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(date);
}

export default function WorkspaceComputerPane() {
  const { config } = useTheme();
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
    const clamp = () => clampToViewport(window.innerWidth, Math.max(320, window.innerHeight - 48));
    clamp();
    window.addEventListener("resize", clamp);
    return () => window.removeEventListener("resize", clamp);
  }, [clampToViewport]);

  const visibleWindows = useMemo(
    () => windows.filter((window) => window.lifecycle !== "minimized"),
    [windows]
  );
  const activeWindow =
    windows.find((window) => window.id === activeWindowId) ?? visibleWindows[visibleWindows.length - 1];

  return (
    <div className="relative h-full w-full overflow-hidden text-white selection:bg-cyan-300/20">
      <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(circle at 20% 0%, rgba(${config.accentRgb},0.12), transparent 36%), radial-gradient(circle at 90% 90%, rgba(80,120,255,0.1), transparent 38%)` }} />
      <div className="pointer-events-none absolute inset-0 opacity-15" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />

      <header className="relative z-[1050] flex h-12 items-center justify-between border-b px-3" style={{ borderColor: `rgba(${config.accentRgb},0.14)`, background: `rgba(6,8,14,0.5)` }}>
        <div className="flex items-center gap-2.5">
          <div>
            <p className="text-[11px] font-bold tracking-[0.16em] text-white/90">ENOSX COMPUTER</p>
            <p className="hidden text-[9px] uppercase tracking-[0.15em] text-white/35 sm:block">Workspace surface · {isCompact ? "compact mode" : "desktop mode"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-white/40">
          <span className="hidden items-center gap-1.5 sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.8)]" />Workspace ready</span>
          <span className="flex items-center gap-1"><Wifi size={12} />Local</span>
          <span className="hidden items-center gap-1 sm:flex"><BatteryCharging size={12} />Web</span>
          <span className="flex items-center gap-1"><Clock3 size={12} />{formatTime(now)}</span>
          <button type="button" aria-label="Reset workspace layout" title="Reset layout" onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "r", ctrlKey: true }))} className="rounded-md p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white" onPointerDown={() => {}}>
            <RefreshCw size={11} />
          </button>
        </div>
      </header>

      <main className="absolute inset-x-0 bottom-10 top-12 overflow-hidden">
        {!activeWindow && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-white/45">
            <p className="text-sm font-semibold text-white/70">Your workspace is clear.</p>
            <p className="max-w-sm text-xs">Open an application from the dock or launcher, or ask ENOSX AI to do it for you.</p>
          </div>
        )}
        {isCompact && activeWindow ? (
          <ComputerWindow windowState={{ ...activeWindow, lifecycle: "maximized" }} isActive onFocus={() => focusWindow(activeWindow.id)} onClose={() => closeWindow(activeWindow.id)} onMinimize={() => minimizeWindow(activeWindow.id)} onMaximize={() => maximizeWindow(activeWindow.id)} onRestore={() => restoreWindow(activeWindow.id)} onMove={(x, y) => moveWindow(activeWindow.id, x, y)} onResize={(width, height) => resizeWindow(activeWindow.id, width, height)}>
            <WindowBody appId={activeWindow.appId} />
          </ComputerWindow>
        ) : (
          visibleWindows.map((window) => (
            <ComputerWindow key={window.id} windowState={window} isActive={window.id === activeWindowId} onFocus={() => focusWindow(window.id)} onClose={() => closeWindow(window.id)} onMinimize={() => minimizeWindow(window.id)} onMaximize={() => maximizeWindow(window.id)} onRestore={() => restoreWindow(window.id)} onMove={(x, y) => moveWindow(window.id, x, y)} onResize={(width, height) => resizeWindow(window.id, width, height)}>
              <WindowBody appId={window.appId} />
            </ComputerWindow>
          ))
        )}
      </main>

      <ComputerDock />
      <ComputerLauncher />
      <div className="pointer-events-none absolute bottom-2 left-3 z-[1000] hidden text-[9px] uppercase tracking-[0.17em] text-white/25 lg:block">Ctrl / Cmd + K · Launch applications</div>
    </div>
  );
}
