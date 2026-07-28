import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "dark" | "light" | "neon" | "cyberpunk" | "minimal" | "manus";

export interface ThemeConfig {
  name: Theme;
  label: string;
  bg: string;
  surface: string;
  accent: string;
  accentRgb: string;
  text: string;
  textMuted: string;
  border: string;
  glow: string;
}

export const THEMES: Record<Theme, ThemeConfig> = {
  manus: {
    name: "manus",
    label: "Manus",
    bg: "#0d0d10",
    surface: "rgba(18,18,24,0.82)",
    accent: "#6366f1",
    accentRgb: "99,102,241",
    text: "#f0f0f4",
    textMuted: "rgba(255,255,255,0.38)",
    border: "rgba(99,102,241,0.2)",
    glow: "rgba(99,102,241,0.3)",
  },
  dark: {
    name: "dark",
    label: "Dark",
    bg: "#0a0a0a",
    surface: "rgba(20,10,10,0.85)",
    accent: "#dc143c",
    accentRgb: "220,20,60",
    text: "#f0f0f0",
    textMuted: "rgba(255,255,255,0.4)",
    border: "rgba(220,20,60,0.2)",
    glow: "rgba(220,20,60,0.3)",
  },
  light: {
    name: "light",
    label: "Light",
    bg: "#f5f5f7",
    surface: "rgba(255,255,255,0.85)",
    accent: "#dc143c",
    accentRgb: "220,20,60",
    text: "#1a1a1a",
    textMuted: "rgba(0,0,0,0.45)",
    border: "rgba(220,20,60,0.2)",
    glow: "rgba(220,20,60,0.2)",
  },
  neon: {
    name: "neon",
    label: "Neon",
    bg: "#050510",
    surface: "rgba(5,5,20,0.9)",
    accent: "#00f2ff",
    accentRgb: "0,242,255",
    text: "#e0f7ff",
    textMuted: "rgba(0,242,255,0.45)",
    border: "rgba(0,242,255,0.25)",
    glow: "rgba(0,242,255,0.4)",
  },
  cyberpunk: {
    name: "cyberpunk",
    label: "Cyberpunk",
    bg: "#0d0015",
    surface: "rgba(13,0,21,0.9)",
    accent: "#ff00ff",
    accentRgb: "255,0,255",
    text: "#ffe0ff",
    textMuted: "rgba(255,0,255,0.45)",
    border: "rgba(255,0,255,0.25)",
    glow: "rgba(255,0,255,0.4)",
  },
  minimal: {
    name: "minimal",
    label: "Minimal",
    bg: "#111111",
    surface: "rgba(18,18,18,0.95)",
    accent: "#888888",
    accentRgb: "136,136,136",
    text: "#eeeeee",
    textMuted: "rgba(255,255,255,0.35)",
    border: "rgba(255,255,255,0.1)",
    glow: "rgba(255,255,255,0.1)",
  },
};

interface ThemeContextType {
  theme: Theme;
  config: ThemeConfig;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  // Legacy compat
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultTheme = "manus",
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem("enosx-theme") as Theme | null;
      return stored && THEMES[stored] ? stored : defaultTheme;
    } catch {
      return defaultTheme;
    }
  });

  const config = THEMES[theme];

  const setTheme = (t: Theme) => {
    setThemeState(t);
    try { localStorage.setItem("enosx-theme", t); } catch {}
  };

  const toggleTheme = () => {
    const order: Theme[] = ["manus", "dark", "light", "neon", "cyberpunk", "minimal"];
    const idx = order.indexOf(theme);
    setTheme(order[(idx + 1) % order.length]);
  };

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    
    // Remove all theme classes
    root.classList.remove("dark", "light", "neon", "cyberpunk", "minimal", "manus");
    body.classList.remove("dark", "light", "neon", "cyberpunk", "minimal", "manus");
    
    // Add current theme class to both html and body
    root.classList.add(theme);
    body.classList.add(theme);
    
    // Set ENOSX custom properties
    root.style.setProperty("--enosx-accent", config.accent);
    root.style.setProperty("--enosx-accent-rgb", config.accentRgb);
    root.style.setProperty("--enosx-bg", config.bg);
    root.style.setProperty("--enosx-surface", config.surface);
    root.style.setProperty("--enosx-text", config.text);
    root.style.setProperty("--enosx-text-muted", config.textMuted);
    root.style.setProperty("--enosx-border", config.border);
    root.style.setProperty("--enosx-glow", config.glow);
    
    // Also set background color directly on body for immediate effect
    body.style.backgroundColor = config.bg;
    body.style.color = config.text;
  }, [theme, config]);

  return (
    <ThemeContext.Provider value={{ theme, config, setTheme, toggleTheme, switchable: true }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
