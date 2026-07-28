/**
 * WallpaperBackground — Renders the full-screen background wallpaper
 * with configurable opacity and blur overlay.
 */
import { useWallpaper } from "@/contexts/WallpaperContext";
import { useTheme } from "@/contexts/ThemeContext";

export default function WallpaperBackground() {
  const { activeWallpaperUrl, settings } = useWallpaper();
  const { config } = useTheme();

  return (
    <div className="fixed inset-0 pointer-events-none z-0" aria-hidden>
      {/* Solid base color */}
      <div
        className="absolute inset-0 transition-colors duration-500"
        style={{ background: config.bg }}
      />

      {/* Wallpaper image */}
      {activeWallpaperUrl && (
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{
            backgroundImage: `url(${activeWallpaperUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            opacity: settings.wallpaperOpacity,
          }}
        />
      )}

      {/* Subtle color tint overlay based on theme */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 70% 20%, rgba(${config.accentRgb},0.06) 0%, transparent 60%),
                       radial-gradient(ellipse at 20% 80%, rgba(${config.accentRgb},0.04) 0%, transparent 50%)`,
        }}
      />

      {/* Bottom fade for readability */}
      <div
        className="absolute bottom-0 left-0 right-0 h-48"
        style={{
          background: `linear-gradient(to top, ${config.bg}99, transparent)`,
        }}
      />
    </div>
  );
}
