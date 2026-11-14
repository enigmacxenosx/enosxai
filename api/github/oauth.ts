import type { VercelRequest, VercelResponse } from "@vercel/node";
import callbackHandler from "../../lib/server/github-oauth-callback";
import startHandler from "../../lib/server/github-oauth-start";

export default function handler(req: VercelRequest, res: VercelResponse) {
  const route = typeof req.query.route === "string" ? req.query.route : "";
  if (route === "start") return startHandler(req, res);
  if (route === "callback") return callbackHandler(req, res);
  return res.status(404).json({ error: "Unknown GitHub OAuth route" });
}
