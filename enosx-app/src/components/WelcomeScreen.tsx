/*
 * ENOSX AI — WelcomeScreen
 * Animated welcome with floating orb avatar.
 */

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
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

export default function WelcomeScreen({ onSuggestion, isCompact }: WelcomeScreenProps) {
  const { config } = useTheme();
  const [greetingIndex, setGreetingIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setGreetingIndex((prev) => (prev + 1) % GREETINGS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col items-center justify-center px-4 py-6 overflow-y-auto">
      <div className="max-w-3xl w-full flex flex-col items-center gap-5 sm:gap-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: [0.23, 1, 0.32, 1] }}
          className="mb-1"
          title="ENOSX AI - Enosx Technologies"
        >
          <BrandMark size={isCompact ? 72 : 84} animate />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="w-full text-center"
        >
          <AnimatePresence mode="wait">
            <motion.h2
              key={greetingIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className="min-h-[2.5rem] flex items-center justify-center text-center text-2xl font-semibold tracking-tight sm:min-h-[3rem] sm:text-4xl"
              style={{ color: config.text }}
            >
              {GREETINGS[greetingIndex]}
            </motion.h2>
          </AnimatePresence>
          <p className="mt-2 text-sm text-white/50">Your private, real-time ENOSX workspace</p>
        </motion.div>

      </div>
    </div>
  );
}
