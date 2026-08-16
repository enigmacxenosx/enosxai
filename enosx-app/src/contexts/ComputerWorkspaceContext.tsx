import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import {
  COMPUTER_APPS,
  getComputerApp,
  type ComputerAppId,
} from "@/lib/computerApps";

export type WindowLifecycle = "open" | "minimized" | "maximized";

export interface ComputerWindowState {
  id: string;
  appId: ComputerAppId;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  zIndex: number;
  lifecycle: WindowLifecycle;
}

interface WorkspaceState {
  windows: ComputerWindowState[];
  activeWindowId: string | null;
  nextZIndex: number;
  isLauncherOpen: boolean;
}

type WorkspaceAction =
  | { type: "open"; appId: ComputerAppId }
  | { type: "focus"; id: string }
  | { type: "close"; id: string }
  | { type: "minimize"; id: string }
  | { type: "maximize"; id: string }
  | { type: "restore"; id: string }
  | { type: "move"; id: string; x: number; y: number }
  | { type: "resize"; id: string; width: number; height: number }
  | { type: "launcher"; open: boolean }
  | { type: "reset" };

const STORAGE_KEY = "enosx-computer-workspace-v1";
const DEFAULT_OPEN_APPS: ComputerAppId[] = ["assistant", "browser"];

function makeWindow(appId: ComputerAppId, index: number, zIndex: number): ComputerWindowState {
  const app = getComputerApp(appId);
  return {
    id: `${appId}-${index + 1}`,
    appId,
    title: app.title,
    ...app.defaultGeometry,
    zIndex,
    lifecycle: "open",
  };
}

function initialState(): WorkspaceState {
  return {
    windows: DEFAULT_OPEN_APPS.map((appId, index) => makeWindow(appId, index, index + 1)),
    activeWindowId: "browser-2",
    nextZIndex: DEFAULT_OPEN_APPS.length + 1,
    isLauncherOpen: false,
  };
}

function clampWindow(window: ComputerWindowState, viewportWidth: number, viewportHeight: number): ComputerWindowState {
  const maxWidth = Math.max(window.minWidth, viewportWidth - 24);
  const maxHeight = Math.max(window.minHeight, viewportHeight - 84);
  const width = Math.min(Math.max(window.width, window.minWidth), maxWidth);
  const height = Math.min(Math.max(window.height, window.minHeight), maxHeight);
  const x = Math.min(Math.max(window.x, 12), Math.max(12, viewportWidth - width - 12));
  const y = Math.min(Math.max(window.y, 12), Math.max(12, viewportHeight - height - 12));
  return { ...window, x, y, width, height };
}

function reducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case "open": {
      const existing = state.windows.find((window) => window.appId === action.appId);
      if (existing) {
        const zIndex = state.nextZIndex;
        return {
          ...state,
          activeWindowId: existing.id,
          nextZIndex: zIndex + 1,
          isLauncherOpen: false,
          windows: state.windows.map((window) =>
            window.id === existing.id
              ? { ...window, lifecycle: "open", zIndex }
              : window,
          ),
        };
      }
      const window = makeWindow(action.appId, state.windows.length, state.nextZIndex);
      return {
        ...state,
        windows: [...state.windows, window],
        activeWindowId: window.id,
        nextZIndex: state.nextZIndex + 1,
        isLauncherOpen: false,
      };
    }
    case "focus": {
      const target = state.windows.find((window) => window.id === action.id);
      if (!target) return state;
      const zIndex = state.nextZIndex;
      return {
        ...state,
        activeWindowId: target.id,
        nextZIndex: zIndex + 1,
        windows: state.windows.map((window) =>
          window.id === target.id
            ? { ...window, lifecycle: "open", zIndex }
            : window,
        ),
      };
    }
    case "close": {
      const remaining = state.windows.filter((window) => window.id !== action.id);
      const nextActive = remaining
        .filter((window) => window.lifecycle !== "minimized")
        .sort((a, b) => b.zIndex - a.zIndex)[0]?.id ?? null;
      return { ...state, windows: remaining, activeWindowId: nextActive };
    }
    case "minimize": {
      const remainingVisible = state.windows
        .filter((window) => window.id !== action.id && window.lifecycle !== "minimized")
        .sort((a, b) => b.zIndex - a.zIndex);
      return {
        ...state,
        activeWindowId: remainingVisible[0]?.id ?? null,
        windows: state.windows.map((window) =>
          window.id === action.id ? { ...window, lifecycle: "minimized" } : window,
        ),
      };
    }
    case "maximize":
      return {
        ...state,
        activeWindowId: action.id,
        windows: state.windows.map((window) =>
          window.id === action.id ? { ...window, lifecycle: "maximized", zIndex: state.nextZIndex } : window,
        ),
        nextZIndex: state.nextZIndex + 1,
      };
    case "restore":
      return {
        ...state,
        activeWindowId: action.id,
        windows: state.windows.map((window) =>
          window.id === action.id
            ? { ...window, lifecycle: "open", zIndex: state.nextZIndex }
            : window,
        ),
        nextZIndex: state.nextZIndex + 1,
      };
    case "move":
      return {
        ...state,
        windows: state.windows.map((window) =>
          window.id === action.id ? { ...window, x: action.x, y: action.y } : window,
        ),
      };
    case "resize":
      return {
        ...state,
        windows: state.windows.map((window) =>
          window.id === action.id
            ? { ...window, width: Math.max(window.minWidth, action.width), height: Math.max(window.minHeight, action.height) }
            : window,
        ),
      };
    case "launcher":
      return { ...state, isLauncherOpen: action.open };
    case "reset":
      return initialState();
    default:
      return state;
  }
}

