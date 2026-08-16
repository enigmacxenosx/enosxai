import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Maximize2, Minimize2, Minus, X } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useWallpaper } from "@/contexts/WallpaperContext";
import { getComputerApp } from "@/lib/computerApps";
import type { ComputerWindowState } from "@/contexts/ComputerWorkspaceContext";

interface ComputerWindowProps {
  windowState: ComputerWindowState;
  isActive: boolean;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onRestore: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (width: number, height: number) => void;
  children: ReactNode;
}

interface InteractionState {
  mode: "drag" | "resize";
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  originWidth: number;
  originHeight: number;
}

export function ComputerWindow({
  windowState,
  isActive,
  onFocus,
  onClose,
  onMinimize,
  onMaximize,
  onRestore,
  onMove,
  onResize,
  children,
}: ComputerWindowProps) {
  const { config } = useTheme();
  const { settings } = useWallpaper();
  const app = getComputerApp(windowState.appId);
  const interactionRef = useRef<InteractionState | null>(null);
  const isMaximized = windowState.lifecycle === "maximized";

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const interaction = interactionRef.current;
      if (!interaction || isMaximized) return;
      const deltaX = event.clientX - interaction.startX;
      const deltaY = event.clientY - interaction.startY;
      if (interaction.mode === "drag") {
        const maxX = Math.max(12, window.innerWidth - windowState.width - 12);
        const maxY = Math.max(12, window.innerHeight - windowState.height - 92);
        onMove(
          Math.min(Math.max(12, interaction.originX + deltaX), maxX),
          Math.min(Math.max(12, interaction.originY + deltaY), maxY),
        );
      } else {
        onResize(
          Math.min(Math.max(windowState.minWidth, interaction.originWidth + deltaX), window.innerWidth - windowState.x - 12),
          Math.min(Math.max(windowState.minHeight, interaction.originHeight + deltaY), window.innerHeight - windowState.y - 92),
        );
      }
    };
    const handlePointerUp = () => {
      interactionRef.current = null;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isMaximized, onMove, onResize, windowState.height, windowState.minHeight, windowState.minWidth, windowState.width, windowState.x, windowState.y]);

  const beginDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isMaximized || event.button !== 0) return;
    onFocus();
    interactionRef.current = {
      mode: "drag",
      startX: event.clientX,
      startY: event.clientY,
      originX: windowState.x,
      originY: windowState.y,
      originWidth: windowState.width,
      originHeight: windowState.height,
    };
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";
  };

  const beginResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (isMaximized || event.button !== 0) return;
    event.stopPropagation();
    onFocus();
    interactionRef.current = {
      mode: "resize",
      startX: event.clientX,
      startY: event.clientY,
      originX: windowState.x,
      originY: windowState.y,
      originWidth: windowState.width,
      originHeight: windowState.height,
    };
    document.body.style.userSelect = "none";
    document.body.style.cursor = "nwse-resize";
  };

  const windowStyle = isMaximized
    ? { left: 12, top: 12, right: 12, bottom: 12, width: "auto", height: "auto" }
    : { left: windowState.x, top: windowState.y, width: windowState.width, height: windowState.height };

  return (
    <section
      aria-label={windowState.title}
      className="absolute flex flex-col overflow-hidden rounded-2xl border shadow-2xl transition-[box-shadow,opacity] duration-200"
      style={{
        ...windowStyle,
        zIndex: windowState.zIndex,
        opacity: windowState.lifecycle === "minimized" ? 0 : 1,
        pointerEvents: windowState.lifecycle === "minimized" ? "none" : "auto",
        borderColor: isActive ? `${app.accent}99` : `rgba(${config.accentRgb}, 0.18)`,
        background: `linear-gradient(145deg, rgba(20, 22, 32, ${Math.min(0.96, settings.panelOpacity + 0.1)}), rgba(8, 10, 16, ${Math.min(0.98, settings.panelOpacity + 0.03)}))`,
        backdropFilter: `blur(${Math.max(settings.blurAmount, 14)}px)`,
        boxShadow: isActive
          ? `0 20px 60px rgba(0,0,0,0.42), 0 0 0 1px ${app.accent}33, 0 0 36px ${app.accent}18`
          : "0 16px 48px rgba(0,0,0,0.3)",
      }}
      onPointerDown={onFocus}
    >
      <div
        className="flex h-11 flex-shrink-0 items-center gap-3 border-b px-3"
        style={{ borderColor: `${app.accent}24`, background: `linear-gradient(90deg, ${app.accent}12, transparent 70%)` }}
        onPointerDown={beginDrag}
        onDoubleClick={isMaximized ? onRestore : onMaximize}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ color: app.accent, background: `${app.accent}1a` }}>
          <app.icon size={14} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold tracking-wide text-white/90">{windowState.title}</p>
          <p className="truncate text-[9px] uppercase tracking-[0.18em] text-white/35">{isActive ? "Focused window" : "Background window"}</p>
        </div>
        <div className="flex items-center gap-1" onPointerDown={(event) => event.stopPropagation()}>
          <button type="button" aria-label={`Minimize ${windowState.title}`} title="Minimize" onClick={onMinimize} className="rounded-md p-1.5 text-white/45 transition hover:bg-white/10 hover:text-white">
            <Minus size={13} />
          </button>
          <button type="button" aria-label={`${isMaximized ? "Restore" : "Maximize"} ${windowState.title}`} title={isMaximized ? "Restore" : "Maximize"} onClick={isMaximized ? onRestore : onMaximize} className="rounded-md p-1.5 text-white/45 transition hover:bg-white/10 hover:text-white">
            {isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
          <button type="button" aria-label={`Close ${windowState.title}`} title="Close" onClick={onClose} className="rounded-md p-1.5 text-white/45 transition hover:bg-rose-500/20 hover:text-rose-200">
            <X size={13} />
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      {!isMaximized && (
        <button
          type="button"
          aria-label={`Resize ${windowState.title}`}
          title="Resize window"
          onPointerDown={beginResize}
          className="absolute bottom-1 right-1 h-5 w-5 cursor-nwse-resize rounded-br-xl opacity-50 transition hover:opacity-100"
          style={{ background: `linear-gradient(135deg, transparent 48%, ${app.accent}99 50%, transparent 56%, ${app.accent}66 62%, transparent 68%)` }}
        />
      )}
    </section>
  );
}
