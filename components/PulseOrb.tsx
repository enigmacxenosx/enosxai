/*
 * ENOSX AI — PulseOrb
 * "The Pulse" — a glowing, morphing sphere that serves as the signature voice
 * interaction visualizer. It changes color and shape based on the AI's state.
 *
 * State → Color mapping:
 *   listening   → Cyan / Blue   (#00f2ff / #22d3ee)
 *   processing  → Purple / Pink (#a855f7 / #ec4899)  — the "Gemini" color
 *   speaking    → Purple / Pink (same, slightly different animation)
 *   completed   → White Sparkle (#ffffff with sparkle particles)
 *   idle        → Subtle crimson (theme accent, low opacity)
 *
 * The sphere uses layered radial gradients + animated border-radius morphing
 * to create an organic, living feel. Sparkle particles are rendered as
 * absolutely-positioned divs that fly outward on completion.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VoiceState } from "@/lib/types";

/* ─────────────────────────── types ─────────────────────────── */
interface PulseOrbProps {
  voiceState: VoiceState;
  isLoading: boolean;
  /** Diameter of the orb in pixels (default 200) */
  size?: number;
  /** Called when the orb is clicked while idle */
  onClick?: () => void;
}

/* ─────────────────────────── constants ─────────────────────────── */
const STATE_COLORS = {
  idle: {
    primary: "#dc143c",
    secondary: "#8b0000",
    glow: "220,20,60",
    label: "",
  },
  listening: {
    primary: "#00f2ff",
    secondary: "#22d3ee",
    glow: "0,242,255",
    label: "LISTENING",
  },
  processing: {
    primary: "#a855f7",
    secondary: "#ec4899",
    glow: "168,85,247",
    label: "PROCESSING",
  },
  speaking: {
    primary: "#c084fc",
    secondary: "#f472b6",
    glow: "192,132,252",
    label: "SPEAKING",
  },
  completed: {
    primary: "#ffffff",
    secondary: "#e0e0ff",
    glow: "255,255,255",
    label: "DONE",
  },
} as const;

/* Organic border-radius keyframes for morphing effect */
const MORPH_FRAMES = [
  "60% 40% 30% 70% / 60% 30% 70% 40%",
  "30% 60% 70% 40% / 50% 60% 30% 60%",
  "50% 60% 30% 60% / 30% 70% 50% 60%",
  "60% 40% 30% 70% / 60% 30% 70% 40%",
];

/* ─────────────────────────── sparkle particle ─────────────────────────── */
interface Particle {
  id: number;
  angle: number;
  distance: number;
  size: number;
  duration: number;
  delay: number;
}

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    angle: (360 / count) * i + Math.random() * 20 - 10,
    distance: 60 + Math.random() * 50,
    size: 3 + Math.random() * 4,
    duration: 0.6 + Math.random() * 0.4,
    delay: Math.random() * 0.2,
  }));
}

/* ─────────────────────────── audio analyser ─────────────────────────── */
function useAudioLevel(active: boolean) {
  const [level, setLevel] = useState(0);
  const rafRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!active) {
      setLevel(0);
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      ctxRef.current?.close();
      analyserRef.current = null;
      streamRef.current = null;
      ctxRef.current = null;
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!mounted) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const ctx = new AudioContext();
        ctxRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 32;
        analyserRef.current = analyser;
        ctx.createMediaStreamSource(stream).connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          if (!mounted || !analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          setLevel(avg / 255);
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        // Mic unavailable — animate synthetically
        const tick = () => {
          if (!mounted) return;
          setLevel(0.2 + 0.5 * Math.abs(Math.sin(Date.now() / 300)));
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      }
    })();

    return () => {
      mounted = false;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      ctxRef.current?.close();
    };
  }, [active]);

  return level;
}

