import { Router, type Request, type Response } from "express";
// These Vercel handlers are intentionally shared with the Express adapter.
// @ts-ignore Shared Vercel handler lives outside api-server/src by design.
import startHandler from "../../../api/github/oauth/start";
// @ts-ignore Shared Vercel handler lives outside api-server/src by design.
import callbackHandler from "../../../api/github/oauth/callback";

const router = Router();

router.get("/github/oauth/start", (req: Request, res: Response) => {
  return startHandler(req as any, res as any);
});

router.get("/github/oauth/callback", (req: Request, res: Response) => {
  return callbackHandler(req as any, res as any);
});

export default router;
