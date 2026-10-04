import * as XLSX from "xlsx";
import mammoth from "mammoth";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

GlobalWorkerOptions.workerSrc = pdfWorker;

const MAX_TEXT_CHARS = 120_000;
const MAX_IMAGE_BYTES = 1_500_000;
const MAX_VIDEO_FRAMES = 4;

function extension(name: string) {
  return name.split(".").pop()?.toLowerCase() || "";
}

function isTextFile(file: File) {
  return file.type.startsWith("text/") || [
    "txt", "md", "log", "json", "js", "ts", "tsx", "jsx", "py", "java", "c", "cpp", "h", "xml", "html", "css", "sql", "yaml", "yml", "csv", "rtf"
  ].includes(extension(file.name));
}

function isImageFile(file: File) {
  return file.type.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp"].includes(extension(file.name));
}

function isVideoFile(file: File) {
  return file.type.startsWith("video/") || ["mp4", "webm", "mov", "m4v", "avi", "mkv"].includes(extension(file.name));
}

async function readDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}

async function compressImage(file: Blob, mime = "image/jpeg") {
  const source = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  canvas.getContext("2d")?.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close();
  let quality = 0.82;
  let data = canvas.toDataURL(mime, quality);
  while (data.length > MAX_IMAGE_BYTES * 1.4 && quality > 0.45) {
    quality -= 0.1;
    data = canvas.toDataURL(mime, quality);
  }
  return data;
}

async function sampleVideoFrames(file: File) {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "metadata";
  video.muted = true;
  video.playsInline = true;
  video.src = url;
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Unable to decode video"));
    });
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const times = duration > 0 ? Array.from({ length: Math.min(MAX_VIDEO_FRAMES, Math.max(1, Math.ceil(duration / 30))) }, (_, i) => Math.min(duration - 0.05, (duration * (i + 1)) / (Math.min(MAX_VIDEO_FRAMES, Math.max(1, Math.ceil(duration / 30))) + 1))) : [0];
    const frames: string[] = [];
    const canvas = document.createElement("canvas");
    for (const time of times) {
      video.currentTime = Math.max(0, time);
      await new Promise<void>((resolve) => { video.onseeked = () => resolve(); });
      const scale = Math.min(1, 1280 / Math.max(video.videoWidth || 1280, video.videoHeight || 720));
      canvas.width = Math.max(1, Math.round((video.videoWidth || 1280) * scale));
      canvas.height = Math.max(1, Math.round((video.videoHeight || 720) * scale));
      canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push(canvas.toDataURL("image/jpeg", 0.72));
    }
    return frames;
  } finally {
    URL.revokeObjectURL(url);
    video.removeAttribute("src");
    video.load();
  }
}

async function extractPdf(file: File) {
  const data = await file.arrayBuffer();
  const pdf = await getDocument({ data }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= Math.min(pdf.numPages, 40); i += 1) {
    const page = await pdf.getPage(i);
    const text = await page.getTextContent();
    pages.push(text.items.map((item: any) => item.str || "").join(" "));
  }
  return pages.join("\n\n").slice(0, MAX_TEXT_CHARS);
}

async function extractOffice(file: File) {
  const data = await file.arrayBuffer();
  const ext = extension(file.name);
  if (ext === "docx") {
    const result = await mammoth.extractRawText({ arrayBuffer: data });
    return result.value.slice(0, MAX_TEXT_CHARS);
  }
  const workbook = XLSX.read(data, { type: "array" });
  return workbook.SheetNames.map((name) => `## ${name}\n${XLSX.utils.sheet_to_csv(workbook.Sheets[name])}`).join("\n\n").slice(0, MAX_TEXT_CHARS);
}

export async function analyzeFile(file: File) {
  if (isImageFile(file)) {
    const content = await compressImage(file);
    return { content, analysisContent: "", analysisFrames: [] as string[], kind: "image" as const };
  }
  if (isVideoFile(file)) {
    const [analysisFrames] = await Promise.all([sampleVideoFrames(file)]);
    // Do not serialize the original video into the chat request. The model needs
    // representative frames, which keeps requests within browser and Vercel limits.
    return { content: "", analysisContent: `Video file: ${file.name}. The attached frames are representative samples from the video.`, analysisFrames, kind: "video" as const };
  }
  const ext = extension(file.name);
  let text = "";
  if (isTextFile(file)) text = await file.text();
  else if (ext === "pdf") text = await extractPdf(file);
  else if (ext === "docx" || ["xlsx", "xls"].includes(ext)) text = await extractOffice(file);
  else text = `Binary document ${file.name} (${file.type || "unknown type"}) is attached. Extractable text was not available in the browser.`;
  return { content: text.slice(0, MAX_TEXT_CHARS), analysisContent: text.slice(0, MAX_TEXT_CHARS), analysisFrames: [] as string[], kind: "document" as const };
}
