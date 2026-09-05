/*
 * ENOSX AI — WelcomeScreen
 * Animated welcome with floating orb avatar
 * Features: breathing orb, staggered fade-in, glassmorphism cards
 */

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useWallpaper } from "@/contexts/WallpaperContext";
import BrandMark from "./BrandMark";

interface WelcomeScreenProps {
  onSuggestion: (text: string) => void;
  isCompact?: boolean;
}

const GREETINGS = [
  "Hello there!",
  "I'm ENOSX AI",
  "How can I assist you today?",
  "Let's build something amazing.",
  "Your AI workspace is ready.",
  "Powered by Enosx Technologies",
  "Ready to transform your workflow."
];

const SUGGESTIONS = [
  "Explain a difficult idea simply",
  "Help me plan my day",
  "Write something for me",
  "What can you help me do?",
];

export default function WelcomeScreen({ onSuggestion, isCompact }: WelcomeScreenProps) {
  const { config } = useTheme();
  const { settings: wallpaperSettings } = useWallpaper();
  const [greetingIndex, setGreetingIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setGreetingIndex((prev) => (prev + 1) % GREETINGS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col items-center justify-center px-6 py-8 overflow-y-auto">
      <div className="max-w-2xl w-full flex flex-col items-center gap-8">
        {/* Glass EX Logo with Branding */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: [0.23, 1, 0.32, 1] }}
          className="mb-4"
          title="ENOSX AI - Enosx Technologies"
        >
          <BrandMark size={96} animate />
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-center w-full"
        >
          <AnimatePresence mode="wait">
            <motion.h2
              key={greetingIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className="text-2xl sm:text-4xl font-semibold tracking-tight mb-3 min-h-[2.5rem] sm:min-h-[3rem] flex items-center justify-center text-center"
              style={{ color: config.text }}
            >
              {GREETINGS[greetingIndex]}
            </motion.h2>
          </AnimatePresence>
          
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-sm text-white/50 mt-6"
          >
            Powered by Enosx Technologies
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="mt-8 grid w-full grid-cols-1 gap-2 sm:grid-cols-2"
          >
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onSuggestion(suggestion)}
                className="rounded-xl border px-4 py-3 text-left text-xs transition-colors hover:bg-white/10 active:bg-white/15"
                style={{
                  color: config.text,
                  borderColor: `rgba(${config.accentRgb}, 0.25)`,
                  background: `rgba(${config.accentRgb}, 0.07)`,
                }}
              >
                {suggestion}
              </button>
            ))}
          </motion.div>
        </motion.div>


      </div>
    </div>
  );
}
