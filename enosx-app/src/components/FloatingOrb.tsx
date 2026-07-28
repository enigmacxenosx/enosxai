/*
 * ENOSX AI — FloatingOrb
 * Reactive AI avatar orb that responds to voice and AI state
 * Features: breathing animation, voice reactive glow, color shifts by state
 */

import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { VoiceState } from "@/lib/types";

interface FloatingOrbProps {
  voiceState: VoiceState;
  isLoading: boolean;
  size?: number;
}

export default function FloatingOrb({
  voiceState,
  isLoading,
  size = 32,
}: FloatingOrbProps) {
  const { config } = useTheme();

  const isListening = voiceState === "listening";
  const isSpeaking = voiceState === "speaking";
  const isProcessing = voiceState === "processing" || isLoading;

  // Dynamic color based on state
  const orbColor =
    isListening
      ? "#22c55e"
      : isSpeaking
      ? "#3b82f6"
      : isProcessing
      ? "#f59e0b"
      : config.accent;

  const orbRgb =
    isListening
      ? "34,197,94"
      : isSpeaking
      ? "59,130,246"
      : isProcessing
      ? "245,158,11"
      : config.accentRgb;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Outer pulse ring */}
      {(isListening || isSpeaking) && (
        <motion.div
          animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
          className="absolute inset-0 rounded-full"
          style={{ border: `2px solid rgba(${orbRgb}, 0.5)` }}
        />
      )}

      {/* Core orb */}
      <motion.div
        animate={{
          boxShadow: [
            `0 0 ${size * 0.3}px rgba(${orbRgb}, 0.4)`,
            `0 0 ${size * 0.7}px rgba(${orbRgb}, 0.7)`,
            `0 0 ${size * 0.3}px rgba(${orbRgb}, 0.4)`,
          ],
          scale: isListening ? [1, 1.08, 1] : isProcessing ? [1, 1.04, 1] : 1,
        }}
        transition={{
          duration: isListening ? 0.8 : 2.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="w-full h-full rounded-full flex items-center justify-center"
        style={{
          background: `radial-gradient(circle at 35% 35%, ${orbColor} 0%, rgba(${orbRgb},0.4) 60%, rgba(${orbRgb},0.1) 100%)`,
          border: `1px solid rgba(${orbRgb}, 0.4)`,
          transition: "background 0.4s ease",
        }}
      >
        {/* Rotating inner ring for processing */}
        {isProcessing && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="absolute inset-1 rounded-full"
            style={{
              background: `conic-gradient(from 0deg, transparent 70%, rgba(${orbRgb},0.8) 100%)`,
            }}
          />
        )}
        <Zap
          size={size * 0.4}
          style={{ color: "#fff", position: "relative", zIndex: 1 }}
        />
      </motion.div>
    </div>
  );
}
