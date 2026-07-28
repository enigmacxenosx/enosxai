/**
 * WallpaperContext — Manages background wallpaper, blur, and transparency settings.
 * Persists all preferences to localStorage.
 */
import React, { createContext, useContext, useEffect, useState } from "react";

export interface WallpaperPreset {
  id: string;
  label: string;
  url: string;
  thumbnail: string;
}

export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    id: "none",
    label: "None",
    url: "",
    thumbnail: "",
  },
  {
    id: "lavender",
    label: "Lavender Field",
    url: "/lavender-field-optimized.webp",
    thumbnail: "/lavender-field-optimized.webp",
  },
  {
    id: "aurora",
    label: "Aurora",
    url: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1920&q=80",
    thumbnail: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=400&q=60",
  },
  {
    id: "cosmos",
    label: "Cosmos",
    url: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1920&q=80",
    thumbnail: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=400&q=60",
  },
  {
    id: "forest",
    label: "Forest",
    url: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80",
    thumbnail: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&q=60",
  },
  {
    id: "ocean",
    label: "Ocean",
    url: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1920&q=80",
    thumbnail: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=400&q=60",
  },
  {
    id: "city",
    label: "City Lights",
    url: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1920&q=80",
    thumbnail: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&q=60",
  },
  {
    id: "mountains",
    label: "Mountains",
    url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80",
    thumbnail: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&q=60",
  },
  {
    id: "abstract",
    label: "Abstract",
    url: "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=1920&q=80",
    thumbnail: "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=400&q=60",
  },
  {
    id: "gradient",
    label: "Gradient",
    url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1920&q=80",
    thumbnail: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&q=60",
  },
  {
    id: "cyberpunk",
    label: "Cyberpunk",
    url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1920&q=80",
    thumbnail: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=60",
  },
  {
    id: "dark-car-1",
    label: "Dark Car - Neon",
    url: "/wallpapers/dark-car-1.png",
    thumbnail: "/wallpapers/dark-car-1.png",
  },
  {
    id: "dark-car-2",
    label: "Dark Car - Race",
    url: "/wallpapers/dark-car-2.png",
    thumbnail: "/wallpapers/dark-car-2.png",
  },
  {
    id: "dark-circuits",
    label: "Dark Circuits",
    url: "/wallpapers/dark-circuits.png",
    thumbnail: "/wallpapers/dark-circuits.png",
  },
  {
    id: "light-circuits",
    label: "Light Circuits",
    url: "/wallpapers/light-circuits.png",
    thumbnail: "/wallpapers/light-circuits.png",
  },
  // ── ENOSX Exclusive Wallpapers ──────────────────────────────────────────────
  {
    id: "enosx-dark-car",
    label: "ENOSX Dark Car",
    url: "/wallpapers/enosx-dark-car.png",
    thumbnail: "/wallpapers/enosx-dark-car.png",
    badge: "ENOSX",
  } as WallpaperPreset & { badge?: string },
  {
    id: "enosx-ex-circuits",
    label: "EX Circuits",
    url: "/wallpapers/enosx-ex-circuits.png",
    thumbnail: "/wallpapers/enosx-ex-circuits.png",
    badge: "ENOSX",
  } as WallpaperPreset & { badge?: string },
  {
    id: "enosx-neon-city",
    label: "Neon City",
    url: "/wallpapers/enosx-neon-city.png",
    thumbnail: "/wallpapers/enosx-neon-city.png",
    badge: "ENOSX",
  } as WallpaperPreset & { badge?: string },
  {
    id: "enosx-galaxy-tech",
    label: "Galaxy Tech",
    url: "/wallpapers/enosx-galaxy-tech.png",
    thumbnail: "/wallpapers/enosx-galaxy-tech.png",
    badge: "ENOSX",
  } as WallpaperPreset & { badge?: string },
];

export interface WallpaperSettings {
  /** ID of the active preset, or "custom" for user-uploaded */
  activePresetId: string;
  /** Custom URL if user uploaded or pasted their own */
  customUrl: string;
  /** Backdrop blur amount in pixels (0–40) */
  blurAmount: number;
  /** Panel opacity (0.0–1.0) */
  panelOpacity: number;
  /** Wallpaper overlay opacity (0.0–1.0) */
  wallpaperOpacity: number;
}

const DEFAULT_SETTINGS: WallpaperSettings = {
  activePresetId: "enosx-neon-city",
  customUrl: "",
  blurAmount: 10,
  panelOpacity: 0.75,
  wallpaperOpacity: 1.0,
};

interface WallpaperContextType {
  settings: WallpaperSettings;
  activeWallpaperUrl: string;
  setPreset: (id: string) => void;
  setCustomUrl: (url: string) => void;
  setBlurAmount: (v: number) => void;
  setPanelOpacity: (v: number) => void;
  setWallpaperOpacity: (v: number) => void;
  resetToDefaults: () => void;
}

const WallpaperContext = createContext<WallpaperContextType | undefined>(undefined);

function loadSettings(): WallpaperSettings {
  try {
    const raw = localStorage.getItem("enosx-wallpaper-settings");
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

function saveSettings(s: WallpaperSettings) {
  try {
    localStorage.setItem("enosx-wallpaper-settings", JSON.stringify(s));
  } catch {}
}

export function WallpaperProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<WallpaperSettings>(loadSettings);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const activeWallpaperUrl =
    settings.activePresetId === "custom"
      ? settings.customUrl
      : settings.activePresetId === "none"
      ? ""
      : WALLPAPER_PRESETS.find((p) => p.id === settings.activePresetId)?.url ?? "";

  const setPreset = (id: string) =>
    setSettings((s) => ({ ...s, activePresetId: id }));

  const setCustomUrl = (url: string) =>
    setSettings((s) => ({ ...s, activePresetId: "custom", customUrl: url }));

  const setBlurAmount = (v: number) =>
    setSettings((s) => ({ ...s, blurAmount: Math.max(0, Math.min(40, v)) }));

  const setPanelOpacity = (v: number) =>
    setSettings((s) => ({ ...s, panelOpacity: Math.max(0.1, Math.min(1, v)) }));

  const setWallpaperOpacity = (v: number) =>
    setSettings((s) => ({ ...s, wallpaperOpacity: Math.max(0.1, Math.min(1, v)) }));

  const resetToDefaults = () => setSettings(DEFAULT_SETTINGS);

  return (
    <WallpaperContext.Provider
      value={{
        settings,
        activeWallpaperUrl,
        setPreset,
        setCustomUrl,
        setBlurAmount,
        setPanelOpacity,
        setWallpaperOpacity,
        resetToDefaults,
      }}
    >
      {children}
    </WallpaperContext.Provider>
  );
}

export function useWallpaper() {
  const ctx = useContext(WallpaperContext);
  if (!ctx) throw new Error("useWallpaper must be used within WallpaperProvider");
  return ctx;
}
