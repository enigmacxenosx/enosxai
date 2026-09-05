import type { VercelRequest, VercelResponse } from "@vercel/node";
import oauthHandler from "../../_oauth";

export default function handler(req: VercelRequest, res: VercelResponse) {
  req.query = { ...req.query, connector: "shopify", phase: "start" };
  return oauthHandler(req, res);
}
