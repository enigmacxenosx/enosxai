/*
 * ENOSX AI — ContextualBackground
 * Dynamically shifts background colors based on conversation sentiment/topic
 * Features: sentiment detection, smooth color transitions, glow intensity
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Message } from "@/lib/types";

interface ContextualBackgroundProps {
  messages: Message[];
}

type Sentiment = "neutral" | "technical" | "creative" | "urgent" | "analytical";

function detectSentiment(text: string): Sentiment {
  const lower = text.toLowerCase();

  // Technical keywords
  if (/code|function|api|database|server|algorithm|debug|error|syntax/.test(lower)) {
    return "technical";
  }

  // Creative keywords
  if (/story|poem|creative|imagine|design|art|music|write|novel|character/.test(lower)) {
    return "creative";
  }

  // Urgent keywords
  if (/urgent|critical|emergency|asap|immediately|important|priority|help/.test(lower)) {
    return "urgent";
  }

  // Analytical keywords
  if (/analyze|data|statistics|research|study|evidence|hypothesis|conclusion/.test(lower)) {
    return "analytical";
  }

  return "neutral";
}

function getSentimentColors(sentiment: Sentiment): {
  primary: string;
  secondary: string;
  glow: number;
} {
  switch (sentiment) {
    case "technical":
      return {
        primary: "rgba(0, 242, 255, 0.08)",
        secondary: "rgba(59, 130, 246, 0.06)",
        glow: 0.4,
      };
    case "creative":
      return {
        primary: "rgba(236, 72, 153, 0.08)",
        secondary: "rgba(168, 85, 247, 0.06)",
        glow: 0.5,
      };
    case "urgent":
      return {
        primary: "rgba(239, 68, 68, 0.08)",
        secondary: "rgba(220, 20, 60, 0.06)",
        glow: 0.6,
      };
    case "analytical":
      return {
        primary: "rgba(34, 197, 94, 0.08)",
        secondary: "rgba(59, 130, 246, 0.06)",
        glow: 0.35,
      };
    default:
      return {
        primary: "rgba(220, 20, 60, 0.06)",
        secondary: "rgba(255, 255, 255, 0.02)",
        glow: 0.25,
      };
  }
}

export default function ContextualBackground({ messages }: ContextualBackgroundProps) {
  const [sentiment, setSentiment] = useState<Sentiment>("neutral");
  const [colors, setColors] = useState(getSentimentColors("neutral"));

  useEffect(() => {
    if (messages.length === 0) {
      setSentiment("neutral");
      setColors(getSentimentColors("neutral"));
      return;
    }

    // Analyze the last user message
    const lastUserMsg = [...messages]
      .reverse()
      .find((m) => m.role === "user");

    if (lastUserMsg) {
      const newSentiment = detectSentiment(lastUserMsg.content);
      setSentiment(newSentiment);
      setColors(getSentimentColors(newSentiment));
    }
  }, [messages]);

  return (
    <>
      {/* Primary glow orb */}
      <motion.div
        animate={{
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="fixed pointer-events-none"
        style={{
          top: "-20%",
          right: "-10%",
          width: "50vw",
          height: "50vw",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colors.primary} 0%, transparent 70%)`,
          filter: `blur(40px)`,
          opacity: colors.glow,
        }}
      />

      {/* Secondary glow orb */}
      <motion.div
        animate={{
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="fixed pointer-events-none"
        style={{
          bottom: "-20%",
          left: "10%",
          width: "40vw",
          height: "40vw",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colors.secondary} 0%, transparent 70%)`,
          filter: `blur(60px)`,
          opacity: colors.glow * 0.7,
        }}
      />

      {/* Sentiment indicator badge (optional) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="fixed bottom-6 left-6 text-xs px-3 py-1.5 rounded-full pointer-events-none"
        style={{
          background: colors.primary,
          border: `1px solid ${colors.secondary}`,
          color: "rgba(255,255,255,0.6)",
          letterSpacing: "0.06em",
          zIndex: 10,
        }}
      >
        {sentiment.toUpperCase()}
      </motion.div>
    </>
  );
}
