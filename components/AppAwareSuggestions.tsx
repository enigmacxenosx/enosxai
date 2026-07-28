/*
 * ENOSX AI — AppAwareSuggestions
 * Displays app-specific suggestion chips and action tiles
 * Features: dynamic suggestions based on active window, glassmorphism, smooth animations
 */

import { motion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { useActiveWindow } from "@/contexts/WindowContext";
import { useContextAwareMessages } from "@/hooks/useContextAwareMessages";

interface AppAwareSuggestionsProps {
  onSuggestionClick: (suggestion: string) => void;
}

export default function AppAwareSuggestions({ onSuggestionClick }: AppAwareSuggestionsProps) {
  const { config } = useTheme();
  const { activeWindow } = useActiveWindow();
  const { getAppSpecificSuggestions } = useContextAwareMessages();

  if (!activeWindow.isDetected || activeWindow.appType === "unknown") {
    return null;
  }

  const suggestions = getAppSpecificSuggestions(activeWindow.appType);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full space-y-2 mb-4"
    >
      {/* Header */}
      <p
        className="text-xs font-semibold px-1"
        style={{ color: config.textMuted, letterSpacing: "0.04em" }}
      >
        SUGGESTIONS FOR {activeWindow.appName.toUpperCase()}
      </p>

      {/* Suggestion Chips */}
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05, duration: 0.2 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSuggestionClick(suggestion)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
            style={{
              background: `rgba(${config.accentRgb}, 0.1)`,
              border: `1px solid rgba(${config.accentRgb}, 0.2)`,
              color: config.text,
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              cursor: "pointer",
            }}
          >
            {suggestion}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
