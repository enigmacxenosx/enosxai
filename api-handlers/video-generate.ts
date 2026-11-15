import type { VercelRequest, VercelResponse } from "@vercel/node";

const NVIDIA_COSMOS3_ENDPOINT = "https://ai.api.nvidia.com/v1/cosmos/nvidia/cosmos3-nano";
const MAX_PROMPT_LENGTH = 800;
const MAX_IMAGE_LENGTH = 8_000_000;
const NVIDIA_TIMEOUT_MS = 115_000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed", status: "METHOD_NOT_ALLOWED" });
  }

  const apiKey = (process.env.NVIDIA_VIDEO_API_KEY || process.env.NVIDIA_API_KEY)?.trim();
  if (!apiKey) {
    return res.status(503).json({ error: "NVIDIA video generation is not configured on the server.", status: "CONFIGURATION_ERROR" });
  }

  let body: any;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  } catch {
    return res.status(400).json({ error: "Invalid request body", status: "PARSE_ERROR" });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) return res.status(400).json({ error: "Prompt is required", status: "MISSING_PROMPT" });
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return res.status(400).json({ error: `Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters`, status: "PROMPT_TOO_LONG" });
  }

  const image = typeof body.image === "string" ? body.image.trim() : "";
  if (image.length > MAX_IMAGE_LENGTH || (image && !/^data:image\/(?:png|jpe?g|webp);base64,[a-z0-9+/=\s]+$/i.test(image))) {
    return res.status(400).json({ error: "image must be a PNG, JPEG, or WebP base64 data URL under 8MB", status: "INVALID_IMAGE" });
  }

  const payload = {
    model_mode: image ? "image2video" : "text2video",
    prompt,
    ...(image ? { input_reference: image } : {}),
    resolution: "480_16_9",
    num_frames: 25,
    num_inference_steps: 35,
    fps: 24,
    seed: 0,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NVIDIA_TIMEOUT_MS);
  try {
    const response = await fetch(NVIDIA_COSMOS3_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const responseText = await response.text();
    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = null;
    }

    if (!response.ok) {
      console.error("[VIDEO] NVIDIA Cosmos3 Nano error:", response.status, responseText.slice(0, 500));
      if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after");
        if (retryAfter) res.setHeader("Retry-After", retryAfter);
        return res.status(429).json({ error: "NVIDIA is rate-limiting video generation. Please retry shortly.", status: "RATE_LIMITED", retryable: true });
      }
      if (response.status === 408 || response.status === 504) {
        return res.status(504).json({ error: "NVIDIA video generation timed out. Please retry after checking whether the request completed.", status: "UPSTREAM_TIMEOUT", retryable: true });
      }
      return res.status(response.status >= 500 ? 502 : response.status).json({
        error: response.status === 422 ? "NVIDIA refused this video prompt or input. Try a different prompt or image." : "NVIDIA video generation failed.",
        status: response.status === 422 ? "GENERATION_REFUSED" : "UPSTREAM_ERROR",
      });
    }

    const base64 = typeof data?.b64_video === "string" ? data.b64_video.replace(/\s+/g, "") : "";
    if (!base64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
      return res.status(502).json({ error: "NVIDIA returned no usable video.", status: "GENERATION_FAILED" });
    }
    return res.status(200).json({ url: `data:video/mp4;base64,${base64}`, media_type: "video/mp4", model: "nvidia/cosmos3-nano" });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return res.status(504).json({ error: "NVIDIA video generation took too long. Check the conversation before retrying to avoid duplicate generation.", status: "UPSTREAM_TIMEOUT", retryable: false });
    }
    console.error("[VIDEO] NVIDIA request failed:", error);
    return res.status(502).json({ error: "NVIDIA video generation service is unavailable.", status: "UPSTREAM_ERROR" });
  } finally {
    clearTimeout(timeout);
  }
}
