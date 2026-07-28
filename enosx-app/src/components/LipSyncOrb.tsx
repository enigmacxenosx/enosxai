/*
 * ENOSX AI — LipSyncOrb
 * Enhanced FloatingOrb with lip-sync wave animation
 * Features: frequency-reactive mouth wave, breathing glow, state colors
 */

import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { VoiceState } from "@/lib/types";

interface LipSyncOrbProps {
  voiceState: VoiceState;
  isLoading: boolean;
  size?: number;
  audioFrequency?: number; // 0-1, for mouth wave animation
}

export default function LipSyncOrb({
  voiceState,
  isLoading,
  size = 48,
  audioFrequency = 0.5,
}: LipSyncOrbProps) {
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

  // Mouth wave points (SVG path)
  const mouthWavePoints = Array.from({ length: 20 }, (_, i) => {
    const x = (i / 19) * 100;
    const y = 50 + Math.sin((x / 100) * Math.PI + audioFrequency * Math.PI * 2) * 15;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
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
        className="w-full h-full rounded-full flex items-center justify-center relative overflow-hidden"
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

        {/* Icon or mouth wave */}
        {!isSpeaking ? (
          <Zap
            size={size * 0.4}
            style={{ color: "#fff", position: "relative", zIndex: 1 }}
          />
        ) : (
          /* Lip-sync mouth wave */
          <svg
            width={size * 0.6}
            height={size * 0.3}
            viewBox="0 0 100 100"
            style={{ position: "relative", zIndex: 1 }}
          >
            {/* Mouth outline */}
            <ellipse
              cx="50"
              cy="50"
              rx="35"
              ry="25"
              fill="none"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1"
            />

            {/* Animated wave line */}
            <motion.polyline
              points={mouthWavePoints}
              fill="none"
              stroke="rgba(255,255,255,0.8)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              animate={{
                points: Array.from({ length: 20 }, (_, i) => {
                  const x = (i / 19) * 100;
                  const t = Date.now() / 300;
                  const y =
                    50 +
                    Math.sin((x / 100) * Math.PI + t * Math.PI * 2) *
                      (15 + audioFrequency * 10);
                  return `${x},${y}`;
                }).join(" "),
              }}
              transition={{ duration: 0.05 }}
            />
          </svg>
        )}
      </motion.div>
    </div>
  );
}
