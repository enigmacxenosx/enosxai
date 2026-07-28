/*
 * ENOSX AI — ActionTileGrid
 * Bento-style grid layout for system action tiles
 * Features: responsive grid, animated stagger, glassmorphism container
 */

import { motion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import ActionTile, { ActionTileData } from "./ActionTile";

interface ActionTileGridProps {
  tiles: ActionTileData[];
  onTileClick?: (tileId: string) => void;
}

export default function ActionTileGrid({ tiles, onTileClick }: ActionTileGridProps) {
  const { config } = useTheme();

  if (tiles.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4 }}
      className="w-full rounded-2xl p-4 mb-4"
      style={{
        background: `rgba(${config.accentRgb}, 0.03)`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: `1px solid rgba(${config.accentRgb}, 0.1)`,
      }}
    >
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {tiles.map((tile, i) => (
          <motion.div
            key={tile.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: i * 0.08,
              type: "spring",
              stiffness: 300,
              damping: 25,
            }}
          >
            <ActionTile
              data={tile}
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
