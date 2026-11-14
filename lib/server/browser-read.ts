/**
 * ENOSX AI — /api/browser/read (Vercel Serverless Function)
 * Read-only webpage extraction for chat study and the computer workspace.
 * Only public HTTP(S) pages are fetched; every redirect is validated and DNS-pinned.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { lookup as dnsLookup } from "node:dns/promises";
import * as https from "node:https";
import * as http from "node:http";
import { isIP } from "node:net";
import { URL } from "node:url";

const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_TEXT_CHARS = 8_000;
const MAX_REDIRECTS = 3;
const REQUEST_TIMEOUT_MS = 12_000;
const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 8;
const requestCounts = new Map<string, { count: number; windowStart: number }>();
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const PRIVATE_HOST_SUFFIXES = [".localhost", ".local", ".internal", ".home.arpa"];

interface FetchedPage {
  html: string;
  url: string;
}

function parseIpv6Groups(address: string): number[] | null {
  const value = address.toLowerCase();
  if (value.includes("%") || value.includes(".")) return null;
  const sides = value.split("::");
  if (sides.length > 2) return null;
  const left = sides[0] ? sides[0].split(":") : [];
  const right = sides.length === 2 && sides[1] ? sides[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if ((sides.length === 1 && missing !== 0) || (sides.length === 2 && missing < 1)) return null;
  const groups = [...left, ...Array(Math.max(0, missing)).fill("0"), ...right];
  if (groups.length !== 8 || groups.some((group) => !/^[0-9a-f]{1,4}$/.test(group))) return null;
  return groups.map((group) => Number.parseInt(group, 16));
}

const BLOCKED_IPV4_CIDRS = [
  "0.0.0.0/8", "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8", "169.254.0.0/16",
  "172.16.0.0/12", "192.0.0.0/24", "192.0.2.0/24", "192.88.99.0/24", "192.168.0.0/16",
  "198.18.0.0/15", "198.51.100.0/24", "203.0.113.0/24", "224.0.0.0/4", "240.0.0.0/4",
];

function ipv4Number(address: string): number | null {
  if (isIP(address) !== 4) return null;
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return parts.reduce((value, part) => value * 256 + part, 0);
}

function isBlockedIpv4(address: string): boolean {
  const value = ipv4Number(address);
  if (value === null) return true;
  return BLOCKED_IPV4_CIDRS.some((cidr) => {
    const [networkAddress, prefixText] = cidr.split("/");
    const network = ipv4Number(networkAddress);
    const prefix = Number(prefixText);
    if (network === null || !Number.isInteger(prefix)) return true;
    const divisor = 2 ** (32 - prefix);
    return Math.floor(value / divisor) === Math.floor(network / divisor);
  });
}

function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !isBlockedIpv4(address);

  if (family === 6) {
    const groups = parseIpv6Groups(address);
    if (!groups) return false;
    const first = groups[0];
    // Only accept global unicast space; exclude documentation, transition, and special-use ranges.
    if (first < 0x2000 || first > 0x3fff) return false;
    if (first === 0x2001 && (groups[1] === 0 || groups[1] === 0x0db8)) return false;
    if (first === 0x2002) return false;
    return true;
  }

  return false;
}

function normalizePublicUrl(value: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Invalid URL");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("Only public HTTP(S) websites can be read");
  if (parsed.username || parsed.password) throw new Error("URLs containing credentials are not allowed");
  const expectedPort = parsed.protocol === "https:" ? "443" : "80";
  if (parsed.port && parsed.port !== expectedPort) throw new Error("Non-standard ports are not allowed");

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!hostname || hostname === "localhost" || PRIVATE_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    throw new Error("Private/internal network hosts are not allowed");
  }
  if (isIP(hostname) && !isPublicAddress(hostname)) throw new Error("Private/internal network hosts are not allowed");
  parsed.hash = "";
  return parsed;
}

async function resolvePublicAddresses(hostname: string): Promise<Array<{ address: string; family: number }>> {
  const normalized = hostname.replace(/^\[|\]$/g, "");
  const literalFamily = isIP(normalized);
  const addresses = literalFamily
    ? [{ address: normalized, family: literalFamily }]
    : await dnsLookup(normalized, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((entry) => !isPublicAddress(entry.address))) {
    throw new Error("Private/internal network hosts are not allowed");
  }
  return addresses;
}

function requestPage(parsed: URL, addresses: Array<{ address: string; family: number }>): Promise<{
  status: number;
  location?: string;
  html: string;
}> {
  return new Promise((resolve, reject) => {
    const client = parsed.protocol === "https:" ? https : http;
    let settled = false;
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    const pinnedLookup: NonNullable<http.RequestOptions["lookup"]> = (_hostname, options, callback) => {
      const requestedFamily = options.family === "IPv4" ? 4 : options.family === "IPv6" ? 6 : options.family;
      const compatible = requestedFamily ? addresses.filter((entry) => entry.family === requestedFamily) : addresses;
      if (options.all) {
        if (!compatible.length) {
          const error = Object.assign(new Error("No public address is available"), { code: "ENOTFOUND" });
          callback(error, []);
          return;
        }
        callback(null, compatible);
        return;
      }
      const selected = compatible[0];
      if (!selected) {
        const error = Object.assign(new Error("No public address is available"), { code: "ENOTFOUND" });
        callback(error, "", 0);
        return;
      }
      callback(null, selected.address, selected.family);
    };

    const request = client.get(parsed, {
      lookup: pinnedLookup,
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ENOSXAI-WebStudy/1.0)",
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.8",
        "Accept-Encoding": "identity",
        "Accept-Language": "en-US,en;q=0.9",
      },
    }, (response) => {
      const status = response.statusCode || 0;
      const location = response.headers.location;
      if (REDIRECT_STATUSES.has(status)) {
        response.resume();
        settled = true;
        resolve({ status, location, html: "" });
        return;
      }
      if (status < 200 || status >= 300) {
        response.resume();
        fail(new Error("The website returned an unsuccessful response"));
        return;
      }
      const contentType = String(response.headers["content-type"] || "").toLowerCase();
      if (!/(?:text\/html|application\/xhtml\+xml|text\/plain)/.test(contentType)) {
        response.resume();
        fail(new Error("The URL did not return a readable webpage"));
        return;
      }
      const contentLength = Number(response.headers["content-length"] || 0);
      if (contentLength > MAX_RESPONSE_BYTES) {
        response.resume();
        fail(new Error("The webpage is larger than the allowed reading limit"));
        return;
      }

      const chunks: Buffer[] = [];
      let total = 0;
      response.on("data", (chunk: Buffer) => {
        total += chunk.length;
        if (total > MAX_RESPONSE_BYTES) {
          response.destroy();
          fail(new Error("The webpage is larger than the allowed reading limit"));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => {
        if (settled) return;
        settled = true;
        resolve({ status, html: Buffer.concat(chunks).toString("utf-8") });
      });
      response.on("error", (error) => fail(error));
    });

    request.on("timeout", () => request.destroy(new Error("The website took too long to respond")));
    request.on("error", (error) => fail(error));
  });
}

async function fetchPage(value: string, depth = 0, visited = new Set<string>()): Promise<FetchedPage> {
  const parsed = normalizePublicUrl(value);
  const normalizedUrl = parsed.toString();
  if (visited.has(normalizedUrl)) throw new Error("The website redirected in a loop");
  visited.add(normalizedUrl);

  const addresses = await resolvePublicAddresses(parsed.hostname);
  const response = await requestPage(parsed, addresses);
  if (REDIRECT_STATUSES.has(response.status)) {
    if (!response.location || depth >= MAX_REDIRECTS) throw new Error("The website redirected too many times");
    const nextUrl = new URL(response.location, parsed).toString();
    return fetchPage(nextUrl, depth + 1, visited);
  }
  return { html: response.html, url: normalizedUrl };
}

function decodeHtmlEntities(value: string): string {
  const decodeCodePoint = (raw: string, radix = 10) => {
    const point = Number.parseInt(raw, radix);
    return Number.isInteger(point) && point >= 0 && point <= 0x10ffff ? String.fromCodePoint(point) : "\uFFFD";
  };
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, decimal: string) => decodeCodePoint(decimal))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => decodeCodePoint(hex, 16));
}

function extractText(html: string): string {
  return decodeHtmlEntities(html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template|nav|footer|header)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|article|section|li|h[1-6]|tr|main)\s*>/gi, "\n")
    .replace(/<[^>]+>/g, " "))
    .replace(/[\t\f\v ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_TEXT_CHARS);
}

function extractTitle(html: string): string {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeHtmlEntities(match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()).slice(0, 200) : "";
}

function extractLinks(html: string, baseUrl: string): Array<{ href: string; text: string }> {
  const links: Array<{ href: string; text: string }> = [];
  const anchorRegex = /<a\b[^>]*href=["']([^"']+?)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const base = new URL(baseUrl);
  let match: RegExpExecArray | null;
  while ((match = anchorRegex.exec(html)) !== null) {
    const hrefValue = match[1].trim();
    if (!hrefValue || /^(?:#|mailto:|javascript:|data:)/i.test(hrefValue)) continue;
    try {
      const href = new URL(hrefValue, base).toString();
      if (new URL(href).protocol !== "http:" && new URL(href).protocol !== "https:") continue;
      if (links.some((link) => link.href === href)) continue;
      const text = decodeHtmlEntities(match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()).slice(0, 240);
      links.push({ href, text });
      if (links.length >= 150) break;
    } catch {
      continue;
    }
  }
  return links;
}

function allowRequest(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin;
  if (typeof origin === "string") {
    try {
      const parsed = new URL(origin);
      const host = parsed.hostname.toLowerCase();
      const local = (parsed.protocol === "http:" || parsed.protocol === "https:" || parsed.protocol === "tauri:")
        && (host === "localhost" || host === "127.0.0.1");
      const production = (parsed.protocol === "https:" || parsed.protocol === "http:")
        && (host === "enosx.ai" || host.endsWith(".enosx.ai") || host === "enosxai.vercel.app" || host.endsWith(".vercel.app"));
      if (!local && !production) {
        res.status(403).json({ error: "Origin not allowed" });
        return false;
      }
    } catch {
      res.status(403).json({ error: "Origin not allowed" });
      return false;
    }
  }
  return true;
}

function rateLimited(req: VercelRequest): boolean {
  const ip = String(req.headers["x-forwarded-for"] || "unknown").split(",")[0].trim().slice(0, 80);
  const now = Date.now();
  const previous = requestCounts.get(ip);
  if (previous && now - previous.windowStart < RATE_WINDOW_MS && previous.count >= MAX_REQUESTS_PER_WINDOW) return true;
  requestCounts.set(ip, !previous || now - previous.windowStart >= RATE_WINDOW_MS
    ? { count: 1, windowStart: now }
    : { ...previous, count: previous.count + 1 });
  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!allowRequest(req, res)) return;

  const isLegacyGet = req.method === "GET" && !req.query.route;
  if (req.method !== "POST" && !isLegacyGet) {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (rateLimited(req)) return res.status(429).json({ error: "Website reading rate limit reached. Please wait and try again." });

  let body: any = {};
  if (isLegacyGet) {
    body = { url: req.query.url };
  } else {
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    } catch {
      return res.status(400).json({ error: "Invalid request body" });
    }
  }

  if (typeof body?.url !== "string" || !body.url.trim()) return res.status(400).json({ error: "URL is required" });
  try {
    normalizePublicUrl(body.url);
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : "Invalid URL" });
  }

  try {
    const page = await fetchPage(body.url);
    const payload: { title: string; url: string; text: string; links?: Array<{ href: string; text: string }> } = {
      title: extractTitle(page.html),
      url: page.url,
      text: extractText(page.html),
    };
    if (req.query.mode === "links") payload.links = extractLinks(page.html, page.url);
    return res.status(200).json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const isPrivateTarget = message.includes("Private/internal network hosts are not allowed");
    if (!isPrivateTarget) console.error("[API/browser/read] Failed to read webpage:", message);
    return res.status(isPrivateTarget ? 403 : 502).json({
      error: isPrivateTarget ? message : "Failed to read webpage. The page may be unavailable, protected, or too large to fetch.",
    });
  }
}
