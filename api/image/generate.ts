/**
 * ENOSX AI — /api/image/generate (Vercel Serverless Function)
 * Generates images through the configured NVIDIA image endpoint. Credentials
 * remain server-side and the browser receives a self-contained data URL so
 * generated images remain downloadable after a chat is reloaded. The NVIDIA
 * OpenAI-compatible `/v1/images/generations` route supports Qwen Image.
 *
 * Server-only environment variables:
 *   - NVIDIA_IMAGE_API_KEY (required for image generation; falls back to NVIDIA_API_KEY)
 *   - NVIDIA_API_KEY (legacy/shared fallback)
 *   - NVIDIA_IMAGE_ENDPOINT (required)
 *   - NVIDIA_IMAGE_MODEL (optional)
 *
 * Request body:
 *   { prompt: string, image?: string, mode?: string, width?: number,
 *     height?: number, cfg_scale?: number, steps?: number, seed?: number }
 *
 * `image` may be a data URL or base64-encoded RGB image for compatible edit
 * endpoints. Qwen Image's hosted generation endpoint accepts text prompts only.
 *
 * Response:
 *   { url: string, revised_prompt?: string, media_type: string } — 200
 *   { error: string, status: string } — 4xx/5xx
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

const DEFAULT_PROMPT = "Create a polished image based on the supplied prompt.";
const DEFAULT_WIDTH = 512;
const DEFAULT_HEIGHT = 512;
const MAX_PROMPT_LENGTH = 800;
const MAX_IMAGE_LENGTH = 8_000_000;

function asBoundedNumber(value: unknown, fallback: number, min: number, max: number) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function extractImagePayload(data: any) {
  const candidates = [
    data?.image,
    data?.images?.[0],
    data?.data?.[0]?.url,
    data?.data?.[0]?.b64_json,
    data?.data?.[0]?.image,
    data?.artifacts?.[0]?.base64,
    data?.output?.images?.[0],
    data?.result?.image,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string" || candidate.length === 0) continue;
    if (candidate.startsWith("http://") || candidate.startsWith("https://")) {
      return { url: candidate, mediaType: "image/png" };
    }
    if (candidate.startsWith("data:image/")) {
      const mediaType = candidate.slice(5, candidate.indexOf(";"));
      return { url: candidate, mediaType: mediaType || "image/png" };
    }
    return { url: `data:image/png;base64,${candidate}`, mediaType: "image/png" };
  }

  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed", status: "METHOD_NOT_ALLOWED" });
  }

  const apiKey = (process.env.NVIDIA_IMAGE_API_KEY || process.env.NVIDIA_API_KEY)?.trim();
  const endpoint = process.env.NVIDIA_IMAGE_ENDPOINT?.trim();
  if (!apiKey || !endpoint) {
    console.error("[IMAGE] NVIDIA image credentials are not configured.");
    return res.status(503).json({
      error: "NVIDIA image generation is not configured on the server",
      status: "CONFIGURATION_ERROR",
    });
  }

  let body: any = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  } catch (error) {
    console.error("[IMAGE] Failed to parse request body:", error);
    return res.status(400).json({ error: "Invalid request body", status: "PARSE_ERROR" });
  }

  const prompt = (body.prompt || DEFAULT_PROMPT).toString().trim();
  if (!prompt) {
    return res.status(400).json({ error: "prompt is required", status: "MISSING_PROMPT" });
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return res.status(400).json({
      error: `Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters`,
      status: "PROMPT_TOO_LONG",
    });
  }

  const image = typeof body.image === "string" ? body.image.trim() : "";
  const model = process.env.NVIDIA_IMAGE_MODEL?.trim();
  const usesOpenAiImageApi = /\/v1\/images\/generations\/?$/i.test(endpoint);
  const requiresInputImage = /nvpcb|image-edit/i.test(model || "");
  if (usesOpenAiImageApi && image) {
    return res.status(400).json({
      error: "The configured Qwen Image generation endpoint accepts text prompts only; remove the attached image and try again",
      status: "IMAGE_INPUT_NOT_SUPPORTED",
    });
  }
  if (requiresInputImage && !image) {
    return res.status(400).json({
      error: "An input PCB image is required for the configured NVIDIA image-edit model",
      status: "MISSING_IMAGE",
    });
  }
  if (image) {
    const isDataUrl = /^data:image\/(png|jpe?g|webp);base64,[a-z0-9+/=\s]+$/i.test(image);
    const isRawBase64 = /^[a-z0-9+/=\s]+$/i.test(image);
    if ((!isDataUrl && !isRawBase64) || image.length > MAX_IMAGE_LENGTH) {
      return res.status(400).json({
        error: "image must be a PNG, JPEG, or WebP base64 data URL under 8MB",
        status: "INVALID_IMAGE",
      });
    }
  }
  const imagePayload = image && image.startsWith("data:image/") ? image : image ? `data:image/png;base64,${image}` : "";
  const payload: Record<string, unknown> = usesOpenAiImageApi
    ? {
        model: model || "qwen-image",
        prompt,
        n: 1,
        response_format: "b64_json",
        cfg_scale: asBoundedNumber(body.cfg_scale, 4, 1.01, 20),
        steps: asBoundedNumber(body.steps, 30, 5, 100),
      }
    : {
        prompt,
        mode: typeof body.mode === "string" && body.mode.trim() ? body.mode.trim() : imagePayload ? "img2img" : "text2img",
        width: asBoundedNumber(body.width, DEFAULT_WIDTH, 64, 2048),
        height: asBoundedNumber(body.height, DEFAULT_HEIGHT, 64, 2048),
        cfg_scale: asBoundedNumber(body.cfg_scale, 7, 0, 20),
        steps: asBoundedNumber(body.steps, 30, 1, 150),
      };
  if (usesOpenAiImageApi && (body.width !== undefined || body.height !== undefined)) {
    const width = asBoundedNumber(body.width, DEFAULT_WIDTH, 512, 1664);
    const height = asBoundedNumber(body.height, DEFAULT_HEIGHT, 512, 1664);
    payload.size = `${width}x${height}`;
  }
  if (body.seed !== undefined) payload.seed = asBoundedNumber(body.seed, 0, 0, 2_147_483_647);
  if (!usesOpenAiImageApi && model) payload.model = model;
  if (!usesOpenAiImageApi && imagePayload) payload.image = imagePayload;

  console.log("[IMAGE] Generating with NVIDIA image endpoint", {
    model: model || "endpoint-default",
    hasInputImage: Boolean(imagePayload),
    promptLength: prompt.length,
  });

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    const data = (() => {
      try {
        return JSON.parse(responseText);
      } catch {
        return null;
      }
    })();

    if (!response.ok) {
      console.error("[IMAGE] NVIDIA image API error:", response.status, responseText.slice(0, 500));
      return res.status(response.status >= 500 ? 502 : response.status).json({
        error: "NVIDIA image generation failed",
        status: "UPSTREAM_ERROR",
      });
    }

    const imagePayload = extractImagePayload(data);
    if (!imagePayload) {
      console.error("[IMAGE] NVIDIA response did not contain a supported image payload:", responseText.slice(0, 1000));
      return res.status(502).json({
        error: "NVIDIA image generation returned no usable image",
        status: "GENERATION_FAILED",
      });
    }

    return res.status(200).json({
      url: imagePayload.url,
      revised_prompt: data?.revised_prompt || data?.data?.[0]?.revised_prompt,
      media_type: imagePayload.mediaType,
    });
  } catch (error) {
    console.error("[IMAGE] NVIDIA request failed:", error);
    return res.status(502).json({
      error: "NVIDIA image generation service is unavailable",
      status: "UPSTREAM_ERROR",
    });
  }
}
