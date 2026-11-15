import { Router, type Request, type Response } from "express";

const videoRouter = Router();
const NVIDIA_COSMOS3_ENDPOINT = "https://ai.api.nvidia.com/v1/cosmos/nvidia/cosmos3-nano";
const MAX_PROMPT_LENGTH = 800;
const MAX_IMAGE_LENGTH = 8_000_000;
const NVIDIA_TIMEOUT_MS = 115_000;

videoRouter.post("/video/generate", async (req: Request, res: Response) => {
  const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
  if (!prompt) {
    res.status(400).json({ error: "Prompt is required", status: "MISSING_PROMPT" });
    return;
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    res.status(400).json({ error: `Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters`, status: "PROMPT_TOO_LONG" });
    return;
  }

  const image = typeof req.body?.image === "string" ? req.body.image.trim() : "";
  if (image.length > MAX_IMAGE_LENGTH || (image && !/^data:image\/(?:png|jpe?g|webp);base64,[a-z0-9+/=\s]+$/i.test(image))) {
    res.status(400).json({ error: "image must be a PNG, JPEG, or WebP base64 data URL under 8MB", status: "INVALID_IMAGE" });
    return;
  }

  const apiKey = (process.env.NVIDIA_VIDEO_API_KEY || process.env.NVIDIA_API_KEY)?.trim();
  if (!apiKey) {
    res.status(503).json({ error: "NVIDIA video generation is not configured on the API server.", status: "CONFIGURATION_ERROR" });
    return;
  }

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
      body: JSON.stringify({
        model_mode: image ? "image2video" : "text2video",
        prompt,
        ...(image ? { input_reference: image } : {}),
        resolution: "480_16_9",
        num_frames: 25,
        num_inference_steps: 35,
        fps: 24,
        seed: 0,
      }),
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
        res.status(429).json({ error: "NVIDIA is rate-limiting video generation. Please retry shortly.", status: "RATE_LIMITED", retryable: true });
        return;
      }
      if (response.status === 408 || response.status === 504) {
        res.status(504).json({ error: "NVIDIA video generation timed out. Please retry after checking whether the request completed.", status: "UPSTREAM_TIMEOUT", retryable: true });
        return;
      }
      res.status(response.status >= 500 ? 502 : response.status).json({
        error: response.status === 422 ? "NVIDIA refused this video prompt or input. Try a different prompt or image." : "NVIDIA video generation failed.",
        status: response.status === 422 ? "GENERATION_REFUSED" : "UPSTREAM_ERROR",
      });
      return;
    }

    const base64 = typeof data?.b64_video === "string" ? data.b64_video.replace(/\s+/g, "") : "";
    if (!base64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
      res.status(502).json({ error: "NVIDIA returned no usable video.", status: "GENERATION_FAILED" });
      return;
    }
    res.status(200).json({ url: `data:video/mp4;base64,${base64}`, media_type: "video/mp4", model: "nvidia/cosmos3-nano" });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      res.status(504).json({ error: "NVIDIA video generation took too long. Check the conversation before retrying to avoid duplicate generation.", status: "UPSTREAM_TIMEOUT", retryable: false });
      return;
    }
    console.error("[VIDEO] NVIDIA request failed:", error);
    res.status(502).json({ error: "NVIDIA video generation service is unavailable.", status: "UPSTREAM_ERROR" });
  } finally {
    clearTimeout(timeout);
  }
});

export default videoRouter;
