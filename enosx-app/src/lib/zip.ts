import type { Attachment } from "@/lib/types";

export function isZipGenerationRequest(text: string, fileCount: number) {
  if (fileCount < 2) return false;
  const normalized = text.trim().toLowerCase();
  return /\b(zip|zipped|zipfile|archive|compress|compressed)\b/.test(normalized)
    && /\b(file|files|attachment|attachments|image|images|document|documents|these|them)\b/.test(normalized);
}

export async function generateZipArchive(attachments: Attachment[]): Promise<Attachment> {
  const response = await fetch("/api/zip", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attachments }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload.content !== "string") {
    throw new Error(payload.error || "Unable to create the ZIP archive.");
  }
  return {
    id: `zip-${Date.now()}`,
    name: payload.filename || "enosx-archive.zip",
    type: "zip",
    size: Number(payload.size) || 0,
    mimeType: "application/zip",
    content: payload.content,
  };
}
