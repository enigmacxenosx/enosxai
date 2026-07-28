/*
 * ENOSX AI — CompactMode
 * Draggable floating window that snaps to screen edges
 * Features: drag constraints, snap-to-edge, minimize/maximize, always-on-top
 */

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { X, Maximize2, Minimize2, GripVertical } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface CompactModeProps {
  isOpen: boolean;
  onClose: () => void;
  onMaximize: () => void;
  children: React.ReactNode;
}

export default function CompactMode({
  isOpen,
  onClose,
  onMaximize,
  children,
}: CompactModeProps) {
  const { config } = useTheme();
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 100 });
  const dragRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handleDragEnd = (_: unknown, info: any) => {
    const x = info.point.x;
    const y = info.point.y;
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Snap to edges
    const threshold = 50;
    let snappedX = x;
    let snappedY = y;

    if (x < threshold) snappedX = 0;
    if (x > w - 400 - threshold) snappedX = w - 400;
    if (y < threshold) snappedY = 0;
    if (y > h - 300 - threshold) snappedY = h - 300;

    setPosition({ x: snappedX, y: snappedY });
  };

  return (
    <motion.div
      ref={dragRef}
      drag
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed z-50 rounded-2xl overflow-hidden"
      style={{
        left: position.x,
        top: position.y,
        width: 400,
        height: 500,
        background: config.surface,
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: `1px solid rgba(${config.accentRgb}, 0.2)`,
        boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(${config.accentRgb}, 0.1)`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-grab active:cursor-grabbing"
        style={{
          background: `rgba(${config.accentRgb}, 0.05)`,
          borderBottom: `1px solid rgba(${config.accentRgb}, 0.1)`,
        }}
      >
        <div className="flex items-center gap-2">
          <GripVertical size={14} style={{ color: config.textMuted }} />
          <span
            className="text-xs font-semibold"
            style={{ color: config.text, letterSpacing: "0.04em" }}
          >
            ENOSX COMPACT
          </span>
        </div>
        <div className="flex items-center gap-1">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onMaximize}
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{
              background: `rgba(${config.accentRgb}, 0.1)`,
              border: `1px solid rgba(${config.accentRgb}, 0.2)`,
              color: config.accent,
            }}
            title="Maximize"
          >
            <Maximize2 size={11} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{
              background: "rgba(220,20,60,0.1)",
              border: "1px solid rgba(220,20,60,0.2)",
              color: "#dc143c",
            }}
            title="Close"
          >
            <X size={11} />
          </motion.button>
        </div>
      </div>

      {/* Content */}
      <div className="h-[calc(100%-44px)] overflow-y-auto px-3 py-3">
        {children}
      </div>
    </motion.div>
  );
}
