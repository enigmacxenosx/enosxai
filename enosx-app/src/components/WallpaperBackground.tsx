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

      {/* Premium Iridescent Animated Fog */}
      <div className="absolute inset-0 overflow-hidden opacity-30 pointer-events-none">
        <div 
          className="absolute -inset-[100%] animate-[spin_20s_linear_infinite]"
          style={{
            background: `radial-gradient(circle at 50% 50%, rgba(${config.accentRgb}, 0.15) 0%, rgba(168, 85, 247, 0.1) 30%, transparent 70%)`,
            filter: 'blur(80px)',
          }}
        />
        <div 
          className="absolute -inset-[100%] animate-[spin_35s_linear_infinite_reverse]"
          style={{
            background: `radial-gradient(circle at 30% 70%, rgba(0, 242, 255, 0.1) 0%, rgba(${config.accentRgb}, 0.05) 40%, transparent 80%)`,
            filter: 'blur(100px)',
          }}
        />
      </div>

      {/* Cyberpunk Film Grain Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Subtle color tint overlay based on theme */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 70% 20%, rgba(${config.accentRgb},0.08) 0%, transparent 60%),
                       radial-gradient(ellipse at 20% 80%, rgba(${config.accentRgb},0.06) 0%, transparent 50%)`,
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
