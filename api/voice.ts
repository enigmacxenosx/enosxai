/**
 * ENOSX AI — /api/voice (Vercel Serverless Function)
 * Server-side NVIDIA TTS proxy. Provider credentials never reach the browser.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

const PROVIDERS = {
  magpie: {
    url: "https://877104f7-e885-42b9-8de8-f6e4c6303969.invocation.api.nvcf.nvidia.com/v1/audio/synthesize",
    keyName: "NVIDIA_MAGPIE_TTS_API_KEY",
    voice:
      process.env.NVIDIA_TTS_VOICE?.trim() || "Magpie-Multilingual.EN-US.Aria",
  },
  chatterbox: {
    url: "https://ddacc747-1269-4fab-bfd9-8f593dead106.invocation.api.nvcf.nvidia.com/v1/audio/synthesize",
    keyName: "NVIDIA_CHATTERBOX_TTS_API_KEY",
    voice: "Chatterbox-Multilingual.en-US.Male",
  },
} as const;

type Provider = keyof typeof PROVIDERS;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  let body: any = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  } catch {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const provider = body.provider === undefined ? "magpie" : body.provider;
  if (provider !== "magpie" && provider !== "chatterbox") {
    return res
      .status(400)
      .json({ error: "provider must be magpie or chatterbox" });
  }

  const config = PROVIDERS[provider as Provider];
  // Retain compatibility for existing Magpie deployments that only set NVIDIA_API_KEY.
  const apiKey = (
    process.env[config.keyName] ||
    (provider === "magpie" ? process.env.NVIDIA_API_KEY : "")
  )?.trim();
  if (!apiKey) {
    console.error(`[VOICE] ${config.keyName} is not configured.`);
    return res.status(503).json({
      error: `The ${provider} voice service is not configured on the server.`,
      status: "CONFIGURATION_ERROR",
    });
  }

  const text = String(body.text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return res.status(400).json({ error: "text is required" });
  if (text.length > 2000)
    return res
      .status(400)
      .json({ error: "text exceeds the NVIDIA TTS maximum length" });

  try {
    const form = new FormData();
    form.append("text", text);
    form.append("language", "en-US");
    form.append("voice", config.voice);
    form.append("encoding", "LINEAR_PCM");
    form.append("sample_rate_hz", "44100");

    const upstream = await fetch(config.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "audio/wav",
      },
      body: form,
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      console.error(
        `[VOICE] ${provider} TTS returned ${upstream.status}: ${detail.slice(0, 500)}`,
      );
      return res.status(upstream.status >= 500 ? 502 : upstream.status).json({
        error: `The ${provider} voice service could not synthesize this response.`,
        status: "UPSTREAM_ERROR",
      });
    }

    const audio = Buffer.from(await upstream.arrayBuffer());
    res.setHeader("Content-Type", "audio/wav");
    res.setHeader("Content-Length", audio.length.toString());
    return res.status(200).send(audio);
  } catch (error) {
    console.error(`[VOICE] ${provider} TTS request failed`, error);
    return res
      .status(502)
      .json({
        error: `The ${provider} voice service is unavailable.`,
        status: "UPSTREAM_ERROR",
      });
  }
}
