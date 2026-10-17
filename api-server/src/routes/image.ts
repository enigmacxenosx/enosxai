import { Router, Request, Response } from "express";

const imageRouter = Router();
const SUPPORTED_SIZES = new Set(["1024x1024", "768x1344", "1344x768", "1216x832"]);
const MAX_NVIDIA_ATTEMPTS = 3;
const NVIDIA_TIMEOUT_MS = 30_000;

function retryDelay(response: globalThis.Response, attempt: number) {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter) - Date.now();
    if (Number.isFinite(delay) && delay >= 0) return Math.min(4000, delay);
  }
  return Math.min(4000, 500 * 2 ** attempt);
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchNvidiaWithRetry(endpoint: string, init: RequestInit) {
  for (let attempt = 0; attempt < MAX_NVIDIA_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), NVIDIA_TIMEOUT_MS);
    let response: globalThis.Response;
    try {
      response = await fetch(endpoint, { ...init, signal: controller.signal });
    } catch (error) {
      clearTimeout(timeout);
      if (attempt === MAX_NVIDIA_ATTEMPTS - 1) throw error;
      const delay = Math.min(4000, 500 * 2 ** attempt);
      console.warn(`[NVIDIA] Request timed out or failed; retry ${attempt + 2}/${MAX_NVIDIA_ATTEMPTS} in ${delay}ms.`);
      await wait(delay);
      continue;
    }
    clearTimeout(timeout);

    const retryable = response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500;
    if (!retryable || attempt === MAX_NVIDIA_ATTEMPTS - 1) return response;
    const delay = retryDelay(response, attempt);
    console.warn(`[NVIDIA] Transient HTTP ${response.status}; retry ${attempt + 2}/${MAX_NVIDIA_ATTEMPTS} in ${delay}ms.`);
    await response.body?.cancel().catch(() => undefined);
    await wait(delay);
  }
  throw new Error("NVIDIA request failed after retrying.");
}

function boundedNumber(value: unknown, fallback: number, min: number, max: number) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

imageRouter.post("/image/generate", async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body || {};
    const trimmedPrompt = typeof prompt === "string" ? prompt.trim() : "";

    if (!trimmedPrompt) {
      res.status(400).json({
        error: "Prompt is required",
        status: "VALIDATION_ERROR",
      });
      return;
    }

    if (trimmedPrompt.length > 800) {
      res.status(400).json({
        error: "Prompt exceeds maximum length of 800 characters",
        status: "VALIDATION_ERROR",
      });
      return;
    }

    const configuredEndpoint = process.env.NVIDIA_IMAGE_ENDPOINT?.trim();
    if (!configuredEndpoint) {
      res.status(503).json({ error: "Set NVIDIA_IMAGE_ENDPOINT to a deployed Stable Diffusion 3.5 Large NIM endpoint.", status: "CONFIGURATION_ERROR" });
      return;
    }

    const apiKey = (process.env.NVIDIA_IMAGE_API_KEY || process.env.NVIDIA_API_KEY)?.trim();
    if (!apiKey) {
      res.status(503).json({
        error: "NVIDIA_IMAGE_API_KEY or NVIDIA_API_KEY is not configured on the API server",
        status: "CONFIGURATION_ERROR",
      });
      return;
    }

    const endpoint = configuredEndpoint;
    const model = process.env.NVIDIA_IMAGE_MODEL?.trim() || (/stabilityai\/stable-diffusion-3\.5-large|\/v1\/infer\/?$/i.test(endpoint) ? "stabilityai/stable-diffusion-3.5-large" : "");
    const usesStableDiffusion35 = /stabilityai\/stable-diffusion-3\.5-large\/?$/i.test(endpoint)
      || /stabilityai\/stable-diffusion-3\.5-large/i.test(model);
    const requestedWidth = boundedNumber(req.body?.width, 1024, 64, 2048);
    const requestedHeight = boundedNumber(req.body?.height, 1024, 64, 2048);
    const requestedSize = `${requestedWidth}x${requestedHeight}`;
    const dimensions = SUPPORTED_SIZES.has(requestedSize)
      ? { width: requestedWidth, height: requestedHeight }
      : { width: 1024, height: 1024 };
    const mode = ["base", "canny", "depth"].includes(req.body?.mode) ? req.body.mode : "base";
    const payload: Record<string, unknown> = usesStableDiffusion35
      ? {
          prompt: trimmedPrompt,
          mode,
          ...dimensions,
          cfg_scale: boundedNumber(req.body?.cfg_scale, 5, 0, 20),
          steps: boundedNumber(req.body?.steps, 28, 1, 100),
          seed: boundedNumber(req.body?.seed, 0, 0, 2_147_483_647),
          ...(typeof req.body?.image === "string" ? { image: req.body.image } : {}),
        }
      : {
          prompt: trimmedPrompt,
          model,
          height: 1024,
          width: 1024,
          seed: 0,
          steps: 4,
          samples: 1,
        };

    const response = await fetchNvidiaWithRetry(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("NVIDIA Image API Error:", response.status, errorText);
      if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after");
        if (retryAfter) res.setHeader("Retry-After", retryAfter);
        res.status(429).json({ error: "NVIDIA is rate-limiting image generation. Please retry shortly.", status: "RATE_LIMITED", retryable: true });
        return;
      }
      if (response.status === 408 || response.status === 504) {
        res.status(504).json({ error: "NVIDIA image generation timed out. Please retry.", status: "UPSTREAM_TIMEOUT", retryable: true });
        return;
      }
      res.status(response.status >= 500 ? 502 : response.status).json({
        error: "NVIDIA image generation failed",
        status: "UPSTREAM_ERROR",
      });
      return;
    }

    const data = (await response.json().catch(() => null)) as any;
    const imageData = data?.data?.[0] || data?.artifacts?.[0];
    const base64 = imageData?.b64_json || imageData?.base64 || imageData?.base64_data;
    const url = imageData?.url || (base64 ? `data:image/png;base64,${base64}` : "");
    if (!url) {
      res.status(502).json({
        error: "NVIDIA image generation returned no usable image",
        status: "GENERATION_FAILED",
      });
      return;
    }

    res.json({ url, revised_prompt: imageData?.revised_prompt });
  } catch (err) {
    console.error("Image generation endpoint error:", err);
    if (err instanceof Error && err.name === "AbortError") {
      res.status(504).json({ error: "NVIDIA image generation timed out after retries. Please retry shortly.", status: "UPSTREAM_TIMEOUT", retryable: true });
      return;
    }
    res.status(502).json({ error: "NVIDIA image generation service is unavailable", status: "UPSTREAM_ERROR" });
  }
});

export default imageRouter;