/* ─────────────────────────── component ─────────────────────────── */
export default function PulseOrb({
  voiceState,
  isLoading,
  size = 200,
  onClick,
}: PulseOrbProps) {
  const isListening = voiceState === "listening";
  const isProcessing = voiceState === "processing" || isLoading;
  const isSpeaking = voiceState === "speaking";

  // "completed" state: briefly shown after speaking ends
  const [showCompleted, setShowCompleted] = useState(false);
  const prevStateRef = useRef(voiceState);
  useEffect(() => {
    if (prevStateRef.current === "speaking" && voiceState === "idle") {
      setShowCompleted(true);
      const t = setTimeout(() => setShowCompleted(false), 2000);
      return () => clearTimeout(t);
    }
    prevStateRef.current = voiceState;
    return undefined;
  }, [voiceState]);

  const effectiveState: keyof typeof STATE_COLORS = showCompleted
    ? "completed"
    : isListening
    ? "listening"
    : isProcessing
    ? "processing"
    : isSpeaking
    ? "speaking"
    : "idle";

  const colors = STATE_COLORS[effectiveState];
  const audioLevel = useAudioLevel(isListening);

  // Scale factor driven by mic input when listening
  const dynamicScale = isListening ? 1 + audioLevel * 0.25 : 1;

  // Sparkle particles for completed state
  const [particles] = useState(() => generateParticles(12));

  const half = size / 2;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* ── Outer ambient glow ── */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        animate={{
          boxShadow: [
            `0 0 ${size * 0.4}px rgba(${colors.glow}, 0.2)`,
            `0 0 ${size * 0.9}px rgba(${colors.glow}, 0.45)`,
            `0 0 ${size * 0.4}px rgba(${colors.glow}, 0.2)`,
          ],
        }}
        transition={{
          duration: isListening ? 0.6 : isProcessing ? 0.9 : 2.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{ borderRadius: "50%" }}
      />

      {/* ── Rotating halo ring (processing / speaking only) ── */}
      <AnimatePresence>
        {(isProcessing || isSpeaking) && (
          <motion.div
            key="halo"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1, rotate: 360 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{
              opacity: { duration: 0.3 },
              scale: { duration: 0.3 },
              rotate: { duration: 3, repeat: Infinity, ease: "linear" },
            }}
            className="absolute inset-0 pointer-events-none"
            style={{
              borderRadius: "50%",
              background: `conic-gradient(from 0deg, transparent 60%, rgba(${colors.glow}, 0.7) 100%)`,
              width: size + 16,
              height: size + 16,
              top: -8,
              left: -8,
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Pulse ring (listening) ── */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            key="pulse-ring"
            className="absolute pointer-events-none rounded-full"
            style={{
              width: size,
              height: size,
              border: `2px solid rgba(${colors.glow}, 0.5)`,
            }}
            animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>

      {/* ── Core morphing sphere ── */}
      <motion.div
        onClick={onClick}
        animate={{
          scale: dynamicScale,
          borderRadius: effectiveState === "idle"
            ? "50%"
            : MORPH_FRAMES,
        }}
        transition={{
          scale: { duration: 0.1, ease: "easeOut" },
          borderRadius: {
            duration: isListening ? 1.2 : isProcessing ? 1.8 : 3,
            repeat: Infinity,
            ease: "easeInOut",
          },
        }}
        className="relative flex items-center justify-center"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle at 35% 30%, ${colors.primary} 0%, ${colors.secondary} 45%, rgba(${colors.glow}, 0.15) 100%)`,
          boxShadow: `inset 0 0 ${size * 0.3}px rgba(255,255,255,0.12), 0 0 ${size * 0.2}px rgba(${colors.glow}, 0.4)`,
          cursor: onClick ? "pointer" : "default",
          transition: "background 0.5s ease",
        }}
      >
        {/* Inner highlight */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: size * 0.35,
            height: size * 0.35,
            top: size * 0.12,
            left: size * 0.18,
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(255,255,255,0.35) 0%, transparent 70%)`,
          }}
        />

        {/* State label */}
        <AnimatePresence mode="wait">
          {colors.label && (
            <motion.span
              key={effectiveState}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.9, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.25 }}
              className="relative z-10 text-white font-bold select-none"
              style={{
                fontSize: size * 0.075,
                letterSpacing: "0.12em",
                textShadow: `0 0 12px rgba(${colors.glow}, 0.8)`,
              }}
            >
              {colors.label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Sparkle particles (completed state) ── */}
      <AnimatePresence>
        {showCompleted &&
          particles.map((p) => {
            const rad = (p.angle * Math.PI) / 180;
            const tx = Math.cos(rad) * p.distance;
            const ty = Math.sin(rad) * p.distance;
            return (
              <motion.div
                key={p.id}
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: p.size,
                  height: p.size,
                  top: half - p.size / 2,
                  left: half - p.size / 2,
                  background: "#ffffff",
                  boxShadow: "0 0 6px #ffffff, 0 0 12px #c0c0ff",
                }}
                initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                animate={{
                  opacity: 0,
                  x: tx,
                  y: ty,
                  scale: 0.2,
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  ease: "easeOut",
                }}
              />
            );
          })}
      </AnimatePresence>
    </div>
  );
}
