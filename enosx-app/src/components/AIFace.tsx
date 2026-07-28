/*
 * ENOSX AI — AIFace Component
 * Displays a reactive animated AI face that responds to conversation state,
 * emotion, and engagement level. Uses SVG and Framer Motion for smooth animations.
 */

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface AIFaceProps {
  isListening?: boolean;
  isSpeaking?: boolean;
  emotion?: "neutral" | "happy" | "thinking" | "focused" | "confused";
  accentColor?: string;
  accentRgb?: string;
  size?: "small" | "medium" | "large";
}

export default function AIFace({
  isListening = false,
  isSpeaking = false,
  emotion = "neutral",
  accentColor = "#00ff88",
  accentRgb = "0, 255, 136",
  size = "medium",
}: AIFaceProps) {
  const [eyePosition, setEyePosition] = useState({ x: 0, y: 0 });

  // Track mouse movement for eye following effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      setEyePosition({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const sizeMap = {
    small: 120,
    medium: 200,
    large: 280,
  };

  const faceSize = sizeMap[size];
  const scale = faceSize / 200;

  // Eye animation based on state
  const getEyeAnimation = () => {
    if (isListening) {
      return { y: [0, -8, 0], transition: { duration: 0.6, repeat: Infinity } };
    }
    if (isSpeaking) {
      return { scale: [1, 1.1, 1], transition: { duration: 0.4, repeat: Infinity } };
    }
    return { y: eyePosition.y * 0.5 };
  };

  // Mouth animation based on state
  const getMouthAnimation = () => {
    if (isSpeaking) {
      return {
        d: [
          "M 80 120 Q 100 130 120 120",
          "M 80 120 Q 100 140 120 120",
          "M 80 120 Q 100 130 120 120",
        ] as any,
        transition: { duration: 0.3, repeat: Infinity },
      };
    }
    if (emotion === "happy") {
      return { d: "M 80 120 Q 100 135 120 120" };
    }
    if (emotion === "confused") {
      return { d: "M 80 125 Q 100 115 120 125" };
    }
    return { d: "M 80 120 Q 100 125 120 120" };
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="flex items-center justify-center"
      style={{ width: faceSize, height: faceSize }}
    >
      <svg
        width={faceSize}
        height={faceSize}
        viewBox="0 0 200 200"
        className="drop-shadow-lg"
      >
        {/* Background glow */}
        <defs>
          <radialGradient id="faceGlow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.15" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer glow circle */}
        {(isListening || isSpeaking) && (
          <motion.circle
            cx="100"
            cy="100"
            r="95"
            fill="none"
            stroke={accentColor}
            strokeWidth="2"
            opacity="0.3"
            animate={{
              r: [95, 105, 95],
              opacity: [0.3, 0.1, 0.3],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}

        {/* Face background */}
        <circle cx="100" cy="100" r="90" fill={`rgba(${accentRgb}, 0.05)`} stroke={accentColor} strokeWidth="2" />
        <circle cx="100" cy="100" r="85" fill="url(#faceGlow)" />

        {/* Left Eye */}
        <g>
          <ellipse cx="70" cy="80" rx="12" ry="15" fill={`rgba(${accentRgb}, 0.1)`} stroke={accentColor} strokeWidth="1.5" />
          <motion.circle
            cx="70"
            cy="80"
            r="7"
            fill={accentColor}
            animate={getEyeAnimation()}
          />
        </g>

        {/* Right Eye */}
        <g>
          <ellipse cx="130" cy="80" rx="12" ry="15" fill={`rgba(${accentRgb}, 0.1)`} stroke={accentColor} strokeWidth="1.5" />
          <motion.circle
            cx="130"
            cy="80"
            r="7"
            fill={accentColor}
            animate={getEyeAnimation()}
          />
        </g>

        {/* Mouth */}
        <motion.path
          {...getMouthAnimation()}
          stroke={accentColor}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />

        {/* Listening indicator (sound waves) */}
        {isListening && (
          <>
            <motion.circle
              cx="100"
              cy="100"
              r="50"
              fill="none"
              stroke={accentColor}
              strokeWidth="1"
              opacity="0.4"
              animate={{
                r: [50, 70],
                opacity: [0.4, 0],
              }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
            <motion.circle
              cx="100"
              cy="100"
              r="50"
              fill="none"
              stroke={accentColor}
              strokeWidth="1"
              opacity="0.2"
              animate={{
                r: [50, 70],
                opacity: [0.2, 0],
              }}
              transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
            />
          </>
        )}

        {/* Speaking indicator (frequency bars) */}
        {isSpeaking && (
          <>
            <motion.rect
              x="45"
              y="140"
              width="4"
              height="20"
              fill={accentColor}
              rx="2"
              animate={{ height: [10, 20, 15, 25, 12] }}
              transition={{ duration: 0.4, repeat: Infinity }}
            />
            <motion.rect
              x="55"
              y="140"
              width="4"
              height="20"
              fill={accentColor}
              rx="2"
              animate={{ height: [15, 25, 10, 20, 18] }}
              transition={{ duration: 0.4, repeat: Infinity, delay: 0.1 }}
            />
            <motion.rect
              x="65"
              y="140"
              width="4"
              height="20"
              fill={accentColor}
              rx="2"
              animate={{ height: [12, 18, 22, 15, 20] }}
              transition={{ duration: 0.4, repeat: Infinity, delay: 0.2 }}
            />
            <motion.rect
              x="135"
              y="140"
              width="4"
              height="20"
              fill={accentColor}
              rx="2"
              animate={{ height: [20, 12, 18, 25, 15] }}
              transition={{ duration: 0.4, repeat: Infinity, delay: 0.1 }}
            />
            <motion.rect
              x="145"
              y="140"
              width="4"
              height="20"
              fill={accentColor}
              rx="2"
              animate={{ height: [15, 22, 12, 18, 20] }}
              transition={{ duration: 0.4, repeat: Infinity, delay: 0.2 }}
            />
            <motion.rect
              x="155"
              y="140"
              width="4"
              height="20"
              fill={accentColor}
              rx="2"
              animate={{ height: [18, 15, 25, 12, 18] }}
              transition={{ duration: 0.4, repeat: Infinity }}
            />
          </>
        )}

        {/* Thinking indicator (dots) */}
        {emotion === "thinking" && (
          <>
            <motion.circle
              cx="60"
              cy="150"
              r="3"
              fill={accentColor}
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            />
            <motion.circle
              cx="100"
              cy="150"
              r="3"
              fill={accentColor}
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
            />
            <motion.circle
              cx="140"
              cy="150"
              r="3"
              fill={accentColor}
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
            />
          </>
        )}
      </svg>
    </motion.div>
  );
}
