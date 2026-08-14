/**
 * ENOSX AI — /api/browser (Vercel Serverless Function)
 * Performs webpage scraping and security analysis.
 * Uses only Node.js built-in modules — no external dependencies.
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
          timeout: 10000,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer) => chunks.push(chunk));
          res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
          res.on("error", reject);
        },
      )
      .on("error", reject);
  });
}

function extractText(html: string): string {
  // Strip script/style tags and their content
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  // Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, " ");
  // Normalize whitespace and trim
  text = text.replace(/\s+/g, " ").trim();
  return text.slice(0, 3000);
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].replace(/\s+/g, " ").trim() : "";
}

function extractScripts(html: string): string {
  const matches = html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi);
  let allScripts = "";
  for (const m of matches) {
    allScripts += m[1] + "\n";
  }
  return allScripts;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const { url } = req.query;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    const html = await fetchPage(url);
    const title = extractTitle(html);
    const text = extractText(html);
    const scriptContent = extractScripts(html);

    // Security Analysis Logic
    const indicators: string[] = [];

    if (
      scriptContent.includes("getUserMedia") ||
      scriptContent.includes("ImageCapture")
    ) {
      indicators.push("Requests camera/microphone access automatically.");
    }
    if (
      scriptContent.includes("ipinfo.io") ||
      scriptContent.includes("ipapi.co")
    ) {
      indicators.push("Attempts to track your precise IP address and location.");
    }
    if (
      html.toLowerCase().includes("verify you're not a bot") &&
      (html.toLowerCase().includes("camera") ||
        html.toLowerCase().includes("video"))
    ) {
      indicators.push(
        "Uses deceptive 'Bot Verification' to gain hardware access.",
      );
    }

    return res.json({
      title,
      url,
      text,
      securityReport: {
        isSuspicious: indicators.length > 0,
        indicators,
        riskLevel:
          indicators.length > 1
            ? "High"
            : indicators.length > 0
              ? "Medium"
              : "Low",
      },
    });
  } catch (err) {
    return res.status(500).json({
      error: "Failed to read webpage",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
