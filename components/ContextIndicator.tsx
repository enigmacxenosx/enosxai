/*
 * ENOSX AI — ContextIndicator
 * Displays the currently active application and provides context awareness feedback
 * Features: app icon, real-time detection, glassmorphism badge
 */

import { motion } from "framer-motion";
import {
  Code2,
  Chrome,
  Terminal,
  Folder,
  MessageSquare,
  Palette,
  Database,
  Image,
  Zap,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useActiveWindow, type AppType } from "@/contexts/WindowContext";

const APP_ICONS: Record<AppType, React.ReactNode> = {
  vscode: <Code2 size={14} />,
  chrome: <Chrome size={14} />,
  firefox: <Chrome size={14} />,
  edge: <Chrome size={14} />,
  terminal: <Terminal size={14} />,
  explorer: <Folder size={14} />,
  notion: <Database size={14} />,
  slack: <MessageSquare size={14} />,
  discord: <MessageSquare size={14} />,
  figma: <Palette size={14} />,
  photoshop: <Image size={14} />,
  unknown: <Zap size={14} />,
};

const APP_COLORS: Record<AppType, string> = {
  vscode: "#007ACC",
  chrome: "#4285F4",
  firefox: "#FF7139",
  edge: "#0078D4",
  terminal: "#00A4EF",
  explorer: "#0078D4",
  notion: "#000000",
  slack: "#E01E5A",
  discord: "#5865F2",
  figma: "#F24E1E",
  photoshop: "#31A8FF",
  unknown: "#DC143C",
};

export default function ContextIndicator() {
  const { config } = useTheme();
  const { activeWindow } = useActiveWindow();

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full"
      style={{
        background: `rgba(${config.accentRgb}, 0.08)`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: `1px solid rgba(${config.accentRgb}, 0.15)`,
      }}
    >
      {/* App Icon */}
      <motion.div
        animate={{
          scale: activeWindow.isDetected ? 1.1 : 1,
          opacity: activeWindow.isDetected ? 1 : 0.5,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        style={{
          color: activeWindow.isDetected
            ? APP_COLORS[activeWindow.appType]
            : config.textMuted,
        }}
      >
        {APP_ICONS[activeWindow.appType]}
      </motion.div>

      {/* App Name */}
      <span
        className="text-xs font-medium whitespace-nowrap"
        style={{
          color: activeWindow.isDetected ? config.text : config.textMuted,
          letterSpacing: "0.02em",
        }}
      >
        {activeWindow.isDetected ? activeWindow.appName : "Detecting..."}
      </span>

      {/* Detection Pulse */}
      {activeWindow.isDetected && (
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: APP_COLORS[activeWindow.appType],
            boxShadow: `0 0 6px ${APP_COLORS[activeWindow.appType]}`,
          }}
        />
      )}
    </motion.div>
  );
}
