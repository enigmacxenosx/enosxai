import { Archive, Download } from "lucide-react";
import type { Attachment } from "@/lib/types";

function downloadZip(attachment: Attachment) {
  if (!attachment.content) return;
  const link = document.createElement("a");
  link.href = attachment.content;
  link.download = attachment.name || "enosx-archive.zip";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export default function ZipDownloadCard({ attachment }: { attachment: Attachment }) {
  return (
    <div className="flex w-full max-w-[620px] items-center gap-3 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-200">
        <Archive size={18} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-white/85">{attachment.name}</p>
        <p className="mt-0.5 text-[10px] text-white/45">ZIP archive · {Math.max(1, Math.round((attachment.size || 0) / 1024))} KB</p>
      </div>
      <button
        type="button"
        onClick={() => downloadZip(attachment)}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-cyan-200/20 bg-cyan-200/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-200/20"
        title="Download ZIP archive"
      >
        <Download size={14} aria-hidden="true" />
        Download ZIP
      </button>
    </div>
  );
}
