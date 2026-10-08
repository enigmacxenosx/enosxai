import { Router, Request, Response } from "express";

const imageRouter = Router();

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

    if (trimmedPrompt.length > 4000) {
      res.status(400).json({
        error: "Prompt exceeds maximum length of 4000 characters",
        status: "VALIDATION_ERROR",
      });
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

    const configuredEndpoint = process.env.NVIDIA_IMAGE_ENDPOINT?.trim();
    const model = process.env.NVIDIA_IMAGE_MODEL?.trim() || "FLUX.1-schnell";
    const configuredIsBuilderPage = configuredEndpoint?.includes("build.nvidia.com");
    const endpoint = configuredIsBuilderPage || !configuredEndpoint
      ? `https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell`
      : configuredEndpoint;
    const payload: Record<string, unknown> = {
      prompt: trimmedPrompt,
      height: 1024,
      width: 1024,
      seed: 0,
      steps: 4,
      samples: 1,
    };
    if (!configuredIsBuilderPage && model) payload.model = model;

    const response = await fetch(endpoint, {
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
    res.status(502).json({ error: "NVIDIA image generation service is unavailable", status: "UPSTREAM_ERROR" });
  }
});

export default imageRouter;
