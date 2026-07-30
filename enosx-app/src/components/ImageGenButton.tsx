/*
 * ENOSX AI — ImageGenButton
 * A floating button that toggles image generation mode in the chat.
 * When active, the next message sent will be interpreted as an image prompt.
 */

import { motion, AnimatePresence } from "framer-motion";
import { Image, Loader2 } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface ImageGenButtonProps {
  isActive: boolean;
  onToggle: () => void;
  isGenerating: boolean;
}

export default function ImageGenButton({
  isActive,
  onToggle,
  isGenerating,
}: ImageGenButtonProps) {
  const { config } = useTheme();

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      disabled={isGenerating}
      className="relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200"
      style={{
        background: isActive
          ? `rgba(${config.accentRgb}, 0.15)`
          : "rgba(255,255,255,0.04)",
        border: isActive
          ? `1px solid rgba(${config.accentRgb}, 0.4)`
          : "1px solid rgba(255,255,255,0.07)",
        color: isActive ? config.accent : config.textMuted,
        cursor: isGenerating ? "not-allowed" : "pointer",
        opacity: isGenerating ? 0.5 : 1,
      }}
      title={isGenerating ? "Generating image..." : isActive ? "Image mode OFF" : "Image mode ON — next message will generate an image"}
    >
      {isGenerating ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <Image size={16} />
      )}

      {/* Active indicator dot */}
      <AnimatePresence>
        {isActive && !isGenerating && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full"
            style={{
              background: config.accent,
              boxShadow: `0 0 8px rgba(${config.accentRgb}, 0.6)`,
            }}
          />
        )}
      </AnimatePresence>
    </motion.button>
  );
}
