import { useState } from "react";
import { ExternalLink, Music2 } from "lucide-react";

interface AudioDisplayProps {
  src: string;
  openUrl: string;
  title?: string;
  embedded?: boolean;
}

export default function AudioDisplay({ src, openUrl, title = "Online audio", embedded = false }: AudioDisplayProps) {
  const [unavailable, setUnavailable] = useState(false);
  const label = title || "Online audio";

  return (
    <div className="my-2 w-full max-w-[520px] overflow-hidden rounded-xl border border-white/10 bg-black/30">
      {embedded ? (
        <>
          <iframe
            src={src}
            title={label}
            className="h-[166px] w-full border-0"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          />
          <a href={openUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-2 border-t border-white/10 px-3 py-2 text-[11px] text-white/55 hover:text-white/80">
            <span className="truncate">Open {label}</span><ExternalLink size={12} className="shrink-0" />
          </a>
        </>
      ) : unavailable ? (
        <div className="flex items-center justify-between gap-3 p-3 text-xs text-white/70">
          <span className="flex min-w-0 items-center gap-2"><Music2 size={16} className="shrink-0 text-cyan-300" /><span className="truncate">Could not play {label}</span></span>
          <a href={openUrl} target="_blank" rel="noopener noreferrer" className="flex shrink-0 items-center gap-1 text-cyan-200 hover:text-cyan-100">
            Open source <ExternalLink size={13} />
          </a>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3">
          <Music2 size={18} className="shrink-0 text-cyan-300" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="mb-1 truncate text-xs font-medium text-white/80">{label}</div>
            <audio controls preload="metadata" src={src} onError={() => setUnavailable(true)} className="h-8 w-full" aria-label={`Play ${label}`} />
          </div>
          <a href={openUrl} target="_blank" rel="noopener noreferrer" aria-label="Open audio source" className="shrink-0 text-white/45 hover:text-white/80">
            <ExternalLink size={14} />
          </a>
        </div>
      )}
    </div>
  );
}
