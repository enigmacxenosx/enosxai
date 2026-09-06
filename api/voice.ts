/**
 * ENOSX AI — /api/voice (Vercel Serverless Function)
 * Server-side NVIDIA Magpie TTS proxy. The API key never reaches the browser.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

const NVIDIA_TTS_URL = "https://877104f7-e885-42b9-8de8-f6e4c6303969.invocation.api.nvcf.nvidia.com/v1/audio/synthesize";
const NVIDIA_VOICE = process.env.NVIDIA_TTS_VOICE?.trim() || "Magpie-Multilingual.EN-US.Aria";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.NVIDIA_API_KEY?.trim();
  if (!apiKey) {
    console.error("[VOICE] NVIDIA_API_KEY is not configured.");
    return res.status(503).json({
      error: "The ENOSX voice service is not configured. Add NVIDIA_API_KEY to the server environment.",
      status: "CONFIGURATION_ERROR",
    });
  }

  let body: any = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  } catch {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const text = String(body.text || "").replace(/\s+/g, " ").trim();
  if (!text) return res.status(400).json({ error: "text is required" });
  if (text.length > 2000) return res.status(400).json({ error: "text exceeds the NVIDIA TTS maximum length" });

  try {
    const form = new FormData();
    form.append("text", text);
    form.append("language", "en-US");
    form.append("voice", NVIDIA_VOICE);
    form.append("encoding", "LINEAR_PCM");
    form.append("sample_rate_hz", "44100");

    const upstream = await fetch(NVIDIA_TTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "audio/wav",
      },
      body: form,
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      console.error(`[VOICE] NVIDIA TTS returned ${upstream.status}: ${detail.slice(0, 500)}`);
      return res.status(upstream.status >= 500 ? 502 : upstream.status).json({
        error: "The ENOSX voice service could not synthesize this response.",
        status: "UPSTREAM_ERROR",
      });
    }

    const audio = Buffer.from(await upstream.arrayBuffer());
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "audio/wav");
    res.setHeader("Content-Length", audio.length.toString());
    return res.status(200).send(audio);
  } catch (error) {
    console.error("[VOICE] NVIDIA TTS request failed", error);
    return res.status(502).json({ error: "The ENOSX voice service is unavailable.", status: "UPSTREAM_ERROR" });
  }
}
