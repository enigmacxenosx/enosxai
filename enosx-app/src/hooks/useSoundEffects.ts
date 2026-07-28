/*
 * ENOSX AI — useSoundEffects
 * Subtle UI sound effects using Web Audio API
 * Sounds: click, send, receive, listen-start, listen-stop
 * All sounds are synthesized — no external files needed
 */

import { useCallback, useRef } from "react";

type SoundType = "click" | "send" | "receive" | "listenStart" | "listenStop" | "error" | "godMode";

function createAudioContext(): AudioContext | null {
  try {
    return new (window.AudioContext || (window as any).webkitAudioContext)();
  } catch {
    return null;
  }
}

function playTone(
  ctx: AudioContext,
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  gainVal = 0.08,
  fadeOut = true
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(gainVal, ctx.currentTime);
  if (fadeOut) {
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  }
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

export function useSoundEffects() {
  const ctxRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(true);

  function getCtx(): AudioContext | null {
    if (!ctxRef.current) {
      ctxRef.current = createAudioContext();
    }
    if (ctxRef.current?.state === "suspended") {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }

  const play = useCallback((sound: SoundType) => {
    if (!enabledRef.current) return;
    const ctx = getCtx();
    if (!ctx) return;

    try {
      switch (sound) {
        case "click":
          // Soft tick
          playTone(ctx, 800, 0.08, "sine", 0.05);
          break;

        case "send":
          // Rising two-tone whoosh
          playTone(ctx, 440, 0.12, "sine", 0.07);
          setTimeout(() => playTone(ctx, 660, 0.1, "sine", 0.05), 80);
          break;

        case "receive":
          // Soft chime
          playTone(ctx, 880, 0.18, "sine", 0.06);
          setTimeout(() => playTone(ctx, 1100, 0.15, "sine", 0.04), 100);
          break;

        case "listenStart":
          // Activation beep
          playTone(ctx, 600, 0.15, "sine", 0.08);
          setTimeout(() => playTone(ctx, 900, 0.12, "sine", 0.06), 100);
          break;

        case "listenStop":
          // Deactivation descend
          playTone(ctx, 900, 0.12, "sine", 0.06);
          setTimeout(() => playTone(ctx, 600, 0.15, "sine", 0.05), 80);
          break;

        case "error":
          // Low buzz
          playTone(ctx, 200, 0.2, "sawtooth", 0.04);
          break;

        case "godMode":
          // EPIC 2-second "System Override" cinematic sequence
          // Phase 1: Deep cinematic bass rumble (0-400ms)
          playTone(ctx, 35, 0.8, "sine", 0.2);
          setTimeout(() => playTone(ctx, 45, 0.6, "sine", 0.18), 100);
          setTimeout(() => playTone(ctx, 55, 0.5, "sine", 0.15), 200);
          
          // Phase 2: Rising digital sweep with multiple harmonics (200-800ms)
          for (let i = 0; i < 12; i++) {
            setTimeout(() => {
              playTone(ctx, 150 + i * 100, 0.12, "square", 0.04);
              playTone(ctx, 300 + i * 50, 0.08, "sawtooth", 0.02);
            }, 200 + i * 50);
          }
          
          // Phase 3: Power surge pulse (800-1200ms)
          setTimeout(() => {
            playTone(ctx, 80, 0.4, "sine", 0.25);
            playTone(ctx, 160, 0.3, "triangle", 0.1);
          }, 800);
          
          // Phase 4: Activation chime sequence (1200-1600ms)
          setTimeout(() => {
            playTone(ctx, 880, 0.25, "sine", 0.12);
          }, 1200);
          setTimeout(() => {
            playTone(ctx, 1100, 0.2, "sine", 0.1);
          }, 1350);
          setTimeout(() => {
            playTone(ctx, 1320, 0.15, "sine", 0.08);
          }, 1450);
          
          // Phase 5: Final ethereal confirmation (1600-2000ms)
          setTimeout(() => {
            playTone(ctx, 1760, 0.4, "sine", 0.1);
            playTone(ctx, 2200, 0.35, "sine", 0.06);
            playTone(ctx, 880, 0.5, "sine", 0.05); // Undertone
          }, 1600);
          break;
      }
    } catch {
      // Silently fail if audio context is unavailable
    }
  }, []);

  const setEnabled = useCallback((v: boolean) => {
    enabledRef.current = v;
  }, []);

  return { play, setEnabled };
}
