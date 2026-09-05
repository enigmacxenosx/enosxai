import type { VercelRequest, VercelResponse } from "@vercel/node";
import { paystackHandler } from "../checkout";
export default async function initialize(req: VercelRequest, res: VercelResponse) {
  return paystackHandler(req, res);
}
