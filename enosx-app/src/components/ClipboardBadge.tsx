/*
 * ENOSX AI — ClipboardBadge
 * A subtle, glowing badge that appears in the bottom-right corner of the app
 * whenever the user copies text. Clicking it sends the copied text to the AI
 * for instant summarization.
 *
 * States:
 *   idle     → hidden
 *   visible  → glowing Enosx icon + "Summarize" label
 *   loading  → spinner while AI processes
 */
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Loader2 } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface ClipboardBadgeProps {
  copiedText: string;
  isVisible: boolean;
  onDismiss: () => void;
  onConsume: () => void;
  onSummarize: (text: string) => Promise<void>;
}

export default function ClipboardBadge({
  copiedText,
  isVisible,
  onDismiss,
  onConsume,
  onSummarize,
}: ClipboardBadgeProps) {
  const { config } = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  const handleSummarize = useCallback(async () => {
    if (isLoading || !copiedText) return;
    setIsLoading(true);
    try {
      await onSummarize(copiedText);
      onConsume();
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, copiedText, onSummarize, onConsume]);

  // Truncate preview for the tooltip
  const preview =
    copiedText.length > 60 ? copiedText.slice(0, 60) + "…" : copiedText;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="clipboard-badge"
          initial={{ opacity: 0, scale: 0.7, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: 20 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          className="fixed bottom-24 right-5 z-50 flex items-center gap-2 px-3 py-2 rounded-2xl cursor-pointer select-none"
          style={{
            background: `rgba(${config.accentRgb}, 0.12)`,
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            border: `1px solid rgba(${config.accentRgb}, 0.35)`,
            boxShadow: `0 0 18px rgba(${config.accentRgb}, 0.25), 0 4px 20px rgba(0,0,0,0.5)`,
          }}
          title={`Clipboard: "${preview}"`}
          onClick={handleSummarize}
        >
          {/* Animated glow ring */}
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            animate={{
              boxShadow: [
                `0 0 6px rgba(${config.accentRgb}, 0.3)`,
                `0 0 18px rgba(${config.accentRgb}, 0.6)`,
                `0 0 6px rgba(${config.accentRgb}, 0.3)`,
              ],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Icon */}
          <motion.div
            animate={
              isLoading
                ? { rotate: 360 }
                : { scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }
            }
            transition={
              isLoading
                ? { duration: 0.8, repeat: Infinity, ease: "linear" }
                : { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
            }
            style={{ color: config.accent }}
          >
            {isLoading ? (
              <Loader2 size={16} />
            ) : (
              <Sparkles size={16} />
            )}
          </motion.div>

          {/* Label */}
          <span
            className="text-xs font-semibold whitespace-nowrap"
            style={{ color: config.text, letterSpacing: "0.04em" }}
          >
            {isLoading ? "Summarizing…" : "Enosx · Summarize"}
          </span>

          {/* Dismiss button */}
          {!isLoading && (
            <motion.button
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="ml-1 rounded-full p-0.5"
              style={{
                color: config.textMuted,
                background: `rgba(${config.accentRgb}, 0.1)`,
              }}
              aria-label="Dismiss clipboard badge"
            >
              <X size={11} />
            </motion.button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
