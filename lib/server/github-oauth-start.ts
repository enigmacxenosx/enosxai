import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHmac, randomBytes } from "node:crypto";

function getOrigin(req: VercelRequest): string {
  return (
    process.env.GITHUB_OAUTH_REDIRECT_ORIGIN?.replace(/\/$/, "") ||
    `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`
  );
}

function signState(value: string): string {
  const secret = process.env.GITHUB_OAUTH_STATE_SECRET || process.env.GITHUB_CLIENT_SECRET;
  if (!secret) throw new Error("GITHUB_OAUTH_STATE_SECRET is not configured");
  const signature = createHmac("sha256", secret).update(value).digest("base64url");
  return `${value}.${signature}`;
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return res.status(503).json({ error: "GitHub OAuth is not configured on the server" });
  }

  try {
    const nonce = randomBytes(24).toString("base64url");
    const state = signState(`${nonce}.${Date.now()}`);
    const redirectUri = `${getOrigin(req)}/api/github/oauth/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "repo read:user user:email",
      state,
    });
    res.setHeader("Cache-Control", "no-store");
    return res.redirect(302, `https://github.com/login/oauth/authorize?${params.toString()}`);
  } catch (error) {
    console.error("GitHub OAuth start failed", error);
    return res.status(500).json({ error: "Unable to start GitHub OAuth" });
  }
}
