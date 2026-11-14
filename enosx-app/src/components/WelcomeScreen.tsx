/*
 * ENOSX AI — WelcomeScreen
 * Calm premium empty state with focused prompt starters.
 */

import { motion } from "framer-motion";
import { CalendarDays, Code2, Lightbulb, PenLine } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import BrandMark from "./BrandMark";

interface WelcomeScreenProps {
  onSuggestion: (text: string) => void;
  isCompact?: boolean;
}

const STARTERS = [
  { label: "Plan my week", prompt: "Help me plan my week with clear priorities and realistic time blocks.", icon: CalendarDays },
  { label: "Explain a difficult topic", prompt: "Explain a difficult topic simply, then test my understanding with an example.", icon: Lightbulb },
  { label: "Review this code", prompt: "Review this code for correctness, security, maintainability, and performance.", icon: Code2 },
  { label: "Draft something", prompt: "Help me draft a clear, polished version of this idea.", icon: PenLine },
];

export default function WelcomeScreen({ onSuggestion, isCompact }: WelcomeScreenProps) {
  const { config } = useTheme();

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-10 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-2xl"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.045] ring-1 ring-white/[0.08]">
            <BrandMark size={isCompact ? 32 : 38} />
          </div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-white/35">Your AI workspace</p>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl" style={{ color: config.text }}>
            What would you like to work on?
          </h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-white/45">
            Start with a prompt below or ask anything. ENOSX AI is ready when you are.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {STARTERS.map(({ label, prompt, icon: Icon }, index) => (
            <motion.button
              key={label}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + index * 0.05, duration: 0.3 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => onSuggestion(prompt)}
              className="group flex items-center gap-3 rounded-2xl bg-white/[0.035] px-4 py-3.5 text-left ring-1 ring-white/[0.07] transition-colors hover:bg-white/[0.07] hover:ring-white/[0.13]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.055] text-white/55 transition-colors group-hover:text-white/85">
                <Icon size={15} strokeWidth={1.8} />
              </span>
              <span className="text-sm font-medium text-white/70 transition-colors group-hover:text-white/90">{label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
