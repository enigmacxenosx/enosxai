/**
 * ENOSX AI — /api/image/generate (Vercel Serverless Function)
 * Generates images through NVIDIA Visual Generative AI NIM using its
 * OpenAI-compatible image-generation endpoint. Credentials remain server-side.
 *
 * Environment variables (server-side only):
 *   - NVIDIA_API_KEY (required)
 *   - NVIDIA_IMAGE_MODEL (optional; defaults to qwen-image)
 *   - NVIDIA_API_BASE_URL (optional; defaults to https://integrate.api.nvidia.com/v1)
 *
 * Request body (JSON):
 *   { prompt: string }
 *
 * Response (JSON):
 *   { url: string, revised_prompt?: string }  — 200
 *   { error: string, status: string }         — 4xx/5xx
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

const DEFAULT_MODEL = "qwen-image";

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

  const apiKey = process.env.NVIDIA_API_KEY?.trim();
  if (!apiKey) {
    console.error("[IMAGE] NVIDIA_API_KEY is not configured.");
    return res.status(503).json({
      error: "NVIDIA_API_KEY is not configured on the server",
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

  const prompt = (body.prompt || "").toString().trim();
  if (!prompt) {
    return res.status(400).json({ error: "prompt is required", status: "MISSING_PROMPT" });
  }
  if (prompt.length > 4000) {
    return res.status(400).json({
      error: "Prompt exceeds maximum length of 4000 characters",
      status: "PROMPT_TOO_LONG",
    });
  }

  const baseUrl = (process.env.NVIDIA_API_BASE_URL || "https://integrate.api.nvidia.com/v1").replace(/\/$/, "");
  const model = process.env.NVIDIA_IMAGE_MODEL?.trim() || DEFAULT_MODEL;
  const imageUrl = `${baseUrl}/images/generations`;

  console.log("[IMAGE] Generating with NVIDIA model", model, "and prompt length", prompt.length);

  try {
    const response = await fetch(imageUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt,
        n: 1,
        response_format: "b64_json",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("[IMAGE] NVIDIA API error:", response.status, errorText);
      return res.status(response.status >= 500 ? 502 : response.status).json({
        error: "NVIDIA image generation failed",
        status: "UPSTREAM_ERROR",
      });
    }

    const data = (await response.json().catch(() => null)) as any;
    const imageData = data?.data?.[0];
    const url = imageData?.url || (imageData?.b64_json ? `data:image/png;base64,${imageData.b64_json}` : "");

    if (!url || (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("data:image/"))) {
      console.error("[IMAGE] NVIDIA response did not contain a supported image payload:", data);
      return res.status(502).json({
        error: "NVIDIA image generation returned no usable image",
        status: "GENERATION_FAILED",
      });
    }

    return res.status(200).json({
      url,
      revised_prompt: imageData?.revised_prompt,
    });
  } catch (error) {
    console.error("[IMAGE] NVIDIA request failed:", error);
    return res.status(502).json({
      error: "NVIDIA image generation service is unavailable",
      status: "UPSTREAM_ERROR",
    });
  }
}
