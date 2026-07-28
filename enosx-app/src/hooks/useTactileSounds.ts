import { useCallback } from "react";

interface TactileSoundConfig {
  enabled: boolean;
  volume: number;
}

export function useTactileSounds(config: TactileSoundConfig = { enabled: true, volume: 0.3 }) {
  const audioContext = useCallback(() => {
    if (typeof window === "undefined") return null;
    return (window as any).audioContext || new (window.AudioContext || (window as any).webkitAudioContext)();
  }, []);

  const playTone = useCallback(
    (frequency: number, duration: number = 100, type: OscillatorType = "sine") => {
      if (!config.enabled) return;

      const ctx = audioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = type;
      osc.frequency.value = frequency;

      gain.gain.setValueAtTime(config.volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration / 1000);
    },
    [config, audioContext]
  );

  const playClick = useCallback(() => {
    playTone(800, 50, "sine");
  }, [playTone]);

  const playPop = useCallback(() => {
    playTone(600, 80, "sine");
  }, [playTone]);

  const playSuccess = useCallback(() => {
    playTone(1000, 100, "sine");
    setTimeout(() => playTone(1200, 100, "sine"), 150);
  }, [playTone]);

  const playError = useCallback(() => {
    playTone(300, 150, "sine");
  }, [playTone]);

  const playChainStart = useCallback(() => {
    playTone(1200, 60, "sine");
    setTimeout(() => playTone(1400, 60, "sine"), 80);
    setTimeout(() => playTone(1600, 60, "sine"), 160);
  }, [playTone]);

  return {
    playClick,
    playPop,
    playSuccess,
    playError,
    playChainStart,
  };
}
