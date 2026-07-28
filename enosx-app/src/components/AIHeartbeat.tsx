/*
 * ENOSX AI — AIHeartbeat
 * Real-time SVG frequency visualizer (7 bars) synced to audio
 * Features: Web Audio API AnalyserNode, smooth Framer Motion scaling, Enosx Red glow
 */

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";

interface AIHeartbeatProps {
  isActive: boolean; // true when AI is speaking or listening
  audioContext?: AudioContext;
  analyser?: AnalyserNode;
}

const BAR_COUNT = 7;

export default function AIHeartbeat({
  isActive,
  audioContext,
  analyser,
}: AIHeartbeatProps) {
  const { config } = useTheme();
  const [frequencies, setFrequencies] = useState<number[]>(Array(BAR_COUNT).fill(0));
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!isActive || !analyser) {
      setFrequencies(Array(BAR_COUNT).fill(0));
      return;
    }

    const dataArray = new Uint8Array(analyser?.frequencyBinCount || 256);

    const animate = () => {
      analyser.getByteFrequencyData(dataArray);

      // Sample frequencies evenly across the spectrum
      const newFrequencies: number[] = [];
      const binSize = Math.floor(dataArray.length / BAR_COUNT);

      for (let i = 0; i < BAR_COUNT; i++) {
        const binStart = i * binSize;
        const binEnd = binStart + binSize;
        let sum = 0;

        for (let j = binStart; j < binEnd; j++) {
          sum += dataArray[j];
        }

        const average = sum / binSize / 255; // Normalize to 0-1
        newFrequencies.push(Math.min(average, 1));
      }

      setFrequencies(newFrequencies);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, analyser]);

  return (
    <div className="flex items-center justify-center gap-1.5 h-8">
      {frequencies.map((freq, i) => (
        <motion.div
          key={i}
          animate={{ scaleY: 0.2 + freq * 0.8 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="w-1 rounded-full origin-center"
          style={{
            height: "24px",
            background: isActive
              ? `linear-gradient(180deg, ${config.accent} 0%, rgba(${config.accentRgb}, 0.5) 100%)`
              : `rgba(${config.accentRgb}, 0.2)`,
            boxShadow: isActive
              ? `0 0 8px ${config.accent}, 0 0 16px rgba(${config.accentRgb}, 0.4)`
              : "none",
            transition: "background 0.3s ease, box-shadow 0.3s ease",
          }}
        />
      ))}
    </div>
  );
}
