import type { VercelRequest, VercelResponse } from "@vercel/node";
import imageGenerateHandler from "../api-handlers/image-generate";
import videoGenerateHandler from "../api-handlers/video-generate";
import zipCreateHandler from "../api-handlers/zip-create";

/**
 * Keep media generation and ZIP creation behind one Vercel function entrypoint.
 * vercel.json rewrites existing public endpoints here with a kind query.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawKind = req.query.kind;
  const kind = Array.isArray(rawKind) ? rawKind[0] : rawKind;

  if (kind === "image") return imageGenerateHandler(req, res);
  if (kind === "video") return videoGenerateHandler(req, res);
  if (kind === "zip") return zipCreateHandler(req, res);

  return res.status(400).json({
    error: "Choose an image, video, or ZIP generation endpoint.",
    status: "INVALID_GENERATION_KIND",
  });
}
