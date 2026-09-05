/**
 * ENOSX AI — /api/browser/read  (Vercel Serverless Function)
 * Read-only webpage content extraction used by the Enosx Computer workspace.
 * Uses only Node.js built-in modules — no external dependencies.
 *
 * Request body: { url: string, selector?: string }
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import * as https from "node:https";
import * as http from "node:http";
import { URL } from "node:url";

const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "169.254.169.254", "10.0.0.0"]);

function isBlockedHost(parsed: URL): boolean {
  if (BLOCKED_HOSTS.has(parsed.hostname)) return true;
  if (/^10\./.test(parsed.hostname) || /^172\.(1[6-9]|2\d|3[01])\./.test(parsed.hostname)) return true;
  return false;
}

function fetchPage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === "https:" ? https : http;

    lib
      .get(
        url,
        {
          timeout: 12000,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          let total = 0;
          const MAX = 2 * 1024 * 1024;
          res.on("data", (chunk: Buffer) => {
            total += chunk.length;
            if (total <= MAX) chunks.push(chunk);
          });
          res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
          res.on("error", reject);
        },
      )
      .on("error", reject);
  });
}

function extractText(html: string, maxChars = 6000): string {
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<[^>]+>/g, " ");
  text = text.replace(/\s+/g, " ").trim();
  return text.slice(0, maxChars);
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].replace(/\s+/g, " ").trim() : "";
}

function extractLinks(html: string, baseUrl: string): Array<{ href: string; text: string }> {
  const links: Array<{ href: string; text: string }> = [];
  const anchorRegex = /<a[^>]+href=["']([^"']+?)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  try {
    const base = new URL(baseUrl);
    while ((match = anchorRegex.exec(html)) !== null) {
      let href = match[1].trim();
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("javascript:")) continue;
      try {
        href = new URL(href, base).toString();
      } catch {
        continue;
      }
      const text = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (links.some((link) => link.href === href)) continue;
      links.push({ href, text });
      if (links.length >= 150) break;
    }
  } catch {
    // Fall back to plain href scrape on malformed base URL.
  }
  return links;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body: any = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  } catch {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const { url } = body;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "URL is required" });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }
  if (!/^https?:$/i.test(parsed.protocol)) {
    return res.status(400).json({ error: "Only http(s) URLs are supported" });
  }
  if (isBlockedHost(parsed)) {
    return res.status(403).json({ error: "Private/internal network hosts are not allowed" });
  }

  try {
    const html = await fetchPage(url);
    const payload: { title: string; url: string; text: string; links?: Array<{ href: string; text: string }> } = {
      title: extractTitle(html),
      url,
      text: extractText(html),
    };

    // The legacy ?mode=links behavior is kept for compatibility.
    if (req.query.mode === "links") {
      payload.links = extractLinks(html, url);
    }
    return res.json(payload);
  } catch (err) {
    console.error("[API/browser/read] Failed to read webpage:", err);
    return res.status(500).json({
      error: "Failed to read webpage",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
