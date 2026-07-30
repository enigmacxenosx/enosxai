import { Router, Request, Response } from "express";
import puppeteer from "puppeteer-core";
import axios from "axios";
import * as cheerio from "cheerio";

const browserRouter = Router();

// Path to Chromium in the sandbox
const CHROMIUM_PATH = "/usr/bin/chromium";

/**
 * Utility to analyze HTML for malicious indicators
 */
function analyzeMaliciousIndicators(html: string, url: string) {
  const indicators: string[] = [];
  const $ = cheerio.load(html);
  const scriptContent = $("script").text();

  // 1. Check for camera/audio access requests
  if (scriptContent.includes("getUserMedia") || scriptContent.includes("ImageCapture")) {
    indicators.push("Requests camera/microphone access automatically.");
  }

  // 2. Check for IP/Location tracking
  if (scriptContent.includes("ipinfo.io") || scriptContent.includes("ipapi.co") || scriptContent.includes("freegeoip.app")) {
    indicators.push("Attempts to track your precise IP address and location.");
  }

  // 3. Check for suspicious redirects
  if (scriptContent.includes("window.location.href") && (scriptContent.includes("profitablecpmratenetwork") || scriptContent.includes("tk"))) {
    indicators.push("Contains suspicious automatic redirects.");
  }

  // 4. Check for common phishing keywords
  const pageText = $("body").text().toLowerCase();
  if (pageText.includes("verify you're not a bot") && (scriptContent.includes("camera") || scriptContent.includes("video"))) {
    indicators.push("Uses deceptive 'Bot Verification' to gain hardware access.");
  }

  return {
    isSuspicious: indicators.length > 0,
    indicators,
    riskLevel: indicators.length > 2 ? "High" : indicators.length > 0 ? "Medium" : "Low"
  };
}

/**
 * POST /api/browser/read
 * Read webpage content and analyze security
 */
browserRouter.post("/read", async (req: Request, res: Response) => {
  let browser;
  try {
    const { url, selector } = req.body;

    if (!url || typeof url !== "string") {
      res.status(400).json({ error: "URL is required" });
      return;
    }

    browser = await puppeteer.launch({
      executablePath: CHROMIUM_PATH,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    const title = await page.title();
    const html = await page.content();
    const text = await page.evaluate(() => document.body.innerText);
    
    // Security Analysis
    const securityReport = analyzeMaliciousIndicators(html, url);

    const content = {
      title,
      url,
      text: text.slice(0, 5000), // Limit text size
      securityReport,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };

    res.json(content);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("Browser read error:", msg);
    res.status(500).json({ error: msg, status: "BROWSER_ERROR" });
  } finally {
    if (browser) await browser.close();
  }
});

/**
 * POST /api/browser/screenshot
 */
browserRouter.post("/screenshot", async (req: Request, res: Response) => {
  let browser;
  try {
    const { url } = req.body;
    if (!url) {
      res.status(400).json({ error: "URL is required" });
      return;
    }

    browser = await puppeteer.launch({
      executablePath: CHROMIUM_PATH,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    const screenshot = await page.screenshot({ encoding: "base64" });

    res.json({
      screenshot: `data:image/png;base64,${screenshot}`,
      url,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: msg });
  } finally {
    if (browser) await browser.close();
  }
});

export default browserRouter;
