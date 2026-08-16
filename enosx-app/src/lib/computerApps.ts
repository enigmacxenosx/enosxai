import type { LucideIcon } from "lucide-react";
import {
  Bot,
  FolderOpen,
  Github,
  Globe2,
  Settings2,
  Terminal as TerminalIcon,
} from "lucide-react";

export type ComputerAppId =
  | "assistant"
  | "browser"
  | "github"
  | "files"
  | "terminal"
  | "settings";

export interface ComputerAppDefinition {
  id: ComputerAppId;
  title: string;
  shortTitle: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  capabilities: string[];
  defaultGeometry: {
    x: number;
    y: number;
    width: number;
    height: number;
    minWidth: number;
    minHeight: number;
  };
}

export const COMPUTER_APPS: ComputerAppDefinition[] = [
  {
    id: "assistant",
    title: "Enosx Assistant",
    shortTitle: "Assistant",
    description: "Workspace-aware guidance and a quick path back to Chat.",
    icon: Bot,
    accent: "#73e5ff",
    capabilities: ["Ask for guidance", "Open workspace apps", "Return to Chat"],
    defaultGeometry: { x: 34, y: 34, width: 380, height: 460, minWidth: 310, minHeight: 300 },
  },
  {
    id: "browser",
    title: "Browser Tools",
    shortTitle: "Browser",
    description: "Read public webpages and inspect their content safely.",
    icon: Globe2,
    accent: "#a78bfa",
    capabilities: ["Read webpages", "Extract links", "Review results before actions"],
    defaultGeometry: { x: 440, y: 58, width: 470, height: 390, minWidth: 340, minHeight: 280 },
  },
  {
    id: "github",
    title: "GitHub Workspace",
    shortTitle: "GitHub",
    description: "Keep repository work visible without duplicating GitHub controls.",
    icon: Github,
    accent: "#f0f4ff",
    capabilities: ["Open the existing GitHub panel", "Review repository work", "Push with approval"],
    defaultGeometry: { x: 120, y: 220, width: 440, height: 360, minWidth: 340, minHeight: 270 },
  },
  {
    id: "files",
    title: "Files",
    shortTitle: "Files",
    description: "Use files selected by you as context for the assistant.",
    icon: FolderOpen,
    accent: "#f5c76b",
    capabilities: ["Select local files", "Review file names", "Keep filesystem access explicit"],
    defaultGeometry: { x: 620, y: 240, width: 390, height: 330, minWidth: 310, minHeight: 250 },
  },
  {
    id: "terminal",
    title: "Script Console",
    shortTitle: "Terminal",
    description: "Create and run Python, shell and batch scripts from ENOSX AI.",
    icon: TerminalIcon,
    accent: "#34d399",
    capabilities: ["Run Python for real (WebAssembly)", "Simulated shell scripts", "Simulated Windows batch scripts"],
    defaultGeometry: { x: 500, y: 100, width: 520, height: 460, minWidth: 360, minHeight: 320 },
  },
  {
    id: "settings",
    title: "Workspace Settings",
    shortTitle: "Settings",
    description: "Reset the layout and review the web workspace boundary.",
    icon: Settings2,
    accent: "#ff8da1",
    capabilities: ["Reset window layout", "Review capability limits", "Open background settings"],
    defaultGeometry: { x: 270, y: 120, width: 420, height: 350, minWidth: 320, minHeight: 260 },
  },
];

export function getComputerApp(appId: ComputerAppId): ComputerAppDefinition {
  return COMPUTER_APPS.find((app) => app.id === appId) ?? COMPUTER_APPS[0];
}
