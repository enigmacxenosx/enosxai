import * as XLSX from "xlsx";
import mammoth from "mammoth";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

type PdfJsModule = typeof import("pdfjs-dist");

let pdfjsPromise: Promise<PdfJsModule> | null = null;

function loadPdfjs(): Promise<PdfJsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist")
      .then((pdfjs) => {
        pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;
        return pdfjs;
      })
      .catch((error) => {
        pdfjsPromise = null;
        throw error;
      });
  }
  return pdfjsPromise;
}

const MAX_TEXT_CHARS = 120_000;
const MAX_IMAGE_BYTES = 200_000;
// Six evenly spaced frames give the vision model a usable timeline while the
// server still caps the total visual payload per request (ten visuals).
const MAX_VIDEO_FRAMES = 6;
// Above this size, skip full waveform decoding and keep metadata only.
const MAX_AUDIO_DECODE_BYTES = 25_000_000;

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
  if (file.type.startsWith("audio/")) return false;
  return file.type.startsWith("video/") || ["mp4", "webm", "mov", "m4v", "avi", "mkv"].includes(extension(file.name));
}

function isAudioFile(file: File) {
  return file.type.startsWith("audio/") || ["mp3", "wav", "ogg", "oga", "m4a", "flac", "aac", "opus", "wma", "aiff", "aif"].includes(extension(file.name));
}

async function readMediaDuration(file: File, kind: "audio" | "video") {
  const url = URL.createObjectURL(file);
  const element = document.createElement(kind);
  element.preload = "metadata";
  element.src = url;
  try {
    await new Promise<void>((resolve, reject) => {
      element.onloadedmetadata = () => resolve();
      element.onerror = () => reject(new Error(`Unable to read ${kind} metadata`));
    });
    return Number.isFinite(element.duration) ? element.duration : 0;
  } finally {
    URL.revokeObjectURL(url);
    element.removeAttribute("src");
    element.load();
  }
}

/**
 * Summarize an audio attachment for the model: duration, channel layout, and a
 * coarse loudness profile per segment. Browsers cannot transcribe file audio
 * here, so the summary is measured data, not a transcript.
 */
async function analyzeAudio(file: File) {
  const duration = await readMediaDuration(file, "audio").catch(() => 0);
  const lines = [`Audio file: ${file.name}.`];
  if (duration > 0) lines.push(`Duration: ${duration.toFixed(1)} seconds.`);

  if (file.size <= MAX_AUDIO_DECODE_BYTES) {
    try {
      const audioWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext };
      const AudioContextConstructor = window.AudioContext ?? audioWindow.webkitAudioContext;
      if (AudioContextConstructor) {
        const context = new AudioContextConstructor();
        try {
          const buffer = await context.decodeAudioData(await file.arrayBuffer());
          const channel = buffer.getChannelData(0);
          const segments = 8;
          const levels: string[] = [];
          for (let segment = 0; segment < segments; segment += 1) {
            const start = Math.floor((channel.length * segment) / segments);
            const end = Math.floor((channel.length * (segment + 1)) / segments);
            const stride = Math.max(1, Math.floor((end - start) / 2_000));
            let sumSquares = 0;
            let samples = 0;
            for (let index = start; index < end; index += stride) {
              const value = channel[index];
              sumSquares += value * value;
              samples += 1;
            }
            const rms = Math.sqrt(sumSquares / Math.max(1, samples));
            levels.push(`${segment + 1}:${(20 * Math.log10(Math.max(rms, 1e-6))).toFixed(0)}dB`);
          }
          lines.push(`Detected ${buffer.numberOfChannels} channel(s) at ${buffer.sampleRate} Hz.`);
          lines.push(`Approximate loudness per eighth of the clip (RMS in dBFS, 0 is loudest): ${levels.join(", ")}.`);
        } finally {
          void context.close();
        }
      }
    } catch {
      lines.push("A waveform profile was not available for this audio file.");
    }
  } else {
    lines.push("The file is too large to profile in the browser; only metadata was captured.");
  }

  lines.push("Note: browser transcription of file audio is not available. Treat the measurements above as the audio evidence you were given, and say plainly when a transcript would be required to answer accurately.");
  return lines.join(" ");
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
  let scale = Math.min(1, 1280 / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  let quality = 0.82;
  let data = "";
  for (let attempt = 0; attempt < 10; attempt += 1) {
    canvas.width = Math.max(1, Math.round(source.width * scale));
    canvas.height = Math.max(1, Math.round(source.height * scale));
    canvas.getContext("2d")?.drawImage(source, 0, 0, canvas.width, canvas.height);
    data = canvas.toDataURL(mime, quality);
    if (data.length <= MAX_IMAGE_BYTES * 1.4) break;
    if (quality > 0.5) quality = Math.max(0.5, quality - 0.12);
    else { scale *= 0.8; quality = 0.72; }
  }
  source.close();
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
    // Sample evenly across the middle of each interval so frames represent the
    // whole clip without depending on its length; long clips spread out, short
    // clips still get multiple distinct moments.
    const frameCount = duration > 0 ? Math.min(MAX_VIDEO_FRAMES, Math.max(2, Math.ceil(duration / 15))) : 1;
    const times = duration > 0
      ? Array.from({ length: frameCount }, (_, index) => Math.min(Math.max(0, duration - 0.05), (duration * (index + 0.5)) / frameCount))
      : [0];
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
    return { frames, times, duration };
  } finally {
    URL.revokeObjectURL(url);
    video.removeAttribute("src");
    video.load();
  }
}

async function extractPdf(file: File) {
  const data = await file.arrayBuffer();
  const { getDocument } = await loadPdfjs();
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
  if (isAudioFile(file)) {
    const analysisContent = await analyzeAudio(file);
    return { content: "", analysisContent, analysisFrames: [] as string[], kind: "audio" as const };
  }
  if (isVideoFile(file)) {
    const { frames: analysisFrames, times, duration } = await sampleVideoFrames(file);
    // Do not serialize the original video into the chat request. The model needs
    // representative frames, which keeps requests within browser and Vercel limits.
    const timeline = times.map((time) => `${time.toFixed(1)}s`).join(", ");
    return {
      content: "",
      analysisContent: `Video file: ${file.name}.${duration > 0 ? ` Duration: ${duration.toFixed(1)} seconds.` : ""} The attached frames are evenly spaced samples at ${timeline}. Describe motion, actions, and scene changes across the timeline in addition to individual frames.`,
      analysisFrames,
      kind: "video" as const,
    };
  }
  const ext = extension(file.name);
  let text = "";
  if (isTextFile(file)) text = await file.text();
  else if (ext === "pdf") {
    try {
      text = await extractPdf(file);
    } catch {
      text = `PDF document ${file.name} is attached. Extractable text was not available in this browser.`;
    }
  }
  else if (ext === "docx" || ["xlsx", "xls"].includes(ext)) text = await extractOffice(file);
  else text = `Binary document ${file.name} (${file.type || "unknown type"}) is attached. Extractable text was not available in the browser.`;
  return { content: text.slice(0, MAX_TEXT_CHARS), analysisContent: text.slice(0, MAX_TEXT_CHARS), analysisFrames: [] as string[], kind: "document" as const };
}
