import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { COMPUTER_APPS } from "@/lib/computerApps";
import { useComputerWorkspace } from "@/contexts/ComputerWorkspaceContext";

export function ComputerLauncher() {
  const { config } = useTheme();
  const { isLauncherOpen, setLauncherOpen, openWindow } = useComputerWorkspace();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const filteredApps = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return COMPUTER_APPS;
    return COMPUTER_APPS.filter((app) => `${app.title} ${app.description}`.toLowerCase().includes(normalized));
  }, [query]);

  useEffect(() => {
    if (isLauncherOpen) {
      setQuery("");
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isLauncherOpen]);

  if (!isLauncherOpen) return null;

  return (
    <div className="absolute inset-0 z-[1100] flex items-start justify-center bg-black/35 px-4 pt-[12vh] backdrop-blur-sm" onMouseDown={() => setLauncherOpen(false)}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Application launcher"
        className="w-full max-w-xl overflow-hidden rounded-2xl border bg-slate-950/95 shadow-2xl"
        style={{ borderColor: `rgba(${config.accentRgb}, 0.3)`, boxShadow: `0 20px 70px rgba(0,0,0,0.55), 0 0 30px rgba(${config.accentRgb},0.12)` }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <Search size={17} className="text-white/40" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setLauncherOpen(false);
              if (event.key === "Enter" && filteredApps[0]) openWindow(filteredApps[0].id);
            }}
            placeholder="Search applications..."
            aria-label="Search applications"
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
          />
          <button type="button" aria-label="Close application launcher" title="Close" onClick={() => setLauncherOpen(false)} className="rounded-md p-1.5 text-white/40 hover:bg-white/10 hover:text-white">
            <X size={15} />
          </button>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {filteredApps.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-white/40">No applications match this search.</p>
          ) : filteredApps.map((app) => {
            const Icon = app.icon;
            return (
              <button
                key={app.id}
                type="button"
                onClick={() => openWindow(app.id)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/8"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${app.accent}18`, color: app.accent }}>
                  <Icon size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-white/85">{app.title}</span>
                  <span className="block truncate text-[11px] text-white/40">{app.description}</span>
                </span>
                <span className="text-[9px] uppercase tracking-[0.16em] text-white/25">Open</span>
              </button>
            );
          })}
        </div>
        <div className="border-t border-white/10 px-4 py-2 text-[10px] text-white/30">Press Enter to open the first result · Esc to close</div>
      </section>
    </div>
  );
}
