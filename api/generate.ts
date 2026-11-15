import type { VercelRequest, VercelResponse } from "@vercel/node";
import imageGenerateHandler from "../api-handlers/image-generate";
import videoGenerateHandler from "../api-handlers/video-generate";

/**
 * Keep image and video generation behind one Vercel function entrypoint.
 * vercel.json rewrites the existing public endpoints here with kind=image|video.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawKind = req.query.kind;
  const kind = Array.isArray(rawKind) ? rawKind[0] : rawKind;

  if (kind === "image") return imageGenerateHandler(req, res);
  if (kind === "video") return videoGenerateHandler(req, res);

  return res.status(400).json({
    error: "Choose an image or video generation endpoint.",
    status: "INVALID_GENERATION_KIND",
  });
}
