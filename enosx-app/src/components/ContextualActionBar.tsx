/*
 * ENOSX AI — ContextualActionBar
 * Renders context-sensitive action buttons based on the currently focused app.
 *
 * Rules:
 *   VS Code focused  → "Debug Code" button (red/crimson accent)
 *   Chrome focused   → "Summarize Article" button (blue accent)
 *   Other browsers   → "Summarize Page" button
 *   Terminal         → "Explain Command" button
 *   Figma            → "Review Design" button
 *   Notion           → "Organize Notes" button
 *   (all others)     → no bar rendered
 *
 * Each button fires a pre-filled prompt into the chat when clicked.
 */
import { motion, AnimatePresence } from "framer-motion";
import { Bug, BookOpen, Terminal, Palette, Database, FileText } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useActiveWindow, type AppType } from "@/contexts/WindowContext";

interface ContextAction {
  label: string;
  prompt: string;
  icon: React.ReactNode;
  color: string;
  colorRgb: string;
}

const APP_ACTIONS: Partial<Record<AppType, ContextAction>> = {
  vscode: {
    label: "Debug Code",
    prompt:
      "I'm working in VS Code. Please help me debug the code I'm currently looking at. Identify potential issues, explain what might be going wrong, and suggest fixes.",
    icon: <Bug size={14} />,
    color: "#22c55e",
    colorRgb: "34,197,94",
  },
  chrome: {
    label: "Summarize Article",
    prompt:
      "I'm browsing in Google Chrome. Please summarize the article or page I'm currently reading. Extract the key points, main argument, and any important conclusions.",
    icon: <BookOpen size={14} />,
    color: "#4285F4",
    colorRgb: "66,133,244",
  },
  firefox: {
    label: "Summarize Page",
    prompt:
      "I'm browsing in Firefox. Please summarize the page I'm currently reading. Extract the key points and main takeaways.",
    icon: <BookOpen size={14} />,
    color: "#FF7139",
    colorRgb: "255,113,57",
  },
  edge: {
    label: "Summarize Page",
    prompt:
      "I'm browsing in Microsoft Edge. Please summarize the page I'm currently reading. Extract the key points and main takeaways.",
    icon: <BookOpen size={14} />,
    color: "#0078D4",
    colorRgb: "0,120,212",
  },
  terminal: {
    label: "Explain Command",
    prompt:
      "I'm in the terminal. Please explain the last command I ran, what it does, common flags, and any potential pitfalls.",
    icon: <Terminal size={14} />,
    color: "#00A4EF",
    colorRgb: "0,164,239",
  },
  figma: {
    label: "Review Design",
    prompt:
      "I'm working in Figma. Please review my current design, suggest improvements for usability and aesthetics, and recommend best practices.",
    icon: <Palette size={14} />,
    color: "#F24E1E",
    colorRgb: "242,78,30",
  },
  notion: {
    label: "Organize Notes",
    prompt:
      "I'm working in Notion. Please help me organize my notes more effectively. Suggest a structure, identify gaps, and recommend templates.",
    icon: <Database size={14} />,
    color: "#888888",
    colorRgb: "136,136,136",
  },
  photoshop: {
    label: "Edit Suggestions",
    prompt:
      "I'm working in Adobe Photoshop. Please suggest image editing techniques, layer organization tips, and creative improvements for my current project.",
    icon: <FileText size={14} />,
    color: "#31A8FF",
    colorRgb: "49,168,255",
  },
};

interface ContextualActionBarProps {
  onAction: (prompt: string) => void;
}

export default function ContextualActionBar({ onAction }: ContextualActionBarProps) {
  const { config } = useTheme();
  const { activeWindow } = useActiveWindow();

  const action = APP_ACTIONS[activeWindow.appType];

  // Only render if we have a specific action for this app
  if (!action || !activeWindow.isDetected) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={`ctx-action-${activeWindow.appType}`}
        initial={{ opacity: 0, y: 8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 340, damping: 26 }}
        className="flex items-center gap-2 mb-3"
      >
        {/* Context label */}
        <span
          className="text-xs font-medium"
          style={{ color: config.textMuted, letterSpacing: "0.03em" }}
        >
          Focused on{" "}
          <span style={{ color: action.color }}>{activeWindow.appName}</span>
          {" "}—
        </span>

        {/* Action button */}
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => onAction(action.prompt)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
          style={{
            background: `rgba(${action.colorRgb}, 0.12)`,
            border: `1px solid rgba(${action.colorRgb}, 0.35)`,
            color: action.color,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            boxShadow: `0 0 10px rgba(${action.colorRgb}, 0.15)`,
            cursor: "pointer",
          }}
        >
          {/* Pulsing dot */}
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{
              background: action.color,
              boxShadow: `0 0 5px ${action.color}`,
            }}
          />
          <span style={{ color: action.color }}>{action.icon}</span>
          {action.label}
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
}
