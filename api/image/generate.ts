/**
 * ENOSX AI — /api/image/generate (Vercel Serverless Function)
 * Generates images via OpenRouter using a SERVER-SIDE API key so that no
 * provider credentials are ever sent to the browser.
 *
 * Environment variables (server-side only):
 *   - OPENROUTER_API_KEY (required)
 *   - OPENROUTER_IMAGE_MODEL (optional; primary model id)
 *   - OPENROUTER_IMAGE_MODEL_FALLBACK (optional; secondary model id)
 *   - OPENROUTER_SITE_URL (optional; HTTP-Referer header)
 *
 * Request body (JSON):
 *   { prompt: string }
 *
 * Response (JSON):
 *   { url: string, revised_prompt?: string }  — 200
 *   { error: string, status: string }         — 4xx/5xx
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

// Verified against the live OpenRouter model catalog (August 2026).
// These identifiers exist in https://openrouter.ai/api/v1/models.
const PRIMARY_MODEL = "google/gemini-3.1-flash-image";
const SECONDARY_MODEL = "openai/gpt-5-image-mini";
const AUTO_FALLBACK = "openrouter/auto";

interface ImageGenerationResult {
  url: string;
  revised_prompt?: string;
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

  // Server-side key only. A browser-exposed key (VITE_ prefix) must never
  // be forwarded to OpenRouter; if only the legacy VITE_ variable is set,
  // treat the configuration as missing.
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    console.error("[IMAGE] OPENROUTER_API_KEY is not configured.");
    return res.status(503).json({
      error: "OPENROUTER_API_KEY is not configured on the server",
      status: "CONFIGURATION_ERROR",
    });
  }

  let body: any = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  } catch (e) {
    console.error("[IMAGE] Failed to parse request body:", e);
    return res.status(400).json({ error: "Invalid request body", status: "PARSE_ERROR" });
  }

  const prompt = (body.prompt || "").toString().trim();
  if (!prompt) {
    return res.status(400).json({ error: "prompt is required", status: "MISSING_PROMPT" });
  }
  if (prompt.length > 4000) {
    return res.status(400).json({ error: "Prompt exceeds maximum length of 4000 characters", status: "PROMPT_TOO_LONG" });
  }

  const configuredPrimary = process.env.OPENROUTER_IMAGE_MODEL || PRIMARY_MODEL;
  const configuredFallback = process.env.OPENROUTER_IMAGE_MODEL_FALLBACK || SECONDARY_MODEL;
  const modelCandidates = [...new Set([configuredPrimary, configuredFallback, AUTO_FALLBACK])];
  const referer = process.env.OPENROUTER_SITE_URL || "https://enosxtechnologies450.vercel.app";

  console.log("[IMAGE] Generating with prompt length", prompt.length, "and", modelCandidates.length, "model candidate(s)");

  for (const model of modelCandidates) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": referer,
          "X-Title": "ENOSX AI",
        },
        body: JSON.stringify({ model, prompt }),
      });

      if (!response.ok) {
        console.warn(`[IMAGE] Model ${model} returned status ${response.status}`);
        // 429 rate limits and 5xx provider errors are worth a retry with the
        // next candidate model in the list.
        if (response.status === 429 || response.status >= 500) {
          continue;
        }
        // 402 payment required: keep trying cheaper/other candidates.
        if (response.status === 402) {
          continue;
        }
        // A definitive 4xx on the primary model (e.g. unknown model id) means
        // we should skip straight to the next candidate without retrying it.
        if (response.status === 400 && model === configuredPrimary) {
          console.warn(`[IMAGE] Primary model ${configuredPrimary} rejected (400); trying next candidate.`);
          continue;
        }
        // Any other 4xx on a non-primary candidate is fatal for that candidate.
        if (response.status < 500) {
          continue;
        }
      }

      const data = (await response.json().catch(() => null)) as any;
      const imageData = data?.data?.[0] || data?.choices?.[0]?.message?.attachments?.[0];
      if (!imageData) {
        console.warn(`[IMAGE] Model ${model} returned no image payload`);
        continue;
      }

      const url =
        imageData.url || (imageData.b64_json ? `data:image/png;base64,${imageData.b64_json}` : "");
      // Reject non-image payloads (e.g. text-model JSON such as
      // {"action":"dalle.text2im",...}) to keep picture links valid.
      if (url && (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:image/"))) {
        console.log("[IMAGE] Image generated successfully with model", model);
        return res.status(200).json({
          url,
          revised_prompt: imageData.revised_prompt,
        });
      }
      console.warn(`[IMAGE] Model ${model} returned a non-image payload; skipping.`);
    } catch (err) {
      console.error(`[IMAGE] Model ${model} threw:`, err);
    }
  }

  console.error("[IMAGE] All image model candidates failed for prompt:", prompt.slice(0, 80));
  return res.status(502).json({
    error: "Image generation failed after trying all configured models",
    status: "GENERATION_FAILED",
  });
}
