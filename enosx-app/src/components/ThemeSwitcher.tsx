/*
 * ENOSX AI — ThemeSwitcher
 * Animated theme selector panel with live preview swatches
 * Themes: Dark, Light, Neon, Cyberpunk, Minimal
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, Check } from "lucide-react";
import { useTheme, THEMES, Theme } from "@/contexts/ThemeContext";

export default function ThemeSwitcher() {
  const { theme, config, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all duration-200"
        style={{
          background: open
            ? `rgba(${config.accentRgb}, 0.15)`
            : "rgba(255,255,255,0.05)",
          border: open
            ? `1px solid rgba(${config.accentRgb}, 0.3)`
            : "1px solid rgba(255,255,255,0.08)",
          color: open ? config.accent : config.textMuted,
        }}
        title="Change theme"
      >
        <Palette size={11} />
        <span style={{ fontSize: "10px", letterSpacing: "0.04em" }}>
          {THEMES[theme].label.toUpperCase()}
        </span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -8 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute right-0 top-full mt-2 z-50 rounded-2xl p-3 min-w-[180px]"
              style={{
                background: config.surface,
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: `1px solid rgba(${config.accentRgb}, 0.2)`,
                boxShadow: `0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(${config.accentRgb},0.05)`,
              }}
            >
              <p
                className="text-xs mb-2 px-1"
                style={{ color: config.textMuted, letterSpacing: "0.06em", fontSize: "10px" }}
              >
                THEME
              </p>
              <div className="flex flex-col gap-1">
                {(Object.keys(THEMES) as Theme[]).map((t) => {
                  const tc = THEMES[t];
                  const isActive = theme === t;
                  return (
                    <motion.button
                      key={t}
                      whileHover={{ scale: 1.02, x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setTheme(t);
                        setOpen(false);
                      }}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all duration-150"
                      style={
                        isActive
                          ? {
                              background: `rgba(${tc.accentRgb}, 0.12)`,
                              border: `1px solid rgba(${tc.accentRgb}, 0.25)`,
                            }
                          : {
                              background: "transparent",
                              border: "1px solid transparent",
                            }
                      }
                    >
                      {/* Color swatch */}
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{
                          background: tc.accent,
                          boxShadow: `0 0 6px ${tc.accent}`,
                        }}
                      />
                      <span
                        className="text-xs flex-1"
                        style={{
                          color: isActive ? config.text : config.textMuted,
                          fontWeight: isActive ? 600 : 400,
                        }}
                      >
                        {tc.label}
                      </span>
                      {isActive && (
                        <Check size={11} style={{ color: tc.accent }} />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
