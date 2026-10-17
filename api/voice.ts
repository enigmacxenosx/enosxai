/**
 * ENOSX AI — /api/voice (Vercel Serverless Function)
 * Server-side NVIDIA TTS proxy. Provider API keys never reach the browser.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

type VoiceProvider = "magpie" | "chatterbox";

type ProviderConfig = {
  endpoint: string;
  apiKey: string | undefined;
  voice: string;
  maxCharacters: number;
};

function getProviderConfig(provider: VoiceProvider): ProviderConfig {
  if (provider === "chatterbox") {
    return {
      endpoint: process.env.NVIDIA_CHATTERBOX_TTS_ENDPOINT?.trim() ||
        "https://ddacc747-1269-4fab-bfd9-8f593dead106.invocation.api.nvcf.nvidia.com/v1/audio/synthesize",
      apiKey: process.env.NVIDIA_CHATTERBOX_TTS_API_KEY?.trim(),
      voice: process.env.NVIDIA_CHATTERBOX_TTS_VOICE?.trim() ||
        "Chatterbox-Multilingual.en-US.Male",
      maxCharacters: 500,
    };
  }
  return {
    endpoint: process.env.NVIDIA_MAGPIE_TTS_ENDPOINT?.trim() ||
      "https://877104f7-e885-42b9-8de8-f6e4c6303969.invocation.api.nvcf.nvidia.com/v1/audio/synthesize",
    apiKey: process.env.NVIDIA_MAGPIE_TTS_API_KEY?.trim() ||
      process.env.NVIDIA_TTS_API_KEY?.trim() || process.env.NVIDIA_API_KEY?.trim(),
    voice: process.env.NVIDIA_MAGPIE_TTS_VOICE?.trim() ||
      process.env.NVIDIA_TTS_VOICE?.trim() || "Magpie-Multilingual.EN-US.Aria",
    maxCharacters: 2000,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let body: any = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  } catch {
    return res.status(400).json({ error: "Invalid request body", status: "PARSE_ERROR" });
  }

  const providerName = body.provider || "magpie";
  if (providerName !== "magpie" && providerName !== "chatterbox") {
    return res.status(400).json({ error: "provider must be magpie or chatterbox", status: "INVALID_PROVIDER" });
  }
  const provider = providerName as VoiceProvider;
  const config = getProviderConfig(provider);
  if (!config.apiKey) {
    console.error(`[VOICE] NVIDIA ${provider} TTS credential is not configured.`);
    return res.status(503).json({
      error: `The selected ${provider === "magpie" ? "Magpie" : "Chatterbox"} voice is not configured on the server.`,
      status: "CONFIGURATION_ERROR",
    });
  }

  const text = String(body.text || "").replace(/\s+/g, " ").trim();
  if (!text) return res.status(400).json({ error: "text is required", status: "MISSING_TEXT" });
  if (text.length > config.maxCharacters) {
    return res.status(400).json({
      error: `Text exceeds the ${config.maxCharacters}-character limit for ${provider}.`,
      status: "TEXT_TOO_LONG",
    });
  }

  try {
    const form = new FormData();
    form.append("text", text);
    form.append("language", "en-US");
    form.append("voice", config.voice);
    form.append("encoding", "LINEAR_PCM");
    form.append("sample_rate_hz", "44100");

    const upstream = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        Accept: "audio/wav",
      },
      body: form,
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      console.error(`[VOICE] NVIDIA ${provider} TTS returned ${upstream.status}: ${detail.slice(0, 500)}`);
      return res.status(upstream.status >= 500 ? 502 : upstream.status).json({
        error: `The ${provider === "magpie" ? "Magpie" : "Chatterbox"} voice could not synthesize this response.`,
        status: "UPSTREAM_ERROR",
      });
    }

    const audio = Buffer.from(await upstream.arrayBuffer());
    if (!audio.length) {
      return res.status(502).json({ error: "The NVIDIA voice service returned empty audio.", status: "EMPTY_AUDIO" });
    }
    res.setHeader("Content-Type", "audio/wav");
    res.setHeader("Content-Length", audio.length.toString());
    return res.status(200).send(audio);
  } catch (error) {
    console.error(`[VOICE] NVIDIA ${provider} TTS request failed`, error);
    return res.status(502).json({ error: "The ENOSX voice service is unavailable.", status: "UPSTREAM_ERROR" });
  }
}
