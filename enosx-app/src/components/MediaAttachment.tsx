import { Download, FileText, Music2, Paperclip, Video } from "lucide-react";
import { Attachment } from "@/lib/types";

interface MediaAttachmentProps {
  attachment: Attachment;
  compact?: boolean;
}

const AUDIO_EXTENSIONS = ["mp3", "wav", "ogg", "m4a", "flac", "aac", "opus"];
const VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "avi", "mkv", "m4v"];
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "svg"];

function getKind(attachment: Attachment) {
  const mime = attachment.mimeType || "";
  const ext = attachment.type.toLowerCase();
  if (mime.startsWith("image/") || IMAGE_EXTENSIONS.includes(ext)) return "image";
  if (mime.startsWith("audio/") || AUDIO_EXTENSIONS.includes(ext)) return "audio";
  if (mime.startsWith("video/") || VIDEO_EXTENSIONS.includes(ext)) return "video";
  return "file";
}

function getSource(attachment: Attachment) {
  return attachment.content || attachment.url || "";
}

function downloadTextAttachment(attachment: Attachment) {
  const blob = new Blob([attachment.content], { type: attachment.mimeType || "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = attachment.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function MediaAttachment({ attachment, compact = false }: MediaAttachmentProps) {
  const kind = getKind(attachment);
  const source = getSource(attachment);
  const wrapperClass = compact
    ? "flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-2"
    : "flex w-full max-w-[360px] flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.05] p-3";

  if (kind === "image") {
    return <img src={source} alt={attachment.name} title={attachment.name} className={compact ? "h-10 w-10 rounded-lg object-cover" : "max-h-[280px] max-w-full rounded-xl object-contain"} />;
  }

  if (kind === "audio") {
    return (
      <div className={wrapperClass}>
        <Music2 size={compact ? 16 : 20} className="shrink-0 text-cyan-300" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-white/85">{attachment.name}</div>
          <audio controls preload="metadata" src={source} className="mt-1 h-8 w-full min-w-[180px]" aria-label={"Play " + attachment.name} />
        </div>
      </div>
    );
  }

  if (kind === "video") {
    return (
      <div className={wrapperClass}>
        <video controls preload="metadata" src={source} className={compact ? "max-h-28 w-48 rounded-lg object-cover" : "max-h-[280px] w-full rounded-xl object-contain"} aria-label={"Play " + attachment.name} />
        <div className="flex items-center gap-2 text-xs text-white/60"><Video size={14} className="text-violet-300" />{attachment.name}</div>
      </div>
    );
  }

  const canUseSource = source.startsWith("data:") || source.startsWith("blob:") || source.startsWith("http");
  return (
    <button
      type="button"
      className={wrapperClass + " text-left transition-colors hover:border-cyan-300/40 hover:bg-white/[0.08]"}
      onClick={() => {
        if (canUseSource) {
          const link = document.createElement("a");
          link.href = source;
          link.download = attachment.name;
          link.click();
        } else {
          downloadTextAttachment(attachment);
        }
      }}
      title={"Download " + attachment.name}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300"><Paperclip size={16} /></span>
      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white/85">{attachment.name}</span>
      <Download size={14} className="shrink-0 text-white/45" />
      {!compact && <FileText size={14} className="shrink-0 text-white/35" />}
    </button>
  );
}
