/*
 * ENOSX AI Assistant — useGlassmorphismMax Hook
 * Pro-exclusive setting for enhanced glassmorphism effects
 * Deeper blur, more realistic glass appearance, premium feel
 */

import { useState, useEffect } from "react";

interface GlassmorphismMaxConfig {
  blurAmount: number; // 0-50px
  saturation: number; // 0-200%
  opacity: number; // 0-1
  glowIntensity: number; // 0-1
}

const STANDARD_CONFIG: GlassmorphismMaxConfig = {
  blurAmount: 12,
  saturation: 100,
  opacity: 0.06,
  glowIntensity: 0.3,
};

const PRO_CONFIG: GlassmorphismMaxConfig = {
  blurAmount: 32,
  saturation: 180,
  opacity: 0.08,
  glowIntensity: 0.6,
};

export function useGlassmorphismMax(isPro: boolean = false) {
  const [config, setConfig] = useState<GlassmorphismMaxConfig>(
    isPro ? PRO_CONFIG : STANDARD_CONFIG
  );

  useEffect(() => {
    setConfig(isPro ? PRO_CONFIG : STANDARD_CONFIG);
  }, [isPro]);

  const getGlassStyle = () => ({
    backdropFilter: `blur(${config.blurAmount}px) saturate(${config.saturation}%)`,
    WebkitBackdropFilter: `blur(${config.blurAmount}px) saturate(${config.saturation}%)`,
    background: `rgba(255, 255, 255, ${config.opacity})`,
  });

  const getGlowStyle = () => ({
    boxShadow: `0 0 ${Math.round(32 * config.glowIntensity)}px rgba(0, 242, 255, ${config.glowIntensity * 0.3}),
                inset 0 0 ${Math.round(16 * config.glowIntensity)}px rgba(0, 242, 255, ${config.glowIntensity * 0.1})`,
  });

  return {
    config,
    getGlassStyle,
    getGlowStyle,
    isPro,
  };
}
