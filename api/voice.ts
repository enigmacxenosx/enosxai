/**
 * ENOSX AI — /api/voice (Vercel Serverless Function)
 * Server-side ElevenLabs proxy. The API key never reaches the browser.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

// Rachel is a standard ElevenLabs voice available when no custom voice is configured.
const VOICE_ID = process.env.ELEVEN_LABS_VOICE_ID?.trim() || "21m00Tcm4TlvDq8ikWAM";
const MODEL_ID = process.env.ELEVEN_LABS_MODEL_ID?.trim() || "eleven_flash_v2_5";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ELEVEN_LABS_API_KEY?.trim();
  if (!apiKey) {
    console.error("[VOICE] ELEVEN_LABS_API_KEY is not configured.");
    return res.status(503).json({
      error: "The ENOSX voice service is not configured. Add ELEVEN_LABS_API_KEY to the server environment.",
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
  if (text.length > 12000) return res.status(400).json({ error: "text exceeds the maximum length" });

  try {
    const upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0,
          use_speaker_boost: true,
        },
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      console.error(`[VOICE] ElevenLabs returned ${upstream.status}: ${detail.slice(0, 500)}`);
      return res.status(upstream.status >= 500 ? 502 : upstream.status).json({
        error: "The ENOSX voice service could not synthesize this response.",
        status: "UPSTREAM_ERROR",
      });
    }

    const audio = Buffer.from(await upstream.arrayBuffer());
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "audio/mpeg");
    res.setHeader("Content-Length", audio.length.toString());
    return res.status(200).send(audio);
  } catch (error) {
    console.error("[VOICE] Request failed", error);
    return res.status(502).json({ error: "The ENOSX voice service is unavailable.", status: "UPSTREAM_ERROR" });
  }
}
