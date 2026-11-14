/**
 * ENOSX AI — /api/browser (Vercel Serverless Function)
 * Routes webpage reading through the bounded, DNS-pinned public-page reader.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import readHandler from "../lib/server/browser-read";
import linksHandler from "../lib/server/browser-extract-links";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const route = typeof req.query.route === "string" ? req.query.route : "";
  if (route === "healthz") {
    return res.status(200).json({
      ok: true,
      aiConfigured: Boolean(process.env.NVIDIA_API_KEY?.trim()),
    });
  }
  if (route === "read") return readHandler(req, res);
  if (route === "extract-links") return linksHandler(req, res);
  if (route) return res.status(404).json({ error: "Unknown browser route" });

  // Preserve the legacy /api/browser?url=... URL while applying the same safe-fetch rules.
  return readHandler(req, res);
}
