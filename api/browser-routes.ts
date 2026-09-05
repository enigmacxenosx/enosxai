import type { VercelRequest, VercelResponse } from "@vercel/node";
import readHandler from "../lib/server/browser-read";
import linksHandler from "../lib/server/browser-extract-links";

export default function handler(req: VercelRequest, res: VercelResponse) {
  const route = String(req.query.route || "");
  if (route === "healthz") return res.status(200).json({ ok: true });
  if (route === "read") return readHandler(req, res);
  if (route === "extract-links") return linksHandler(req, res);
  return res.status(404).json({ error: "Unknown browser route" });
}
