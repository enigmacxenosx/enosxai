import type { VercelRequest, VercelResponse } from "@vercel/node";
import oauthHandler from "../../lib/server/connector-oauth";

export default function handler(req: VercelRequest, res: VercelResponse) {
  const route = String(req.query.route || "");
  const [connector, phase] = route.split("/");
  req.query = { ...req.query, connector, phase };
  return oauthHandler(req, res);
}
