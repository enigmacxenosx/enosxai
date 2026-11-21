/*
 * ENOSX AI — WelcomeScreen
 * Calm premium empty state with focused prompt starters.
 */

import { motion } from "framer-motion";
import { BookOpen, CalendarDays, Code2, Lightbulb, PenLine, Images } from "lucide-react";
import { useDarkMode } from "@/contexts/DarkModeContext";
import BrandMark from "./BrandMark";

interface WelcomeScreenProps {
  onSuggestion: (text: string) => void;
  isCompact?: boolean;
  isComposerFlow?: boolean;
  showSuggestions?: boolean;
}

interface WelcomeSuggestionsProps {
  onSuggestion: (text: string) => void;
  animateEntrance?: boolean;
  variant?: "list";
}

const STARTERS = [
  { label: "Plan my week", prompt: "Help me plan my week with clear priorities and realistic time blocks.", icon: CalendarDays, color: "#54d9c5" },
  { label: "Explain a topic", prompt: "Explain a difficult topic simply, then test my understanding with an example.", icon: Lightbulb, color: "#b990ff" },
  { label: "Find learning media", prompt: "Find online tutorial videos and pictures about web design for beginners, and show the results with source links.", icon: Images, color: "#73d5ff" },
  { label: "Study a webpage", prompt: "Study this page: https://www.w3.org/WAI/fundamentals/accessibility-intro/. Summarize its main ideas and suggest what I should learn next.", icon: BookOpen, color: "#a5e8a1" },
  { label: "Review code", prompt: "Review this code for correctness, security, maintainability, and performance.", icon: Code2, color: "#72d8bd" },
  { label: "Draft something", prompt: "Help me draft a clear, polished version of this idea.", icon: PenLine, color: "#8de6d1" },
];

export function WelcomeSuggestions({ onSuggestion, animateEntrance = true, variant = "list" }: WelcomeSuggestionsProps) {
  return (
    <div className={`welcome-suggestions gap-2 welcome-suggestions--list`} aria-label="Suggested prompts">
      {STARTERS.map(({ label, prompt, icon: Icon, color }, index) => (
        <motion.button
          key={label}
          type="button"
          initial={{ opacity: 0, y: animateEntrance ? 8 : 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 + index * 0.05, duration: 0.3 }}
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.985 }}
          onClick={() => onSuggestion(prompt)}
          className="welcome-suggestion group inline-flex h-9 items-center gap-2 border-b border-white/[0.12] px-2 text-left text-[12px] font-medium text-white/75 transition-colors hover:border-white/[0.28] hover:text-white welcome-suggestion--list"
        >
          <Icon size={14} strokeWidth={1.8} style={{ color }} />
          <span>{label}</span>
        </motion.button>
      ))}
    </div>
  );
}

export default function WelcomeScreen({ onSuggestion, isCompact, isComposerFlow = false, showSuggestions = true }: WelcomeScreenProps) {
  const { config } = useDarkMode();

  return (
    <div className={isComposerFlow ? "flex w-full flex-col items-center px-4 pb-4 pt-5 sm:px-6" : "phone-welcome-screen flex min-h-full flex-col items-center justify-center px-4 py-10 sm:px-6"}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-2xl"
      >
        <div className={`${isComposerFlow || !showSuggestions ? "mb-0" : "mb-8"} flex items-center justify-center gap-3`}>
          <BrandMark size={isCompact ? 30 : 34} className="flex-shrink-0" />
          <h2 className="min-w-0 text-left text-xl font-semibold tracking-[-0.03em] sm:text-2xl" style={{ color: config.text }}>
            What would you like to work on?
          </h2>
        </div>

        {showSuggestions && <WelcomeSuggestions onSuggestion={onSuggestion} />}
      </motion.div>
    </div>
  );
}
