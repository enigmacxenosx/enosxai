import type { VercelRequest, VercelResponse } from "@vercel/node";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"]);

export const config = { api: { bodyParser: false } };

async function readRequest(req: VercelRequest, limit: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > limit) throw new Error("UPLOAD_TOO_LARGE");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const bridgeUrl = process.env.NVIDIA_VSR_BRIDGE_URL?.trim();
  if (!bridgeUrl) {
    return res.status(503).json({ error: "Video upscaling is not configured. Deploy the NVIDIA VSR bridge and set NVIDIA_VSR_BRIDGE_URL." });
  }

  const contentType = req.headers["content-type"] || "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;")) {
    return res.status(400).json({ error: "Upload a video using multipart/form-data." });
  }
  const contentLength = Number(req.headers["content-length"] || 0);
  if (contentLength > MAX_UPLOAD_BYTES) return res.status(413).json({ error: "Video exceeds the 4 MB serverless upload limit. Use a larger-upload bridge/storage flow." });

  let body: Buffer;
  try {
    body = await readRequest(req, MAX_UPLOAD_BYTES);
  } catch (error) {
    if (error instanceof Error && error.message === "UPLOAD_TOO_LARGE") {
      return res.status(413).json({ error: "Video exceeds the 4 MB serverless upload limit. Use a larger-upload bridge/storage flow." });
    }
    return res.status(400).json({ error: "Could not read uploaded video." });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 110_000);
  try {
    const response = await fetch(bridgeUrl, {
      method: "POST",
      headers: {
        "Content-Type": contentType,
        ...(process.env.NVIDIA_VSR_BRIDGE_TOKEN ? { Authorization: `Bearer ${process.env.NVIDIA_VSR_BRIDGE_TOKEN}` } : {}),
      },
      body: new Uint8Array(body),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null) as { url?: unknown; error?: unknown } | null;
    if (!response.ok) {
      console.error("[VSR] Bridge returned", response.status, payload?.error);
      return res.status(response.status >= 500 ? 502 : response.status).json({ error: typeof payload?.error === "string" ? payload.error : "Video upscaling failed." });
    }
    if (typeof payload?.url !== "string" || !/^https:\/\//i.test(payload.url)) {
      return res.status(502).json({ error: "VSR bridge returned no HTTPS result URL." });
    }
    return res.status(200).json({ url: payload.url });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return res.status(timedOut ? 504 : 502).json({ error: timedOut ? "Video upscaling timed out." : "NVIDIA VSR bridge is unavailable." });
  } finally {
    clearTimeout(timeout);
  }
}
