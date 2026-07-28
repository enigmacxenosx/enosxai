/*
 * ENOSX AI — ActionTile
 * Interactive bento-style card for system actions and stats
 * Features: glassmorphism, real-time data, toggles, graphs
 */

import { motion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { LucideIcon } from "lucide-react";

export interface ActionTileData {
  id: string;
  title: string;
  icon: LucideIcon;
  value?: string | number;
  unit?: string;
  description?: string;
  type: "stat" | "toggle" | "action" | "graph";
  isActive?: boolean;
  onToggle?: () => void;
  onClick?: () => void;
  color?: string;
  size?: "small" | "medium" | "large";
}

interface ActionTileProps {
  data: ActionTileData;
}

export default function ActionTile({ data }: ActionTileProps) {
  const { config } = useTheme();
  const Icon = data.icon;
  const color = data.color || config.accent;
  const size = data.size || "medium";

  const sizeClasses = {
    small: "p-3 col-span-1 row-span-1",
    medium: "p-4 col-span-1 row-span-1",
    large: "p-6 col-span-2 row-span-2",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={data.onClick}
      className={`${sizeClasses[size]} rounded-2xl border cursor-pointer transition-all duration-300`}
      style={{
        background: `rgba(${config.accentRgb}, 0.06)`,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderColor: `rgba(${config.accentRgb}, 0.15)`,
        boxShadow: `0 8px 32px rgba(${config.accentRgb}, 0.08)`,
      }}
    >
      {/* Icon */}
      <div className="flex items-center justify-between mb-2">
        <motion.div
          whileHover={{ rotate: 10, scale: 1.1 }}
          className="p-2 rounded-lg"
          style={{
            background: `rgba(${config.accentRgb}, 0.12)`,
          }}
        >
          <Icon size={20} style={{ color }} />
        </motion.div>

        {/* Toggle (if applicable) */}
        {data.type === "toggle" && (
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              data.onToggle?.();
            }}
            animate={{
              background: data.isActive
                ? `rgba(${config.accentRgb}, 0.3)`
                : `rgba(${config.accentRgb}, 0.1)`,
            }}
            className="w-10 h-6 rounded-full border flex items-center transition-all"
            style={{
              borderColor: `rgba(${config.accentRgb}, 0.2)`,
            }}
          >
            <motion.div
              animate={{ x: data.isActive ? 18 : 2 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="w-4 h-4 rounded-full"
              style={{
                background: data.isActive ? color : `rgba(${config.accentRgb}, 0.3)`,
              }}
            />
          </motion.button>
        )}
      </div>

      {/* Title */}
      <h3
        className="text-sm font-semibold mb-1"
        style={{ color: config.text, letterSpacing: "-0.01em" }}
      >
        {data.title}
      </h3>

      {/* Value (for stats) */}
      {data.type === "stat" && data.value !== undefined && (
        <div className="mb-2">
          <div className="flex items-baseline gap-1">
            <span
              className="text-2xl font-bold"
              style={{ color }}
            >
              {data.value}
            </span>
            {data.unit && (
              <span
                className="text-xs"
                style={{ color: config.textMuted }}
              >
                {data.unit}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Description */}
      {data.description && (
        <p
          className="text-xs"
          style={{ color: config.textMuted, lineHeight: 1.4 }}
        >
          {data.description}
        </p>
      )}

      {/* Graph placeholder (for future implementation) */}
      {data.type === "graph" && (
        <div
          className="h-12 rounded-lg mt-2"
          style={{
            background: `linear-gradient(90deg, rgba(${config.accentRgb}, 0.1) 0%, rgba(${config.accentRgb}, 0.3) 50%, rgba(${config.accentRgb}, 0.1) 100%)`,
          }}
        />
      )}

      {/* Action button text */}
      {data.type === "action" && (
        <p
          className="text-xs mt-2 font-medium"
          style={{ color }}
        >
          Click to execute →
        </p>
      )}
    </motion.div>
  );
}
