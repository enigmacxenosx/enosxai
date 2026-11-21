export type OnlineMediaType = "images" | "videos" | "music" | "both" | "videos-and-music" | "all";
type SearchableMediaType = Exclude<OnlineMediaType, "both" | "videos-and-music" | "all">;

export interface OnlineMediaRequest {
  type: OnlineMediaType;
  query: string;
  purpose?: "music";
}

export interface OnlineMediaResult {
  context: string;
  issue: string | null;
}

export interface WebsiteStudyResult {
  title: string;
  url: string;
  text: string;
  issue: string | null;
}

function isHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function getOnlineMediaSearch(text: string): OnlineMediaRequest | null {
  const imageIntent = /\b(?:image|images|picture|pictures|photo|photos)\b/i.test(text);
  const videoIntent = /\b(?:video|videos|clip|clips|movie|movies)\b/i.test(text);
  const musicIntent = /\b(?:audio|music|songs?|tracks?|albums?|playlists?|podcasts?)\b/i.test(text)
    || /^\s*(?:please\s+)?(?:play|listen\s+to|put\s+on)\s+/i.test(text);
  const musicAction = /\b(?:play|listen\s+to|put\s+on|search|find|show|recommend|suggest)\b/i.test(text);
  const wantsMusic = musicIntent && musicAction;
  if (!imageIntent && !videoIntent && !wantsMusic) return null;

  const explicitlyOnline = /\b(?:online|internet|web|youtube|vimeo|spotify|soundcloud)\b/i.test(text);
  const searchAction = /\b(?:search|find|show|display|look\s+up|recommend|suggest|watch|give\s+me|get\s+me|play|listen\s+to|put\s+on)\b/i.test(text);
  const learningIntent = /\b(?:tutorial|tutorials|lesson|lessons|walkthrough|how\s+to|teach\s+me|learn\s+how)\b/i.test(text);
  if (!wantsMusic && !explicitlyOnline && !searchAction && !learningIntent) return null;

  const generationRequest = /\b(?:generate|create|draw|paint|render|illustrate|design)\b.{0,120}\b(?:image|picture|photo|artwork|video)\b/i.test(text);
  if (generationRequest && !explicitlyOnline && !/\b(?:search|find|recommend|suggest|watch)\b/i.test(text)) return null;

  const type: OnlineMediaType = imageIntent && (videoIntent || wantsMusic)
    ? videoIntent && wantsMusic ? "all" : videoIntent ? "both" : "all"
    : videoIntent && wantsMusic ? "videos-and-music"
      : wantsMusic ? "music" : videoIntent ? "videos" : "images";
  let query = text
    .replace(/^\s*(?:please\s+)?(?:can\s+you\s+|could\s+you\s+|would\s+you\s+)?(?:play|listen\s+to|put\s+on)\s+/i, " ")
    .replace(/\b(?:please|can you|could you|would you|online|on the internet|from the internet|from online|from the web|on the web|search(?:\s+for)?|find|show(?:\s+me)?|display|look\s+up|recommend|suggest|watch|play|listen\s+to|put\s+on|give\s+me|get\s+me)\b/gi, " ")
    .replace(/\b(?:some|audio|music|songs?|tracks?|albums?|playlists?|podcasts?|videos?|clips?|movies?)\b/gi, " ")
    .replace(/\b(?:and|or)\s+(?=(?:of|about|in|on|for|with)\b)/gi, " ")
    .replace(/^\s*(?:a|an|the|by|from)\s+/i, " ")
    .replace(/[?!.,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!query && wantsMusic) query = "popular music";
  return { type, query: (query || text).slice(0, 240) };
}

function safeMarkdownUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const url = isHttpUrl(value);
  return url ? url.replace(/\(/g, "%28").replace(/\)/g, "%29").replace(/\s/g, "%20") : null;
}

function cleanLabel(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  return value.replace(/[\r\n\[\]]/g, " ").replace(/\s+/g, " ").trim().slice(0, 150) || fallback;
}

