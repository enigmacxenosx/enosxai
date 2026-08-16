/*
 * ENOSX AI — ChatSplitLayout
 * Manus-style split view used directly from the Chat page: ENOSX AI chat on
 * the left, the live Enosx Computer workspace on the right.
 * The layout is resizable. The computer surface shares the workspace context
 * provided by the page, so the AI's live coding actions can drive its windows.
 */
import { useState } from "react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import WorkspaceComputerPane from "@/components/WorkspaceComputerPane";

const SPLIT_SIZE_KEY = "enosx-chat-split-sizes-v1";

function loadSizes(): [number, number] | null {
  try {
    const raw = localStorage.getItem(SPLIT_SIZE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 2 && typeof parsed[0] === "number") {
        return [parsed[0], 100 - parsed[0]];
      }
    }
  } catch {
    /* fall through */
  }
  return null;
}

export default function ChatSplitLayout({ children }: { children: React.ReactNode }) {
  const [sizes, setSizes] = useState<[number, number]>(() => loadSizes() ?? [55, 45]);

  const handleResize = (size: number) => {
    const next: [number, number] = [size, 100 - size];
    setSizes(next);
    try {
      localStorage.setItem(SPLIT_SIZE_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden text-white">
      <ResizablePanelGroup direction="horizontal" className="h-full w-full">
        <ResizablePanel defaultSize={sizes[0]} minSize={34} onResize={handleResize}>
          <div className="flex h-full w-full flex-col">
            <div className="flex h-full w-full flex-col overflow-hidden">
              {children}
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle
          className="!w-1 !bg-transparent hover:!bg-transparent data-[panel-group-direction=horizontal]:after:bg-white/5 data-[panel-group-direction=horizontal]:after:transition-colors data-[panel-group-direction=horizontal]:hover:after:bg-cyan-400/40 data-[panel-group-direction=horizontal]:after:rounded-full data-[panel-group-direction=horizontal]:after:w-1 data-[panel-group-direction=horizontal]:after:absolute data-[panel-group-direction=horizontal]:after:inset-y-0 data-[panel-group-direction=horizontal]:after:left-0"
          withHandle
        />
        <ResizablePanel defaultSize={sizes[1]} minSize={30}>
          <WorkspaceComputerPane />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