interface ComputerWorkspaceContextValue extends WorkspaceState {
  openWindow: (appId: ComputerAppId) => void;
  focusWindow: (id: string) => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  resizeWindow: (id: string, width: number, height: number) => void;
  setLauncherOpen: (open: boolean) => void;
  resetLayout: () => void;
  clampToViewport: (viewportWidth: number, viewportHeight: number) => void;
}

const ComputerWorkspaceContext = createContext<ComputerWorkspaceContextValue | null>(null);

function loadState(): WorkspaceState {
  if (typeof window === "undefined") return initialState();
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return initialState();
    const parsed = JSON.parse(saved) as WorkspaceState;
    if (!Array.isArray(parsed.windows)) return initialState();
    return {
      ...initialState(),
      ...parsed,
      windows: parsed.windows.map((window) => ({
        ...window,
        ...getComputerApp(window.appId).defaultGeometry,
        lifecycle: window.lifecycle ?? "open",
      })),
    };
  } catch {
    return initialState();
  }
}

export function ComputerWorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const openWindow = useCallback((appId: ComputerAppId) => dispatch({ type: "open", appId }), []);
  const focusWindow = useCallback((id: string) => dispatch({ type: "focus", id }), []);
  const closeWindow = useCallback((id: string) => dispatch({ type: "close", id }), []);
  const minimizeWindow = useCallback((id: string) => dispatch({ type: "minimize", id }), []);
  const maximizeWindow = useCallback((id: string) => dispatch({ type: "maximize", id }), []);
  const restoreWindow = useCallback((id: string) => dispatch({ type: "restore", id }), []);
  const moveWindow = useCallback((id: string, x: number, y: number) => dispatch({ type: "move", id, x, y }), []);
  const resizeWindow = useCallback((id: string, width: number, height: number) => dispatch({ type: "resize", id, width, height }), []);
  const setLauncherOpen = useCallback((open: boolean) => dispatch({ type: "launcher", open }), []);
  const resetLayout = useCallback(() => dispatch({ type: "reset" }), []);

  const clampToViewport = useCallback((viewportWidth: number, viewportHeight: number) => {
    state.windows.forEach((window) => {
      const clamped = clampWindow(window, viewportWidth, viewportHeight);
      if (clamped.x !== window.x || clamped.y !== window.y || clamped.width !== window.width || clamped.height !== window.height) {
        dispatch({ type: "move", id: window.id, x: clamped.x, y: clamped.y });
        dispatch({ type: "resize", id: window.id, width: clamped.width, height: clamped.height });
      }
    });
  }, [state.windows]);

  const value = useMemo(() => ({
    ...state,
    openWindow,
    focusWindow,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    restoreWindow,
    moveWindow,
    resizeWindow,
    setLauncherOpen,
    resetLayout,
    clampToViewport,
  }), [state, openWindow, focusWindow, closeWindow, minimizeWindow, maximizeWindow, restoreWindow, moveWindow, resizeWindow, setLauncherOpen, resetLayout, clampToViewport]);

  return <ComputerWorkspaceContext.Provider value={value}>{children}</ComputerWorkspaceContext.Provider>;
}

export function useComputerWorkspace() {
  const context = useContext(ComputerWorkspaceContext);
  if (!context) throw new Error("useComputerWorkspace must be used within ComputerWorkspaceProvider");
  return context;
}

export { COMPUTER_APPS };
