/**
 * ENOSX AI — /api/image/generate (Vercel Serverless Function)
 * generates images through NVIDIA's hosted FLUX.2 Klein endpoint by default. Credentials
 * remain server-side and the browser receives a self-contained data URL so
 * generated images remain downloadable after a chat is reloaded. The hosted
 * A custom NVIDIA_IMAGE_ENDPOINT can override the hosted default.
 *
 * Server-only environment variables:
 *   - NVIDIA_IMAGE_API_KEY (required for image generation; falls back to NVIDIA_API_KEY)
 *   - NVIDIA_API_KEY (legacy/shared fallback)
 *   - NVIDIA_IMAGE_ENDPOINT (optional; defaults to NVIDIA's hosted FLUX.2 Klein route)
 *   - NVIDIA_IMAGE_MODEL (optional; defaults to black-forest-labs/flux.2-klein-4b)
 *
 * Request body:
 *   { prompt: string, image?: string, mode?: string, width?: number,
 *     height?: number, cfg_scale?: number, steps?: number, seed?: number }
 *
 * `image` may be a data URL or base64-encoded RGB image for compatible edit
 * endpoints. FLUX.1 Kontext requires an input PNG, JPEG, or WebP image.
 *
 * Response:
 *   { url: string, revised_prompt?: string, media_type: string } — 200
 *   { error: string, status: string } — 4xx/5xx
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import sharp from "sharp";
import { fetchNvidiaWithRetry } from "../../lib/server/retryFetch";

const DEFAULT_PROMPT = "Create a polished image based on the supplied prompt.";
const DEFAULT_WIDTH = 1024;
const DEFAULT_HEIGHT = 1024;
const DEFAULT_DIFFUSION_STEPS = 20;
const MAX_PROMPT_LENGTH = 800;
const MAX_IMAGE_LENGTH = 8_000_000;
const NVIDIA_HOSTED_FLUX2_ENDPOINT = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b";

function stableDiffusion35Dimensions(body: any) {
  const width = asBoundedNumber(body.width, DEFAULT_WIDTH, 64, 2048);
  const height = asBoundedNumber(body.height, DEFAULT_HEIGHT, 64, 2048);
  const supported = new Set(["1024x1024", "768x1344", "1344x768", "1216x832"]);
  return supported.has(`${width}x${height}`)
    ? { width, height }
    : { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
}

function asBoundedNumber(value: unknown, fallback: number, min: number, max: number) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function createFlux2Payload(prompt: string, body: any, imagePayload: string) {
  return {
    prompt,
    height: 1024,
    width: 1024,
    cfg_scale: 1,
    ...(imagePayload ? { image: [imagePayload] } : {}),
    samples: 1,
    seed: asBoundedNumber(body.seed, 0, 0, 2_147_483_647),
    steps: asBoundedNumber(body.steps, 4, 1, 4),
  };
}

const IMAGE_PAYLOAD_KEY =
  /^(?:image|images|img|b64|b64_?json|base64|image_?base64|generated_?image|artifacts?|data|output|result|response)$/i;

function bufferImageMediaType(buffer: Buffer): string | null {
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return "image/png";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  if (buffer.length >= 6 && buffer.toString("ascii", 0, 3) === "GIF") {
    return "image/gif";
  }
  return null;
}

function base64ImageMediaType(value: string): string | null {
  const compact = value.replace(/\s+/g, "");
  if (compact.length < 64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(compact)) return null;
  try {
    return bufferImageMediaType(Buffer.from(compact.slice(0, 96), "base64"));
  } catch {
    return null;
  }
}

function mediaTypeFromUrl(url: string): string {
  if (/\.png(?:[?#]|$)/i.test(url)) return "image/png";
  if (/\.jpe?g(?:[?#]|$)/i.test(url)) return "image/jpeg";
  if (/\.webp(?:[?#]|$)/i.test(url)) return "image/webp";
  if (/\.gif(?:[?#]|$)/i.test(url)) return "image/gif";
  return "image/png";
}

function extractImagePayload(data: any) {
  const candidates: Array<{ value: string; key: string }> = [];
  const seen = new Set<unknown>();

  // Walk the whole response so image output is found regardless of how deeply
  // (or unusually) a given NVIDIA NIM deployment nests it.
  const visit = (node: unknown, key: string, depth: number) => {
    if (node == null || depth > 8) return;
    if (typeof node === "string") {
      if (node.length > 0) candidates.push({ value: node, key });
      return;
    }
    if (typeof node !== "object") return;
    if (seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      for (const item of node) visit(item, key, depth + 1);
      return;
    }
    for (const [childKey, childValue] of Object.entries(node as Record<string, unknown>)) {
      visit(childValue, childKey, depth + 1);
    }
  };
  visit(data, "", 0);

  const toResult = (value: string, key: string) => {
    const trimmed = value.trim();
    if (trimmed.startsWith("data:image/")) {
      const mediaType = trimmed.slice(5, trimmed.indexOf(";")) || "image/png";
      return { url: trimmed, mediaType };
    }
    if (/^https?:\/\//i.test(trimmed)) {
      const urlLikeKey = /url|image|img|artifact/i.test(key);
      if (!urlLikeKey && !/\.(?:png|jpe?g|webp|gif|bmp|avif)(?:[?#]|$)/i.test(trimmed)) return null;
      return { url: trimmed, mediaType: mediaTypeFromUrl(trimmed) };
    }
    const mediaType = base64ImageMediaType(trimmed);
    if (!mediaType) return null;
    return { url: `data:${mediaType};base64,${trimmed.replace(/\s+/g, "")}`, mediaType };
  };

  const ordered = [...candidates.filter((candidate) => IMAGE_PAYLOAD_KEY.test(candidate.key)), ...candidates];
  for (const candidate of ordered) {
    const result = toResult(candidate.value, candidate.key);
    if (result) return result;
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

  const configuredEndpoint = process.env.NVIDIA_IMAGE_ENDPOINT?.trim();
  const isLegacyStableDiffusionConfig = Boolean(configuredEndpoint && /stabilityai\/stable-diffusion-3\.5-large|\/v1\/infer\/?$/i.test(configuredEndpoint));
  const endpoint = configuredEndpoint && !isLegacyStableDiffusionConfig ? configuredEndpoint : NVIDIA_HOSTED_FLUX2_ENDPOINT;
  const apiKey = (process.env.NVIDIA_IMAGE_API_KEY || process.env.NVIDIA_API_KEY)?.trim();
  if (!apiKey) {
    console.error("[IMAGE] NVIDIA image credentials are not configured.");
    return res.status(503).json({ error: "NVIDIA image generation credentials are not configured on the server", status: "CONFIGURATION_ERROR" });
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
  const model = /\/v1\/genai\/black-forest-labs\/flux\.2-klein-4b\/?$/i.test(endpoint)
    ? "black-forest-labs/flux.2-klein-4b"
    : process.env.NVIDIA_IMAGE_MODEL?.trim() || (/stabilityai\/stable-diffusion-3\.5-large|\/v1\/infer\/?$/i.test(endpoint) ? "stabilityai/stable-diffusion-3.5-large" : "");
  const usesStableDiffusion35 = /stabilityai\/stable-diffusion-3\.5-large\/?$/i.test(endpoint)
    || /stabilityai\/stable-diffusion-3\.5-large/i.test(model);
  const usesOpenAiImageApi = /\/v1\/images\/generations\/?$/i.test(endpoint);
  const usesFluxKontextApi = /\/v1\/genai\/black-forest-labs\/flux\.1-kontext-dev\/?$/i.test(endpoint);
  const usesFlux2KleinEndpoint = /\/v1\/genai\/black-forest-labs\/flux\.2-klein-4b\/?$/i.test(endpoint);
  const isNvidiaHostedImagesEndpoint = (() => {
    try {
      return new URL(endpoint).hostname === "ai.api.nvidia.com";
    } catch {
      return false;
    }
  })();
  // NVIDIA's hosted Qwen Images route is retired. For that known route, skip
  // the doomed request and use FLUX.2 Klein immediately; keep 404 fallback for
  // other OpenAI-compatible endpoints so custom deployments remain supported.
  const directFlux2TextRoute = !image && (
    usesFluxKontextApi || (usesOpenAiImageApi && isNvidiaHostedImagesEndpoint)
  );
  const usesFlux2KleinApi = usesFlux2KleinEndpoint || directFlux2TextRoute;
  const requestEndpoint = directFlux2TextRoute ? NVIDIA_HOSTED_FLUX2_ENDPOINT : endpoint;
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
  const sd35Dimensions = stableDiffusion35Dimensions(body);
  const sd35Mode = ["base", "canny", "depth"].includes(body.mode) ? body.mode : "base";
  const payload: Record<string, unknown> = usesStableDiffusion35
    ? {
        prompt,
        mode: sd35Mode,
        ...sd35Dimensions,
        cfg_scale: asBoundedNumber(body.cfg_scale, 5, 0, 20),
        steps: asBoundedNumber(body.steps, 28, 1, 100),
        seed: asBoundedNumber(body.seed, 0, 0, 2_147_483_647),
        ...(imagePayload ? { image: imagePayload } : {}),
      }
    : usesFlux2KleinApi
    ? createFlux2Payload(prompt, body, imagePayload)
    : usesFluxKontextApi
    ? {
        prompt,
        aspect_ratio: imagePayload ? "match_input_image" : "1:1",
        steps: asBoundedNumber(body.steps, DEFAULT_DIFFUSION_STEPS, 1, 100),
        cfg_scale: asBoundedNumber(body.cfg_scale, 3.5, 0, 20),
        ...(imagePayload ? { image: imagePayload } : {}),
        ...(body.seed !== undefined ? { seed: asBoundedNumber(body.seed, 0, 0, 2_147_483_647) } : {}),
      }
    : usesOpenAiImageApi
    ? {
        model: model || "qwen-image",
        prompt,
        n: 1,
        response_format: "b64_json",
        cfg_scale: asBoundedNumber(body.cfg_scale, 4, 1.01, 20),
        steps: asBoundedNumber(body.steps, DEFAULT_DIFFUSION_STEPS, 5, 100),
      }
    : {
        prompt,
        mode: typeof body.mode === "string" && body.mode.trim() ? body.mode.trim() : imagePayload ? "img2img" : "text2img",
        width: asBoundedNumber(body.width, DEFAULT_WIDTH, 64, 2048),
        height: asBoundedNumber(body.height, DEFAULT_HEIGHT, 64, 2048),
        cfg_scale: asBoundedNumber(body.cfg_scale, 7, 0, 20),
        steps: asBoundedNumber(body.steps, DEFAULT_DIFFUSION_STEPS, 1, 150),
      };
  if (usesOpenAiImageApi && !usesFlux2KleinApi && (body.width !== undefined || body.height !== undefined)) {
    const width = asBoundedNumber(body.width, DEFAULT_WIDTH, 512, 1664);
    const height = asBoundedNumber(body.height, DEFAULT_HEIGHT, 512, 1664);
    payload.size = `${width}x${height}`;
  }
  if (body.seed !== undefined) payload.seed = asBoundedNumber(body.seed, 0, 0, 2_147_483_647);
  if (!usesStableDiffusion35 && !usesOpenAiImageApi && !usesFluxKontextApi && !usesFlux2KleinApi && model) payload.model = model;
  if (!usesOpenAiImageApi && !usesFluxKontextApi && !usesFlux2KleinApi && imagePayload) payload.image = imagePayload;

  console.log("[IMAGE] Generating with NVIDIA image endpoint", {
    model: usesStableDiffusion35 ? "stabilityai/stable-diffusion-3.5-large" : usesFlux2KleinApi ? "black-forest-labs/flux.2-klein-4b" : model || "endpoint-default",
    hasInputImage: Boolean(imagePayload),
    promptLength: prompt.length,
  });

  try {
    let response = await fetchNvidiaWithRetry(requestEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

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
            steps: asBoundedNumber(body.steps, DEFAULT_DIFFUSION_STEPS, 5, 100),
            response_format: "b64_json",
            n: 1,
            size: `${asBoundedNumber(body.width, DEFAULT_WIDTH, 64, 2048)}x${asBoundedNumber(body.height, DEFAULT_HEIGHT, 64, 2048)}`,
            ...(body.seed !== undefined ? { seed: asBoundedNumber(body.seed, 0, 0, 4_294_967_295) } : {}),
          };
          response = await fetchNvidiaWithRetry(legacyUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
              Accept: "application/json",
            },
            body: JSON.stringify(nimPayload),
          });
        }
        // NVIDIA's hosted Qwen Image route was retired while the model remains
        // downloadable. Keep existing deployments working by falling back to
        // NVIDIA's currently hosted Flux endpoint for text-to-image requests.
        if (response.status === 404 && usesOpenAiImageApi && !image && !usesFlux2KleinApi) {
          const flux2Payload = createFlux2Payload(prompt, body, "");
          console.warn("[IMAGE] Configured NVIDIA hosted image route returned 404; retrying with FLUX.2 Klein 4B.");
          response = await fetchNvidiaWithRetry(NVIDIA_HOSTED_FLUX2_ENDPOINT, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
              Accept: "application/json",
            },
            body: JSON.stringify(flux2Payload),
          });
        }
      } catch (retryError) {
        console.error("[IMAGE] NVIDIA NIM endpoint retry failed:", retryError);
      }
    }

    // Some NIM deployments return the rendered image as binary bytes rather than
    // JSON. Read the body according to its content type so both shapes work.
    const responseContentType = response.headers.get("content-type") || "";
    let responseText = "";
    let binaryImageUrl = "";
    if (/^image\//i.test(responseContentType)) {
      const imageBuffer = Buffer.from(await response.arrayBuffer());
      const mediaType = responseContentType.split(";")[0].trim() || "image/png";
      binaryImageUrl = `data:${mediaType};base64,${imageBuffer.toString("base64")}`;
    } else {
      responseText = await response.text();
    }
    const data = responseText
      ? (() => {
          try {
            return JSON.parse(responseText);
          } catch {
            return null;
          }
        })()
      : null;

    if (!response.ok) {
      console.error("[IMAGE] NVIDIA image API error:", response.status, responseText.slice(0, 500));
      if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after");
        if (retryAfter) res.setHeader("Retry-After", retryAfter);
        return res.status(429).json({
          error: "NVIDIA is rate-limiting image generation. Please retry shortly.",
          status: "RATE_LIMITED",
          retryable: true,
        });
      }
      if (response.status === 408 || response.status === 504) {
        return res.status(504).json({
          error: "NVIDIA image generation timed out. Please retry.",
          status: "UPSTREAM_TIMEOUT",
          retryable: true,
        });
      }
      return res.status(response.status >= 500 ? 502 : response.status).json({
        error: "NVIDIA image generation failed",
        status: "UPSTREAM_ERROR",
      });
    }

    const generatedImage = binaryImageUrl
      ? { url: binaryImageUrl, mediaType: responseContentType.split(";")[0].trim() || "image/png" }
      : extractImagePayload(data) || (responseText ? extractImagePayload(responseText) : null);
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
    if (error instanceof Error && error.name === "AbortError") {
      return res.status(504).json({
        error: "NVIDIA image generation timed out after retries. Please retry shortly.",
        status: "UPSTREAM_TIMEOUT",
        retryable: true,
      });
    }
    return res.status(502).json({
      error: "NVIDIA image generation service is unavailable",
      status: "UPSTREAM_ERROR",
    });
  }
}
