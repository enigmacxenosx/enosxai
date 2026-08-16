import { useTheme } from "@/contexts/ThemeContext";
import { useWallpaper } from "@/contexts/WallpaperContext";
import { COMPUTER_APPS } from "@/lib/computerApps";
import { useComputerWorkspace } from "@/contexts/ComputerWorkspaceContext";

export function ComputerDock() {
  const { config } = useTheme();
  const { settings } = useWallpaper();
  const { windows, activeWindowId, openWindow, focusWindow, restoreWindow, setLauncherOpen } = useComputerWorkspace();

  return (
    <nav
      aria-label="Enosx Computer applications"
      className="absolute bottom-4 left-1/2 z-[1000] flex -translate-x-1/2 items-center gap-1.5 rounded-2xl border p-2 shadow-2xl"
      style={{
        borderColor: `rgba(${config.accentRgb}, 0.22)`,
        background: `rgba(7, 9, 15, ${Math.min(0.94, settings.panelOpacity + 0.12)})`,
        backdropFilter: `blur(${Math.max(settings.blurAmount, 16)}px)`,
        boxShadow: `0 16px 48px rgba(0,0,0,0.35), 0 0 24px rgba(${config.accentRgb},0.08)`,
      }}
    >
      {COMPUTER_APPS.map((app) => {
        const Icon = app.icon;
        const instance = windows.find((window) => window.appId === app.id);
        const isActive = instance?.id === activeWindowId && instance.lifecycle !== "minimized";
        return (
          <button
            key={app.id}
            type="button"
            aria-label={instance?.lifecycle === "minimized" ? `Restore ${app.title}` : `Open ${app.title}`}
            title={instance?.lifecycle === "minimized" ? `Restore ${app.title}` : app.title}
            onClick={() => {
              if (!instance) openWindow(app.id);
              else if (instance.lifecycle === "minimized") restoreWindow(instance.id);
              else focusWindow(instance.id);
            }}
            className="group relative flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-200 hover:-translate-y-1"
            style={{
              color: isActive ? app.accent : "rgba(255,255,255,0.62)",
              borderColor: isActive ? `${app.accent}70` : "rgba(255,255,255,0.08)",
              background: isActive ? `${app.accent}20` : "rgba(255,255,255,0.035)",
              boxShadow: isActive ? `0 0 18px ${app.accent}20` : "none",
            }}
          >
            <Icon size={17} aria-hidden="true" />
            {instance && <span className="absolute -bottom-1 h-1 w-1 rounded-full" style={{ background: app.accent }} />}
            <span className="pointer-events-none absolute bottom-full mb-2 whitespace-nowrap rounded-md border border-white/10 bg-black/80 px-2 py-1 text-[10px] text-white/80 opacity-0 transition group-hover:opacity-100">
              {app.shortTitle}
            </span>
          </button>
        );
      })}
      <span className="mx-1 h-6 w-px bg-white/10" aria-hidden="true" />
      <button
        type="button"
        aria-label="Open application launcher"
        title="Application launcher"
        onClick={() => setLauncherOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-xl border text-white/55 transition hover:-translate-y-1 hover:bg-white/10 hover:text-white"
        style={{ borderColor: `rgba(${config.accentRgb}, 0.2)` }}
      >
        <span className="grid grid-cols-3 gap-0.5" aria-hidden="true">
          {Array.from({ length: 9 }).map((_, index) => <span key={index} className="h-1 w-1 rounded-full bg-current" />)}
        </span>
      </button>
    </nav>
  );
}
