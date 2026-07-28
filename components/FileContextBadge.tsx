/*
 * ENOSX AI — FileContextBadge
 * Displays loaded file information with clear button
 * Features: glassmorphism, file icon, size info, smooth animations
 */

import { motion } from "framer-motion";
import { File, X } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import type { FileContext } from "@/hooks/useFileContext";

interface FileContextBadgeProps {
  fileContext: FileContext;
  onClear: () => void;
}

export default function FileContextBadge({ fileContext, onClear }: FileContextBadgeProps) {
  const { config } = useTheme();

  if (!fileContext.isLoaded) return null;

  const sizeInKB = (fileContext.fileSize / 1024).toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-2 px-3 py-2 rounded-lg"
      style={{
        background: `rgba(${config.accentRgb}, 0.1)`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: `1px solid rgba(${config.accentRgb}, 0.2)`,
      }}
    >
      {/* File Icon */}
      <File size={14} style={{ color: config.accent, flexShrink: 0 }} />

      {/* File Info */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <p
          className="text-xs font-semibold truncate"
          style={{ color: config.text }}
        >
          {fileContext.fileName}
        </p>
        <p
          className="text-xs"
          style={{ color: config.textMuted }}
        >
          {sizeInKB}KB • {fileContext.fileType}
        </p>
      </div>

      {/* Clear Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onClear}
        className="ml-auto p-1 rounded-md transition-all"
        style={{
          background: `rgba(${config.accentRgb}, 0.1)`,
          color: config.accent,
        }}
        title="Clear file context"
      >
        <X size={12} />
      </motion.button>
    </motion.div>
  );
}