async function searchMediaType(query: string, type: SearchableMediaType, purpose?: "music"): Promise<{
  type: SearchableMediaType;
  markdown: string;
  failed: boolean;
  empty: boolean;
}> {
  try {
    const response = await fetch("/api/media-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, type }),
    });
    if (!response.ok) return { type, markdown: "", failed: true, empty: false };

    const payload = await response.json() as { results?: Array<{ title?: string; url?: string; imageUrl?: string; source?: string }> };
    const rows = Array.isArray(payload.results) ? payload.results : [];
    const lines = rows.flatMap((item) => {
      const pageUrl = safeMarkdownUrl(item.url);
      const mediaUrl = safeMarkdownUrl(type === "images" ? item.imageUrl || item.url : item.url);
      if (!mediaUrl) return [];
      const title = cleanLabel(item.title, type === "images" ? "Online image" : type === "music" ? "Music track" : "Online video");
      const source = typeof item.source === "string" ? item.source.replace(/[\r\n\[\]]/g, " ").slice(0, 80) : "";
      if (type === "images") {
        const sourceLink = pageUrl ? `[Source: ${title}${source ? ` — ${source}` : ""}](${pageUrl})` : `[Open image](${mediaUrl})`;
        return [`![${title}](${mediaUrl})\n${sourceLink}`];
      }
      if (type === "music") {
        const sourceLink = pageUrl ? `[Source: ${title}${source ? ` — ${source}` : ""}](${pageUrl})` : `[Open track](${mediaUrl})`;
        return [`[Audio preview: ${title}](${mediaUrl})\n${sourceLink}`];
      }
      return [`[${title}${source ? ` — ${source}` : ""}](${mediaUrl})`];
    });
    const heading = type === "images" ? "Online image results" : purpose === "music" && type === "videos" ? "Online music video results" : type === "music" ? "Online music track results" : "Online video results";
    return { type, markdown: lines.length ? `### ${heading}\n${lines.join("\n\n")}` : "", failed: false, empty: lines.length === 0 };
  } catch {
    return { type, markdown: "", failed: true, empty: false };
  }
}

export async function searchOnlineMedia(request: OnlineMediaRequest): Promise<OnlineMediaResult> {
  const types: SearchableMediaType[] = request.type === "both" ? ["videos", "images"]
    : request.type === "videos-and-music" ? ["videos", "music"]
      : request.type === "all" ? ["videos", "images", "music"] : [request.type];
  const results = await Promise.all(types.map((type) => searchMediaType(request.query, type, request.purpose)));
  const context = results.map((result) => result.markdown).filter(Boolean).join("\n\n");
  const failedTypes = results.filter((result) => result.failed).map((result) => result.type);
  const emptyTypes = results.filter((result) => result.empty).map((result) => result.type);
  let issue: string | null = null;

  if (!context && failedTypes.length) {
    issue = "Online media search is unavailable right now or has not been configured.";
  } else if (!context && emptyTypes.length) {
    issue = `The online search returned no ${emptyTypes.join(" or ")} for this query.`;
  } else if (failedTypes.length) {
    issue = `Some online ${failedTypes.join(" and ")} results could not be loaded; use the results that are available and say which type was unavailable.`;
  } else if (emptyTypes.length) {
    issue = `The search returned no ${emptyTypes.join(" or ")} for this query; do not invent those results.`;
  }

  return { context, issue };
}

export function getWebsiteStudyUrl(text: string): string | null {
  if (!/\b(?:study|read|summari[sz]e|analy[sz]e|review|inspect|explain|tell\s+me\s+about)\b/i.test(text)) return null;
  const match = text.match(/https?:\/\/[^\s<>"'`]+/i)?.[0];
  if (!match) return null;
  const cleaned = match.replace(/[),.;!?]+$/g, "");
  return isHttpUrl(cleaned);
}

export async function studyWebsite(url: string): Promise<WebsiteStudyResult> {
  try {
    const response = await fetch("/api/browser/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const payload = await response.json().catch(() => ({})) as { title?: string; url?: string; text?: string; error?: string };
    if (!response.ok) {
      return {
        title: "",
        url,
        text: "",
        issue: payload.error || "I could not read that website. Ask the user to verify the URL or paste the page text.",
      };
    }

    const text = typeof payload.text === "string" ? payload.text.trim().slice(0, 8_000) : "";
    if (text.length < 40) {
      return {
        title: typeof payload.title === "string" ? payload.title.slice(0, 200) : "",
        url: typeof payload.url === "string" ? payload.url : url,
        text,
        issue: "The website did not provide enough readable text to study. Ask the user to paste the relevant content or share a different page.",
      };
    }

    return {
      title: typeof payload.title === "string" ? payload.title.slice(0, 200) : "Untitled page",
      url: typeof payload.url === "string" ? payload.url : url,
      text,
      issue: null,
    };
  } catch {
    return {
      title: "",
      url,
      text: "",
      issue: "I could not connect to that website. Ask the user to verify the URL or paste the page text.",
    };
  }
}
