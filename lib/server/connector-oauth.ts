import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

type Connector = "github" | "vercel" | "shopify" | "email";
const pkce = new Map<string, string>();

function isConnector(value: unknown): value is Connector { return ["github", "vercel", "shopify", "email"].includes(String(value)); }
function getOrigin(req: VercelRequest, envName: string) { return process.env[envName]?.replace(/\/$/, "") || `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`; }
function getSecret() { return process.env.CONNECTOR_OAUTH_STATE_SECRET || process.env.GITHUB_OAUTH_STATE_SECRET || process.env.GITHUB_CLIENT_SECRET || ""; }
function sign(value: string) { return `${value}.${createHmac("sha256", getSecret()).update(value).digest("base64url")}`; }
function verify(value: string, connector: Connector) {
  const separator = value.lastIndexOf("."), secret = getSecret();
  if (!secret || separator <= 0) return null;
  const raw = value.slice(0, separator), provided = value.slice(separator + 1), expected = createHmac("sha256", secret).update(raw).digest("base64url");
  if (provided.length !== expected.length || !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) return null;
  const [nonce, timestamp, stateConnector, shop = ""] = raw.split(".");
  if (!nonce || stateConnector !== connector || !Number.isFinite(Number(timestamp)) || Date.now() < Number(timestamp) || Date.now() - Number(timestamp) >= 10 * 60 * 1000) return null;
  return { shop };
}
function credentials(connector: Connector) {
  if (connector === "github") return [process.env.GITHUB_CLIENT_ID, process.env.GITHUB_CLIENT_SECRET];
  if (connector === "vercel") return [process.env.VERCEL_OAUTH_CLIENT_ID, process.env.VERCEL_OAUTH_CLIENT_SECRET];
  if (connector === "shopify") return [process.env.SHOPIFY_OAUTH_CLIENT_ID, process.env.SHOPIFY_OAUTH_CLIENT_SECRET];
  return [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET];
}
function redirectEnv(connector: Connector) { return connector === "github" ? "GITHUB_OAUTH_REDIRECT_ORIGIN" : connector === "vercel" ? "VERCEL_OAUTH_REDIRECT_ORIGIN" : connector === "shopify" ? "SHOPIFY_OAUTH_REDIRECT_ORIGIN" : "GOOGLE_OAUTH_REDIRECT_ORIGIN"; }
function callbackPage(connector: Connector, payload: Record<string, unknown>) {
  const safe = JSON.stringify({ connector, ...payload }).replace(/</g, "\\u003c");
  const failed = Boolean(payload.error);
  return `<!doctype html><meta charset="utf-8"><title>${connector} connection</title><script>const payload=${safe};if(window.opener&&!window.opener.closed)window.opener.postMessage({type:"enosx-connector-oauth",payload},window.location.origin);window.close();</script><body style="font-family:sans-serif;background:#0a0a0a;color:#eee;padding:2rem">${failed ? "Connection failed. You can close this window." : "Connected. You can close this window."}</body>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const connector = (req.query.connector || req.body?.connector) as Connector;
  const phase = String(req.query.phase || req.body?.phase || "start");
  if (!isConnector(connector)) return res.status(404).json({ error: "Unknown connector" });
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const [clientId, clientSecret] = credentials(connector);
  res.setHeader("Cache-Control", "no-store");
  if (phase === "start") {
    if (!clientId || !clientSecret || !getSecret()) return res.status(503).json({ error: `${connector} OAuth is not configured on the server` });
    const shop = typeof req.query.shop === "string" ? req.query.shop.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "") : "";
    if (connector === "shopify" && !/^[a-z0-9][a-z0-9-]+\.myshopify\.com$/.test(shop)) return res.status(400).json({ error: "A valid Shopify shop domain is required" });
    const state = sign(`${randomBytes(24).toString("base64url")}.${Date.now()}.${connector}.${shop}`);
    const redirectUri = `${getOrigin(req, redirectEnv(connector))}/api/connectors/${connector}/oauth/callback`;
    const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: "code", state });
    let authorization = "";
    if (connector === "github") { params.set("scope", "repo read:user user:email"); authorization = `https://github.com/login/oauth/authorize?${params}`; }
    if (connector === "vercel") { const verifier = randomBytes(32).toString("base64url"); pkce.set(state, verifier); params.set("scope", "openid email profile offline_access"); params.set("code_challenge", createHash("sha256").update(verifier).digest("base64url")); params.set("code_challenge_method", "S256"); authorization = `https://vercel.com/oauth/authorize?${params}`; }
    if (connector === "shopify") { params.set("scope", process.env.SHOPIFY_OAUTH_SCOPES || "read_products"); authorization = `https://${shop}/admin/oauth/authorize?${params}`; }
    if (connector === "email") { params.set("scope", "openid email profile"); params.set("access_type", "offline"); params.set("prompt", "consent"); authorization = `https://accounts.google.com/o/oauth2/v2/auth?${params}`; }
    return res.redirect(302, authorization);
  }
  const error = typeof req.query.error === "string" ? req.query.error : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const verified = verify(state, connector);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  if (error || !verified || typeof req.query.code !== "string") return res.status(400).send(callbackPage(connector, { error: error ? "Authorization was cancelled" : "Invalid OAuth state or authorization code" }));
  try {
    const code = req.query.code;
    const redirectUri = `${getOrigin(req, redirectEnv(connector))}/api/connectors/${connector}/oauth/callback`;
    const tokenUrl = connector === "github" ? "https://github.com/login/oauth/access_token" : connector === "vercel" ? "https://api.vercel.com/login/oauth/token" : connector === "shopify" ? `https://${verified.shop}/admin/oauth/access_token` : "https://oauth2.googleapis.com/token";
    const body: Record<string, string> = { client_id: clientId!, client_secret: clientSecret!, code, redirect_uri: redirectUri, grant_type: "authorization_code" };
    if (connector === "vercel") body.code_verifier = pkce.get(state) || "";
    pkce.delete(state);
    const tokenResponse = await fetch(tokenUrl, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const token = await tokenResponse.json() as any;
    if (!tokenResponse.ok || !token.access_token) throw new Error("Token exchange failed");
    const profileUrl = connector === "github" ? "https://api.github.com/user" : connector === "vercel" ? "https://api.vercel.com/login/oauth/userinfo" : connector === "email" ? "https://openidconnect.googleapis.com/v1/userinfo" : `https://${verified.shop}/admin/api/2024-10/shop.json`;
    const profileResponse = await fetch(profileUrl, { headers: { Authorization: `Bearer ${token.access_token}`, Accept: "application/json", "User-Agent": "ENOSX-AI" } });
    const profile = await profileResponse.json() as any;
    if (!profileResponse.ok) throw new Error("Profile lookup failed");
    const user = connector === "shopify" ? profile.shop : profile;
    const username = user.login || user.username || user.email || user.name || verified.shop;
    return res.status(200).send(callbackPage(connector, { account: { id: String(user.id || username), username: String(username), token: token.access_token, refreshToken: token.refresh_token, avatarUrl: user.avatar_url || user.picture } }));
  } catch (callbackError) { console.error(`${connector} OAuth callback failed`, callbackError); return res.status(502).send(callbackPage(connector, { error: "Unable to complete connection" })); }
}
