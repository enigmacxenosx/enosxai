import React, { useState, useEffect } from "react";
import { useWallpaper } from "@/contexts/WallpaperContext";
import { BackgroundPicker } from "./BackgroundPicker";
import { useTheme } from "@/contexts/ThemeContext";

interface GlobalLayoutProps {
  children: React.ReactNode;
}

export function GlobalLayout({ children }: GlobalLayoutProps) {
  const { settings, activeWallpaperUrl } = useWallpaper();
  const { config } = useTheme();
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Expose settings handler globally for Sidebar
  React.useEffect(() => {
    (window as any).__openBackgroundPicker = () => setShowBackgroundPicker(true);
  }, []);

  // Preload wallpaper image
  useEffect(() => {
    setIsLoaded(false);
    if (activeWallpaperUrl) {
      const img = new Image();
      img.src = activeWallpaperUrl;
      img.onload = () => setIsLoaded(true);
      img.onerror = () => setIsLoaded(true); // Still show even if load fails
    } else {
      setIsLoaded(true); // No wallpaper, show immediately
    }
  }, [activeWallpaperUrl]);

  return (
    <div
      className="neon-dashboard-stage w-screen h-dvh overflow-hidden relative"
      style={{
        backgroundColor: config.bg,
      }}
    >
      {/* Main wallpaper with smooth fade-in */}
      {activeWallpaperUrl && (
        <div
          className={`absolute inset-0 z-0 transition-opacity duration-700 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
          style={{
            backgroundImage: `url(${activeWallpaperUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            willChange: "opacity",
          }}
        />
      )}

      {/* Blur overlay */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backdropFilter: `blur(${settings.blurAmount}px)`,
          WebkitBackdropFilter: `blur(${settings.blurAmount}px)`,
          backgroundColor: config.isDark
            ? `rgba(0, 0, 0, ${1 - settings.wallpaperOpacity})`
            : `rgba(244, 246, 251, ${Math.min(0.94, 1 - settings.wallpaperOpacity + 0.18)})`,
          willChange: "backdrop-filter",
        }}
      />

      {/* Main content with relative z-index */}
      <div className="relative z-10 w-full h-full" data-settings-handler={true}>
        {children}
      </div>

      {/* Background Picker Modal */}
      <BackgroundPicker
        isOpen={showBackgroundPicker}
        onClose={() => setShowBackgroundPicker(false)}
        onBackgroundChange={(bg) => {
          // This is handled by ProfilePanel now, but keep for compatibility
        }}
      />
    </div>
  );
}
