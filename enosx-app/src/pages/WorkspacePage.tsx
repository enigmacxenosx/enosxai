/*
 * ENOSX AI — WorkspacePage
 * Manus-style split-screen: ENOSX AI chat on the left, live Enosx
 * Computer workspace on the right, with a draggable divider.
 * AI [[ACTION: ...]] command blocks execute visibly in the computer pane.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Columns2, Columns3, MonitorSmartphone } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { GlobalLayout } from "@/components/GlobalLayout";
import WorkspaceChatPane from "@/components/WorkspaceChatPane";
import WorkspaceComputerPane from "@/components/WorkspaceComputerPane";
import CommandChainProgress from "@/components/CommandChainProgress";
import { useTheme } from "@/contexts/ThemeContext";
import {
  ComputerWorkspaceProvider,
  useComputerWorkspace,
} from "@/contexts/ComputerWorkspaceContext";
import { useCommandChain } from "@/hooks/useCommandChain";
import { useBrowser } from "@/hooks/useBrowser";
import { useIsMobile } from "@/hooks/use-mobile";
import type { SystemAction } from "@/hooks/useCommandChain";

const SPLIT_STORAGE_KEY = "enosx-workspace-split-v1";

function mapAppId(appName: string): "browser" | "github" | "files" | "settings" | null {
  const normalized = String(appName || "").toLowerCase().trim();
  if (["browser", "chrome", "edge", "globe", "web"].includes(normalized)) return "browser";
  if (["github", "git", "code"].includes(normalized)) return "github";
  if (["files", "file", "folder", "explorer", "notepad", "calculator", "terminal", "vscode"].includes(normalized)) return "files";
  if (["settings", "config"].includes(normalized)) return "settings";
  return null;
}

export default function WorkspacePage() {
  return (
    <GlobalLayout>
      <ComputerWorkspaceProvider>
        <WorkspacePageInner />
      </ComputerWorkspaceProvider>
    </GlobalLayout>
  );
}

function WorkspacePageInner() {
  const [, setLocation] = useLocation();
  const { config } = useTheme();
  const isMobile = useIsMobile();
  const { openWindow, focusWindow } = useComputerWorkspace();
  const { progress, executeChain } = useCommandChain();
  const { readWebpage, extractLinks, lastContent, lastLinks } = useBrowser();
  const [activeTab, setActiveTab] = useState<"split" | "chat" | "computer">("split");
  const [defaultSizes, setDefaultSizes] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(SPLIT_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* use default */ }
    return [40, 60];
  });

  useEffect(() => {
    localStorage.setItem(SPLIT_STORAGE_KEY, JSON.stringify(defaultSizes));
  }, [defaultSizes]);

  // Wire AI command actions into the workspace pane.
  const executeWorkspaceActions = useCallback(
    async (actions: SystemAction[]) => {
      // Execute read/extract actions through the workspace browser hook so
      // results appear directly inside the Browser window, and map app open
      // actions to actual workspace windows.
      const mapped: SystemAction[] = actions.map((action) => {
        if (action.type === "launch_app") {
          const appId = mapAppId(action.app || "");
          if (appId) {
            // Open the real workspace window for this app.
            openWindow(appId);
            toast.success(`Opened ${action.app} in the workspace`);
          } else {
            toast.info(`"${action.app}" isn't a workspace app — opening it in a new browser tab instead.`);
          }
        }
        return action;
      });

      const webActions = mapped.filter((a) => a.type === "read_webpage" || a.type === "extract_links");
      for (const action of webActions) {
        if (!action.url) continue;
        try {
          if (action.type === "read_webpage") {
            await readWebpage(action.url);
            toast.success(`Read ${action.url}`);
          } else {
            await extractLinks(action.url);
            toast.success(`Extracted links from ${action.url}`);
          }
          openWindow("browser");
        } catch (err) {
          toast.error(`Web action failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      const remaining = mapped.filter((a) => a.type !== "read_webpage" && a.type !== "extract_links");
      if (remaining.length > 0) {
        await executeChain(remaining);
      }
    },
    [openWindow, executeChain, readWebpage, extractLinks]
  );

  // Auto-open the browser window when the browser hook produces results.
  useEffect(() => {
    if (lastContent || lastLinks) openWindow("browser");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastContent, lastLinks]);

  const tabs: Array<{ id: "split" | "chat" | "computer"; icon: typeof Columns2; label: string }> = useMemo(
    () => [
      { id: "split", icon: Columns2, label: "Split" },
      { id: "chat", icon: MonitorSmartphone, label: "Chat" },
      { id: "computer", icon: Columns3, label: "Computer" },
    ],
    []
  );

  const chatPane = <WorkspaceChatPane onExecuteAction={executeWorkspaceActions} />;
  const computerPane = <WorkspaceComputerPane />;

  const splitScreen = (
    <ResizablePanelGroup direction="horizontal" className="h-full w-full">
      <ResizablePanel defaultSize={defaultSizes[0]} minSize={28} onResize={(size) => setDefaultSizes([size, 100 - size])}>
        {chatPane}
      </ResizablePanel>
      <ResizableHandle className="!w-1 !bg-transparent hover:!bg-transparent data-[panel-group-direction=horizontal]:after:bg-white/5 data-[panel-group-direction=horizontal]:after:transition-colors data-[panel-group-direction=horizontal]:hover:after:bg-cyan-400/40 data-[panel-group-direction=horizontal]:after:rounded-full data-[panel-group-direction=horizontal]:after:w-1 data-[panel-group-direction=horizontal]:after:absolute data-[panel-group-direction=horizontal]:after:inset-y-0 data-[panel-group-direction=horizontal]:after:left-0" withHandle />
      <ResizablePanel defaultSize={defaultSizes[1]} minSize={28}>
        {computerPane}
      </ResizablePanel>
    </ResizablePanelGroup>
  );

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden text-white">
        {/* Floating top bar: back + view switcher */}
        <div className="absolute left-0 right-0 top-0 z-[1100] flex items-center justify-between px-2 pt-2 pointer-events-none">
          <button
            type="button"
            onClick={() => setLocation("/")}
            className="pointer-events-auto flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition hover:bg-white/10"
            style={{ borderColor: `rgba(${config.accentRgb},0.25)`, background: `rgba(6,8,14,0.65)`, backdropFilter: "blur(14px)" }}
          >
            <ArrowLeft size={13} /> Chat
          </button>
          <div className="pointer-events-auto flex items-center gap-1 rounded-full border p-1" style={{ borderColor: `rgba(${config.accentRgb},0.25)`, background: `rgba(6,8,14,0.65)`, backdropFilter: "blur(14px)" }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition"
                style={
                  activeTab === tab.id
                    ? { background: config.accent, color: "#040811" }
                    : { color: "rgba(255,255,255,0.65)" }
                }
              >
                <tab.icon size={12} /> {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-full w-full">
          {activeTab === "split" && !isMobile && splitScreen}
          {activeTab === "split" && isMobile && (
            <div className="h-full w-full">
              <WorkspaceChatPane onExecuteAction={executeWorkspaceActions} />
              <button
                type="button"
                onClick={() => setActiveTab("computer")}
                className="absolute bottom-20 right-4 z-50 rounded-full border px-4 py-2 text-xs font-semibold shadow-lg"
                style={{ borderColor: `rgba(${config.accentRgb},0.3)`, background: `rgba(6,8,14,0.85)`, color: config.accent }}
              >
                Show computer →
              </button>
            </div>
          )}
          {activeTab === "chat" && <WorkspaceChatPane onExecuteAction={executeWorkspaceActions} />}
          {activeTab === "computer" && computerPane}
        </div>

        <CommandChainProgress progress={progress} />
      </div>
  );
}
