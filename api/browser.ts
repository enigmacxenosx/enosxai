import type { VercelRequest, VercelResponse } from "@vercel/node";
import { lookup } from "node:dns/promises";

const MAX_RESPONSE_BYTES = 1_500_000;
const MAX_TEXT_LENGTH = 20_000;

type ExtractedLink = { href: string; text: string };

function isPrivateAddress(address: string) {
  if (address === "::1" || address.startsWith("fc") || address.startsWith("fd")) return true;
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(address)) return false;
  const [a, b] = address.split(".").map(Number);
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

async function validatePublicUrl(value: unknown): Promise<URL> {
  if (typeof value !== "string" || value.length > 2048) {
    throw new Error("A valid public URL is required");
  }

  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Only HTTP and HTTPS URLs are supported");
  }
  if (url.username || url.password || url.hostname === "localhost") {
    throw new Error("Local or credential-bearing URLs are not permitted");
  }

  const resolved = await lookup(url.hostname, { all: true });
  if (!resolved.length || resolved.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("Private-network URLs are not permitted");
  }
  return url;
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function htmlToText(html: string) {
  return decodeEntities(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  ).slice(0, MAX_TEXT_LENGTH);
}

function getMeta(html: string, name: string) {
  const expression = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']*)["']`, "i");
  return decodeEntities(html.match(expression)?.[1] ?? "").trim();
}

function getTitle(html: string) {
  return decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

function getLinks(html: string, base: URL): ExtractedLink[] {
  const seen = new Set<string>();
  const links: ExtractedLink[] = [];
  const matcher = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(matcher)) {
    try {
      const href = new URL(decodeEntities(match[1]), base).toString();
      if (!/^https?:\/\//i.test(href) || seen.has(href)) continue;
      seen.add(href);
      links.push({
        href,
        text: htmlToText(match[2]).slice(0, 240) || href,
      });
      if (links.length >= 250) break;
    } catch {
      // Ignore malformed page links
    }
  }
  return links;
}

async function fetchDocument(value: unknown) {
  let url = await validatePublicUrl(value);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    let response: Response | undefined;
    for (let redirects = 0; redirects <= 4; redirects += 1) {
      response = await fetch(url, {
        signal: controller.signal,
        redirect: "manual",
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "ENOSX-AI-WebReader/1.0",
        },
      });
      const location = response.headers.get("location");
      if (response.status < 300 || response.status >= 400 || !location) break;
      url = await validatePublicUrl(new URL(location, url).toString());
    }
    if (!response) throw new Error("No response received from website");
    if (response.status >= 300 && response.status < 400) throw new Error("Too many webpage redirects");
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (!response.ok) throw new Error(`The website returned ${response.status}`);
    if (contentLength > MAX_RESPONSE_BYTES) throw new Error("The webpage is too large to process safely");
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      throw new Error("The URL did not return an HTML webpage");
    }
    const html = (await response.text()).slice(0, MAX_RESPONSE_BYTES);
    return { requestedUrl: String(value), finalUrl: url.toString(), html };
  } finally {
    clearTimeout(timeout);
  }
}

async function readPage(value: unknown) {
  const { requestedUrl, finalUrl, html } = await fetchDocument(value);
  const finalPageUrl = new URL(finalUrl);
  return {
    title: getTitle(html),
    url: finalUrl,
    requestedUrl,
    text: htmlToText(html),
    links: getLinks(html, finalPageUrl),
    metadata: {
      description: getMeta(html, "description"),
      author: getMeta(html, "author"),
    },
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Support both GET (for simple read) and POST (for actions)
  const method = req.method;
  const url = method === "GET" ? req.query.url : req.body?.url;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    if (method === "POST") {
      const { type } = req.body;
      if (type === "read_webpage" || type === "action") {
        return res.json(await readPage(url));
      }
      if (type === "extract_links") {
        const page = await readPage(url);
        return res.json({ url: page.url, links: page.links });
      }
      if (type === "click_element" || type === "fill_form") {
        return res.status(501).json({ 
          error: "Interactive browser control requires an authenticated browser provider and is not configured in serverless mode.",
          status: "AUTOMATION_NOT_CONFIGURED" 
        });
      }
    }

    // Default to readPage for GET or other POST types
    return res.json(await readPage(url));
  } catch (err) {
    return res.status(500).json({
      error: "Failed to process browser action",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
