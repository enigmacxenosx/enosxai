import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHmac, timingSafeEqual } from "node:crypto";

function verifyState(state: string): boolean {
  const secret = process.env.GITHUB_OAUTH_STATE_SECRET || process.env.GITHUB_CLIENT_SECRET;
  if (!secret) return false;
  const separator = state.lastIndexOf(".");
  if (separator <= 0) return false;
  const value = state.slice(0, separator);
  const provided = state.slice(separator + 1);
  const expected = createHmac("sha256", secret).update(value).digest("base64url");
  if (provided.length !== expected.length) return false;
  if (!timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) return false;
  const timestamp = Number(value.slice(value.lastIndexOf(".") + 1));
  return Number.isFinite(timestamp) && Date.now() - timestamp >= 0 && Date.now() - timestamp < 10 * 60 * 1000;
}

function callbackPage(payload: { account?: { id: string; username: string; token: string; avatarUrl?: string }; error?: string }) {
  const serialized = JSON.stringify(payload).replace(/</g, "\\u003c");
  return `<!doctype html><meta charset="utf-8"><title>GitHub connection</title><script>
const payload=${serialized};
if (window.opener && !window.opener.closed) window.opener.postMessage({type:"enosx-github-oauth",payload}, window.location.origin);
window.close();
</script><body style="font-family:sans-serif;background:#0a0a0a;color:#eee;padding:2rem">${payload.error ? "GitHub connection failed. You can close this window." : "GitHub connected. You can close this window."}</body>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).send("Method not allowed");
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const error = typeof req.query.error === "string" ? req.query.error : "";
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (error) return res.status(400).send(callbackPage({ error: "GitHub authorization was cancelled" }));
  if (!code || !verifyState(state)) return res.status(400).send(callbackPage({ error: "Invalid OAuth state or authorization code" }));

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) return res.status(503).send(callbackPage({ error: "GitHub OAuth is not configured on the server" }));

  try {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    const tokenData = await tokenResponse.json() as { access_token?: string; error?: string };
    if (!tokenResponse.ok || !tokenData.access_token) throw new Error(tokenData.error || "GitHub token exchange failed");

    const userResponse = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: "application/vnd.github+json", "User-Agent": "ENOSX-AI" },
    });
    if (!userResponse.ok) throw new Error("GitHub profile lookup failed");
    const user = await userResponse.json() as { login: string; avatar_url?: string };
    return res.status(200).send(callbackPage({
      account: { id: user.login, username: user.login, avatarUrl: user.avatar_url, token: tokenData.access_token },
    }));
  } catch (err) {
    console.error("GitHub OAuth callback failed", err);
    return res.status(502).send(callbackPage({ error: "Unable to complete GitHub connection" }));
  }
}
