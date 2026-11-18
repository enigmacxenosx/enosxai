import { Archive, Loader2 } from "lucide-react";
import { useState } from "react";
import type { Attachment } from "@/lib/types";
import { downloadAttachmentsZip } from "@/lib/zipAttachments";

interface ZipDownloadButtonProps {
  attachments: Attachment[];
  filename?: string;
  compact?: boolean;
}

export default function ZipDownloadButton({ attachments, filename = "enosx-attachments.zip", compact = false }: ZipDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!attachments.length) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);
    try {
      await downloadAttachmentsZip(attachments, filename);
    } catch (downloadError) {
      console.error("[ZipDownloadButton] ZIP creation failed:", downloadError);
      setError("ZIP download failed");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className={compact ? "inline-flex flex-col items-end gap-1" : "flex flex-col items-start gap-1"}>
      <button
        type="button"
        onClick={() => void handleDownload()}
        disabled={isDownloading}
        className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/20 bg-cyan-300/[0.07] px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/[0.14] disabled:cursor-wait disabled:opacity-60"
        title={`Download ${attachments.length} file${attachments.length === 1 ? "" : "s"} as ZIP`}
      >
        {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
        {isDownloading ? "Compressing…" : "Download ZIP"}
        <span className="text-cyan-100/55">({attachments.length})</span>
      </button>
      {error && <span role="status" className="text-[11px] text-red-300/80">{error}</span>}
    </div>
  );
}
