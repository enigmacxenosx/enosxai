/**
 * ENOSX AI — /api/browser (Vercel Serverless Function)
 * Performs webpage scraping and security analysis.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";
import * as cheerio from "cheerio";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { url } = req.query;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    const html = response.data;
    const $ = cheerio.load(html);
    const title = $("title").text();
    const text = $("body").text().replace(/\s+/g, " ").trim().slice(0, 3000);
    const scriptContent = $("script").text();

    // Security Analysis Logic
    const indicators: string[] = [];
    
    if (scriptContent.includes("getUserMedia") || scriptContent.includes("ImageCapture")) {
      indicators.push("Requests camera/microphone access automatically.");
    }
    if (scriptContent.includes("ipinfo.io") || scriptContent.includes("ipapi.co")) {
      indicators.push("Attempts to track your precise IP address and location.");
    }
    if (html.toLowerCase().includes("verify you're not a bot") && (html.toLowerCase().includes("camera") || html.toLowerCase().includes("video"))) {
      indicators.push("Uses deceptive 'Bot Verification' to gain hardware access.");
    }

    res.json({
      title,
      url,
      text,
      securityReport: {
        isSuspicious: indicators.length > 0,
        indicators,
        riskLevel: indicators.length > 1 ? "High" : indicators.length > 0 ? "Medium" : "Low",
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to read webpage", details: err instanceof Error ? err.message : "Unknown error" });
  }
}
