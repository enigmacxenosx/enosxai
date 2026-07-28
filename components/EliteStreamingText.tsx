/*
 * Elite Streaming Text Component
 * Renders text with per-word spring fade-in animation
 * Creates a premium, fluid feel for high-speed AI responses
 */

import { motion } from "framer-motion";
import { useMemo } from "react";

interface EliteStreamingTextProps {
  text: string;
  isStreaming?: boolean;
  delay?: number;
}

export default function EliteStreamingText({
  text,
  isStreaming = false,
  delay = 0,
}: EliteStreamingTextProps) {
  const words = useMemo(() => text.split(/(\s+)/), [text]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: delay,
      },
    },
  };

  const wordVariants = {
    hidden: {
      opacity: 0,
      y: 8,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 120,
        damping: 14,
        duration: 0.4,
      } as any,
    },
  };

  return (
    <motion.span
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="inline"
    >
      {words.map((word, idx) => (
        <motion.span
          key={`${idx}-${word}`}
          variants={wordVariants}
          className="inline"
        >
          {word}
        </motion.span>
      ))}
      {isStreaming && (
        <motion.span
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="inline ml-1 text-cyan-400"
        >
          ▌
        </motion.span>
      )}
    </motion.span>
  );
}
