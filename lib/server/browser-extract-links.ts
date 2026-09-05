/**
 * ENOSX AI — /api/browser/extract-links  (Vercel Serverless Function)
 * Read-only link extraction used by the Enosx Computer workspace browser.
 * Request body: { url: string }
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import * as https from "node:https";
import * as http from "node:http";
import { URL } from "node:url";

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

  try {
    const html = await fetchPage(url);
    const links: Array<{ href: string; text: string }> = [];
    const base = new URL(url);
    const anchorRegex = /<a[^>]+href=["']([^"']+?)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;
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
    return res.json({ links, url });
  } catch (err) {
    console.error("[API/browser/extract-links] Failed:", err);
    return res.status(500).json({
      error: "Failed to extract links",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
