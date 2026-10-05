import { useState } from "react";
import { ExternalLink, Video as VideoIcon } from "lucide-react";

interface VideoDisplayProps {
  src: string;
  openUrl: string;
  title?: string;
  embedded?: boolean;
}

export default function VideoDisplay({ src, openUrl, title = "Online video", embedded = false }: VideoDisplayProps) {
  const [unavailable, setUnavailable] = useState(false);
  const label = title || "Online video";

  return (
    <div className="my-2 w-full max-w-[420px] overflow-hidden rounded-xl border border-white/10 bg-black/40">
      {embedded ? (
        <div className="aspect-video w-full">
          <iframe
            src={src}
            title={label}
            className="h-full w-full border-0"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : unavailable ? (
        <div className="flex items-center justify-between gap-3 p-3 text-xs text-white/70">
          <span className="flex min-w-0 items-center gap-2"><VideoIcon size={16} className="shrink-0 text-violet-300" /><span className="truncate">Could not play {label}</span></span>
          <a href={openUrl} target="_blank" rel="noopener noreferrer" className="flex shrink-0 items-center gap-1 text-cyan-200 hover:text-cyan-100">
            Open source <ExternalLink size={13} />
          </a>
        </div>
      ) : (
        <video
          controls
          playsInline
          preload="metadata"
          src={src}
          onError={() => setUnavailable(true)}
          className="max-h-[350px] w-full bg-black object-contain"
          aria-label={"Play " + label}
        />
      )}
      {embedded && (
        <a href={openUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-2 border-t border-white/10 px-3 py-2 text-[11px] text-white/55 hover:text-white/80">
          <span className="truncate">{label}</span><ExternalLink size={12} className="shrink-0" />
        </a>
      )}
    </div>
  );
}