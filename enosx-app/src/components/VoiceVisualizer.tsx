/*
 * ENOSX AI — VoiceVisualizer
 * Real-time audio visualization with animated bars
 * Features: FFT audio analysis, animated bars, pulsing circle, wave effect
 */

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface VoiceVisualizerProps {
  isActive: boolean;
  isListening: boolean;
  color: string;
  accentRgb: string;
  audioStream?: MediaStream | null;
}

const BAR_COUNT = 20;

export default function VoiceVisualizer({
  isActive,
  isListening,
  color,
  accentRgb,
  audioStream = null,
}: VoiceVisualizerProps) {
  const [bars, setBars] = useState<number[]>(Array(BAR_COUNT).fill(0.1));
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ownsStreamRef = useRef(false);
  const animFrameRef = useRef<number>(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isListening || !isActive) {
      // Animate bars down smoothly
      setBars(Array(BAR_COUNT).fill(0.1));
      cleanup();
      return;
    }

    let mounted = true;

    const startAnalysis = async () => {
      try {
        const stream = audioStream ?? await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!mounted) {
          if (!audioStream) stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        ownsStreamRef.current = !audioStream;
        const ctx = new AudioContext();
        contextRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;
        const source = ctx.createMediaStreamSource(stream);
        sourceRef.current = source;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.fftSize);

        const draw = () => {
          if (!mounted || !analyserRef.current) return;
          analyserRef.current.getByteTimeDomainData(dataArray);
          const newBars = Array.from({ length: BAR_COUNT }, (_, i) => {
            const idx = Math.floor((i / BAR_COUNT) * dataArray.length);
            return Math.max(0.08, Math.abs(dataArray[idx] - 128) / 128);
          });
          setBars(newBars);
          animFrameRef.current = requestAnimationFrame(draw);
        };
        draw();
      } catch {
        // Mic not available — use animated fallback
        const animateFallback = () => {
          if (!mounted) return;
          const newBars = Array.from({ length: BAR_COUNT }, (_, i) => {
            const t = Date.now() / 400;
            return 0.15 + 0.6 * Math.abs(Math.sin(t + i * 0.4));
          });
          setBars(newBars);
          animFrameRef.current = requestAnimationFrame(animateFallback);
        };
        animateFallback();
      }
    };

    startAnalysis();

    return () => {
      mounted = false;
      cleanup();
    };
  }, [isListening, isActive, audioStream]);

  function cleanup() {
    cancelAnimationFrame(animFrameRef.current);
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch {}
      sourceRef.current = null;
    }
    if (contextRef.current) {
      try { contextRef.current.close(); } catch {}
      contextRef.current = null;
    }
    if (streamRef.current) {
      if (ownsStreamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      ownsStreamRef.current = false;
    }
    analyserRef.current = null;
  }

  // Speaking mode: animated sine wave bars
  const speakingBars = Array.from({ length: BAR_COUNT }, (_, i) => {
    const t = Date.now() / 300;
    return 0.2 + 0.5 * Math.abs(Math.sin(t + i * 0.5));
  });

  const displayBars = isListening ? bars : speakingBars;

  return (
    <div
      data-testid="voice-waveform"
      role="img"
      aria-label={isListening ? "Live microphone audio waveform" : "Voice audio waveform"}
      className="flex items-center justify-center gap-0.5 h-full rounded-xl px-4"
      style={{
        background: `rgba(${accentRgb}, 0.06)`,
        border: `1px solid rgba(${accentRgb}, 0.15)`,
      }}
    >
      {/* Pulsing orb */}
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.6, 1, 0.6],
        }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        className="w-2 h-2 rounded-full mr-2 flex-shrink-0"
        style={{
          background: color,
          boxShadow: `0 0 8px ${color}`,
        }}
      />

      {/* Frequency bars */}
      {displayBars.map((h, i) => (
        <motion.div
          key={i}
          data-waveform-bar="true"
          animate={{ scaleY: h }}
          transition={{ duration: 0.08, ease: "easeOut" }}
          className="rounded-full origin-center"
          style={{
            width: 3,
            height: 24,
            background: `rgba(${accentRgb}, ${0.4 + h * 0.6})`,
            transformOrigin: "center",
          }}
        />
      ))}

      {/* Label */}
      <span
        className="ml-2 text-xs flex-shrink-0"
        style={{ color, opacity: 0.7, letterSpacing: "0.06em", fontSize: "10px" }}
      >
        {isListening ? "LISTENING" : "SPEAKING"}
      </span>
    </div>
  );
}
