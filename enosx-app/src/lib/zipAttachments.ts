import JSZip from "jszip";
import type { Attachment } from "@/lib/types";

function safeFilename(name: string, fallback: string) {
  const cleaned = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").trim();
  return cleaned || fallback;
}

function uniqueFilename(name: string, used: Set<string>) {
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const extension = dot > 0 ? name.slice(dot) : "";
  let candidate = name;
  let index = 2;
  while (used.has(candidate)) {
    candidate = `${stem}-${index}${extension}`;
    index += 1;
  }
  used.add(candidate);
  return candidate;
}

function dataUrlToBlob(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,([\s\S]*)$/i);
  if (!match) return null;
  const mimeType = match[1] || "application/octet-stream";
  const payload = match[3] || "";
  if (match[2]) {
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: mimeType });
  }
  return new Blob([decodeURIComponent(payload)], { type: mimeType });
}

async function attachmentToBlob(attachment: Attachment) {
  const source = attachment.content || attachment.url || "";
  const dataBlob = source.startsWith("data:") ? dataUrlToBlob(source) : null;
  if (dataBlob) return dataBlob;
  if (source.startsWith("blob:") || source.startsWith("http://") || source.startsWith("https://")) {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`Could not read ${attachment.name}`);
    return response.blob();
  }
  return new Blob([attachment.content || ""], { type: attachment.mimeType || "application/octet-stream" });
}

export async function createAttachmentsZip(attachments: Attachment[]) {
  if (!attachments.length) throw new Error("At least one attachment is required");
  const zip = new JSZip();
  const usedNames = new Set<string>();
  for (const attachment of attachments) {
    const name = uniqueFilename(safeFilename(attachment.name, `attachment-${attachment.id}`), usedNames);
    zip.file(name, await attachmentToBlob(attachment));
  }
  return zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

export async function downloadAttachmentsZip(attachments: Attachment[], filename = "enosx-attachments.zip") {
  const blob = await createAttachmentsZip(attachments);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".zip") ? filename : `${filename}.zip`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  return blob;
}
