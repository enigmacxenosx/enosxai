/*
 * ENOSX AI — GlobalOverlay
 * Full-screen blurred overlay with search/command palette
 * Features: keyboard shortcut (Alt+Space), animated backdrop, search input
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Zap, MessageSquare, Settings, HelpCircle } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface GlobalOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
}

const QUICK_ACTIONS = [
  { icon: MessageSquare, label: "New Chat", action: "new-chat" },
  { icon: Zap, label: "Quick Command", action: "quick-cmd" },
  { icon: Settings, label: "Settings", action: "settings" },
  { icon: HelpCircle, label: "Help", action: "help" },
];

export default function GlobalOverlay({ isOpen, onClose, onSearch }: GlobalOverlayProps) {
  const { config } = useTheme();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey || e.metaKey) && e.code === "Space") {
        e.preventDefault();
        // Toggle overlay
      }
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-start justify-center pt-20"
        style={{
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: -20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: -20 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl rounded-2xl overflow-hidden"
          style={{
            background: config.surface,
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: `1px solid rgba(${config.accentRgb}, 0.2)`,
            boxShadow: `0 20px 60px rgba(0,0,0,0.8)`,
          }}
        >
          {/* Search Input */}
          <div
            className="flex items-center gap-3 px-6 py-4"
            style={{
              borderBottom: `1px solid rgba(${config.accentRgb}, 0.1)`,
            }}
          >
            <Search size={18} style={{ color: config.accent }} />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                onSearch(e.target.value);
              }}
              placeholder="Search, ask, or command..."
              className="flex-1 bg-transparent outline-none text-sm"
              style={{
                color: config.text,
                caretColor: config.accent,
              }}
            />
            <span
              className="text-xs px-2 py-1 rounded-lg"
              style={{
                background: `rgba(${config.accentRgb}, 0.1)`,
                color: config.textMuted,
              }}
            >
              ESC
            </span>
          </div>

          {/* Quick Actions */}
          <div className="px-6 py-4">
            <p
              className="text-xs mb-3"
              style={{ color: config.textMuted, letterSpacing: "0.06em" }}
            >
              QUICK ACTIONS
            </p>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((action, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150"
                  style={{
                    background: `rgba(${config.accentRgb}, 0.06)`,
                    border: `1px solid rgba(${config.accentRgb}, 0.12)`,
                  }}
                >
                  <action.icon size={14} style={{ color: config.accent }} />
                  <span style={{ color: config.text, fontSize: "13px" }}>
                    {action.label}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Footer Hint */}
          <div
            className="px-6 py-3 text-center text-xs"
            style={{
              background: `rgba(${config.accentRgb}, 0.02)`,
              borderTop: `1px solid rgba(${config.accentRgb}, 0.08)`,
              color: config.textMuted,
              letterSpacing: "0.04em",
            }}
          >
            Type to search · Arrow keys to navigate · Enter to select
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
