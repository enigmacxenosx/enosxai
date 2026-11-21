import React, { createContext, useContext, useEffect } from "react";

export interface DarkModeConfig {
  name: "dark";
  label: "Dark";
  bg: string;
  surface: string;
  accent: string;
  accentRgb: string;
  text: string;
  textMuted: string;
  border: string;
  glow: string;
  isDark: true;
}

export const DARK_MODE_CONFIG: DarkModeConfig = {
  name: "dark",
  label: "Dark",
  bg: "#0a0a0a",
  surface: "#141414",
  accent: "#dc143c",
  accentRgb: "220,20,60",
  text: "#f0f0f0",
  textMuted: "rgba(255,255,255,0.58)",
  border: "rgba(255,255,255,0.12)",
  glow: "rgba(220,20,60,0.18)",
  isDark: true,
};

const DarkModeContext = createContext({ config: DARK_MODE_CONFIG });

export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.className = root.className.replace(/\b(light|neon|cyberpunk|minimal|manus|dark)\b/g, "").trim();
    body.className = body.className.replace(/\b(light|neon|cyberpunk|minimal|manus|dark)\b/g, "").trim();
    root.classList.add("dark");
    body.classList.add("dark");
    root.style.colorScheme = "dark";
    root.style.setProperty("--enosx-accent", DARK_MODE_CONFIG.accent);
    root.style.setProperty("--enosx-accent-rgb", DARK_MODE_CONFIG.accentRgb);
    root.style.setProperty("--enosx-bg", DARK_MODE_CONFIG.bg);
    root.style.setProperty("--enosx-surface", DARK_MODE_CONFIG.surface);
    root.style.setProperty("--enosx-text", DARK_MODE_CONFIG.text);
    root.style.setProperty("--enosx-text-muted", DARK_MODE_CONFIG.textMuted);
    root.style.setProperty("--enosx-border", DARK_MODE_CONFIG.border);
    root.style.setProperty("--enosx-glow", DARK_MODE_CONFIG.glow);
    root.style.setProperty("--enosx-is-dark", "1");
    body.style.backgroundColor = DARK_MODE_CONFIG.bg;
    body.style.color = DARK_MODE_CONFIG.text;
    localStorage.removeItem("enosx-theme");
  }, []);

  return <DarkModeContext.Provider value={{ config: DARK_MODE_CONFIG }}>{children}</DarkModeContext.Provider>;
}

export function useDarkMode() {
  return useContext(DarkModeContext);
}
