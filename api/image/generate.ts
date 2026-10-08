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
import sharp from "sharp";

const DEFAULT_PROMPT = "Create a polished image based on the supplied prompt.";
const DEFAULT_WIDTH = 512;
const DEFAULT_HEIGHT = 512;
const MAX_PROMPT_LENGTH = 800;
const MAX_IMAGE_LENGTH = 8_000_000;
const NVIDIA_HOSTED_FLUX_ENDPOINT = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-dev";

function asBoundedNumber(value: unknown, fallback: number, min: number, max: number) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function extractImagePayload(data: any) {
  const candidates = [
    data?.image,
    data?.images?.[0],
    data?.data?.[0],
    data?.artifacts?.[0],
    data?.output?.images?.[0],
    data?.output?.[0],
    data?.result?.image,
    data?.result?.images?.[0],
    data?.result?.artifacts?.[0],
    data?.response?.artifacts?.[0],
    data?.data?.artifacts?.[0],
    data?.artifact,
  ];

  for (const rawCandidate of candidates) {
    const candidate = typeof rawCandidate === "string"
      ? rawCandidate
      : rawCandidate && typeof rawCandidate === "object"
        ? rawCandidate.url || rawCandidate.image_url || rawCandidate.b64_json || rawCandidate.base64 || rawCandidate.image || rawCandidate.data
        : null;
    if (typeof candidate !== "string" || candidate.length === 0) continue;
    if (candidate.startsWith("http://") || candidate.startsWith("https://")) {
      return { url: candidate, mediaType: rawCandidate?.mime_type || rawCandidate?.media_type || "image/png" };
    }
    if (candidate.startsWith("data:image/")) {
      const mediaType = candidate.slice(5, candidate.indexOf(";"));
      return { url: candidate, mediaType: mediaType || "image/png" };
    }
    const mediaType = rawCandidate && typeof rawCandidate === "object"
      ? rawCandidate.mime_type || rawCandidate.media_type || "image/png"
      : "image/png";
    return { url: `data:${mediaType};base64,${candidate}`, mediaType };
  }

  return null;
}

async function applyEnosxWatermark(imageUrl: string) {
  let input: Buffer;
  if (imageUrl.startsWith("data:image/")) {
    const comma = imageUrl.indexOf(",");
    if (comma < 0) throw new Error("Invalid generated image data URL");
    input = Buffer.from(imageUrl.slice(comma + 1), "base64");
  } else {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Generated image download failed with ${response.status}`);
    input = Buffer.from(await response.arrayBuffer());
  }

  const source = sharp(input);
  const metadata = await source.metadata();
  const width = metadata.width || DEFAULT_WIDTH;
  const height = metadata.height || DEFAULT_HEIGHT;
  const fontSize = Math.max(18, Math.round(Math.min(width, height) * 0.035));
  const paddingX = Math.max(14, Math.round(fontSize * 0.65));
  const paddingY = Math.max(10, Math.round(fontSize * 0.45));
  const textWidth = Math.round(fontSize * 5.7);
  const boxWidth = textWidth + paddingX * 2;
  const boxHeight = fontSize + paddingY * 2;
  const margin = Math.max(14, Math.round(Math.min(width, height) * 0.03));
  const x = width - boxWidth - margin;
  const y = height - boxHeight - margin;
  const watermark = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect x="${x}" y="${y}" width="${boxWidth}" height="${boxHeight}" rx="${Math.round(boxHeight * 0.25)}" fill="#05070c" fill-opacity="0.62"/><text x="${x + paddingX}" y="${y + paddingY + fontSize * 0.78}" fill="#ffffff" fill-opacity="0.9" font-family="Arial,Helvetica,sans-serif" font-size="${fontSize}" font-weight="700" letter-spacing="${Math.max(0.5, fontSize * 0.04)}">ENOSX AI</text></svg>`);
  const output = await source.composite([{ input: watermark }]).png().toBuffer();
  return `data:image/png;base64,${output.toString("base64")}`;
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
    let response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    let responseText = await response.text();
    // NVIDIA Visual GenAI NIM exposes OpenAI-compatible image editing at
    // /v1/images/edits. Older configuration used /v1/infer, which now returns
    // a plain 404. Retry on the same host with the official route and schema.
    if (response.status === 404) {
      try {
        const legacyUrl = new URL(endpoint);
        if (legacyUrl.pathname.endsWith("/v1/infer")) {
          legacyUrl.pathname = legacyUrl.pathname.replace(/\/v1\/infer$/, "/v1/images/edits");
          const nimPayload = {
            prompt,
            image: imagePayload,
            model,
            cfg_scale: asBoundedNumber(body.cfg_scale, 4, 1.01, 20),
            steps: asBoundedNumber(body.steps, 30, 5, 100),
            response_format: "b64_json",
            n: 1,
            size: `${asBoundedNumber(body.width, DEFAULT_WIDTH, 64, 2048)}x${asBoundedNumber(body.height, DEFAULT_HEIGHT, 64, 2048)}`,
            ...(body.seed !== undefined ? { seed: asBoundedNumber(body.seed, 0, 0, 4_294_967_295) } : {}),
          };
          response = await fetch(legacyUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
              Accept: "application/json",
            },
            body: JSON.stringify(nimPayload),
          });
          responseText = await response.text();
        }
        // NVIDIA's hosted Qwen Image route was retired while the model remains
        // downloadable. Keep existing deployments working by falling back to
        // NVIDIA's currently hosted Flux endpoint for text-to-image requests.
        if (response.status === 404 && usesOpenAiImageApi && !image) {
          const fluxPayload = {
            prompt,
            mode: "base",
            width: asBoundedNumber(body.width, 1024, 512, 1024),
            height: asBoundedNumber(body.height, 1024, 512, 1024),
            cfg_scale: asBoundedNumber(body.cfg_scale, 7, 0, 20),
            steps: asBoundedNumber(body.steps, 30, 1, 100),
            ...(body.seed !== undefined ? { seed: asBoundedNumber(body.seed, 0, 0, 2_147_483_647) } : {}),
          };
          console.warn("[IMAGE] Configured NVIDIA hosted image route returned 404; retrying with hosted Flux.");
          response = await fetch(NVIDIA_HOSTED_FLUX_ENDPOINT, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
              Accept: "application/json",
            },
            body: JSON.stringify(fluxPayload),
          });
          responseText = await response.text();
        }
      } catch (retryError) {
        console.error("[IMAGE] NVIDIA NIM endpoint retry failed:", retryError);
      }
    }
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

    const generatedImage = extractImagePayload(data);
    if (!generatedImage) {
      console.error("[IMAGE] NVIDIA response did not contain a supported image payload:", responseText.slice(0, 1000));
      return res.status(502).json({
        error: "NVIDIA image generation returned no usable image",
        status: "GENERATION_FAILED",
      });
    }

    const watermarkedUrl = await applyEnosxWatermark(generatedImage.url);
    return res.status(200).json({
      url: watermarkedUrl,
      revised_prompt: data?.revised_prompt || data?.data?.[0]?.revised_prompt,
      media_type: "image/png",
      watermarked: true,
    });
  } catch (error) {
    console.error("[IMAGE] NVIDIA request failed:", error);
    return res.status(502).json({
      error: "NVIDIA image generation service is unavailable",
      status: "UPSTREAM_ERROR",
    });
  }
}
