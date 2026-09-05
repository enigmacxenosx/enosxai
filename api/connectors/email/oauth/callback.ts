import type { VercelRequest, VercelResponse } from "@vercel/node";
import oauthHandler from "../../../../_oauth";

export default function handler(req: VercelRequest, res: VercelResponse) {
  return oauthHandler({ ...req, query: { ...req.query, connector: "email", phase: "callback" } } as VercelRequest, res);
}
