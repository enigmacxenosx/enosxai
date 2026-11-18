import type { VercelRequest, VercelResponse } from "@vercel/node";
import { deflateRawSync } from "node:zlib";

const MAX_FILES = 10;
const MAX_ENTRY_BYTES = 12 * 1024 * 1024;
const MAX_TOTAL_BYTES = 25 * 1024 * 1024;
const ZIP_MIME = "application/zip";

type ZipAttachment = {
  name?: string;
  type?: string;
  mimeType?: string;
  content?: string;
};

type ZipEntry = {
  name: string;
  data: Buffer;
};

function crc32(data: Buffer) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function safeEntryName(name: string, index: number) {
  const normalized = name
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .join("/")
    .replace(/[^a-zA-Z0-9._() -]/g, "_")
    .trim()
    .slice(0, 180);
  return normalized || `enosx-file-${index + 1}.txt`;
}

function uniqueName(name: string, used: Set<string>, index: number) {
  const base = safeEntryName(name, index);
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  const dot = base.lastIndexOf(".");
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const extension = dot > 0 ? base.slice(dot) : "";
  let suffix = 2;
  let candidate = `${stem}-${suffix}${extension}`;
  while (used.has(candidate)) {
    suffix += 1;
    candidate = `${stem}-${suffix}${extension}`;
  }
  used.add(candidate);
  return candidate;
}

function decodeContent(content: string) {
  const match = content.match(/^data:[^,]*,([\s\S]*)$/);
  if (!match) return Buffer.from(content, "utf8");
  const metadata = content.slice(0, content.indexOf(","));
  return /;base64/i.test(metadata)
    ? Buffer.from(match[1], "base64")
    : Buffer.from(decodeURIComponent(match[1]), "utf8");
}

function createZip(entries: ZipEntry[]) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const crc = crc32(entry.data);
    const compressed = deflateRawSync(entry.data, { level: 6 });
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(entry.data.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, name, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(entry.data.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, name);
    offset += localHeader.length + name.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const attachments = Array.isArray(body?.attachments) ? body.attachments as ZipAttachment[] : [];
    if (attachments.length < 2) return res.status(400).json({ error: "At least two files are required to create a ZIP archive." });
    if (attachments.length > MAX_FILES) return res.status(400).json({ error: `A ZIP archive can contain at most ${MAX_FILES} files.` });

    const usedNames = new Set<string>();
    const entries: ZipEntry[] = [];
    let totalBytes = 0;
    for (const [index, attachment] of attachments.entries()) {
      if (!attachment || typeof attachment.content !== "string") return res.status(400).json({ error: `Attachment ${index + 1} has no content.` });
      const data = decodeContent(attachment.content);
      if (data.length > MAX_ENTRY_BYTES) return res.status(413).json({ error: `Attachment ${index + 1} exceeds the 12MB per-file limit.` });
      totalBytes += data.length;
      if (totalBytes > MAX_TOTAL_BYTES) return res.status(413).json({ error: "The combined ZIP input exceeds the 25MB limit." });
      entries.push({ name: uniqueName(attachment.name || `enosx-file-${index + 1}.txt`, usedNames, index), data });
    }

    const archive = createZip(entries);
    const filename = `enosx-archive-${new Date().toISOString().slice(0, 10)}.zip`;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      filename,
      mimeType: ZIP_MIME,
      size: archive.length,
      content: `data:${ZIP_MIME};base64,${archive.toString("base64")}`,
      entries: entries.map((entry) => ({ name: entry.name, size: entry.data.length })),
    });
  } catch (error) {
    console.error("[API] ZIP creation failed", error);
    return res.status(400).json({ error: "Unable to create the ZIP archive from these files." });
  }
}
