export type TavilySearchType = "web" | "images" | "videos";

export type NormalizedSearchResult = {
  title: string;
  url: string;
  imageUrl?: string;
  source?: string;
  snippet?: string;
};

const VIDEO_DOMAINS = ["youtube.com", "youtu.be", "vimeo.com"];

function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2_000) return null;
  try {
    const url = new URL(value);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function cleanText(value: unknown, max = 200): string {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) : "";
}

function sourceName(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, "").slice(0, 100);
  } catch {
    return "";
  }
}

export async function searchTavily(query: string, type: TavilySearchType, apiKey: string): Promise<NormalizedSearchResult[]> {
  const payload: Record<string, unknown> = {
    query,
    search_depth: "basic",
    max_results: 20,
    include_answer: false,
    include_images: type === "images",
    include_image_descriptions: type === "images",
    safe_search: true,
  };
  if (type === "videos") payload.include_domains = VIDEO_DOMAINS;

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    signal: AbortSignal.timeout(12_000),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Tavily search failed with status ${response.status}`);

  const data = await response.json() as {
    results?: Array<{ title?: unknown; url?: unknown; content?: unknown; images?: Array<{ url?: unknown; description?: unknown }> }>;
    images?: Array<{ url?: unknown; description?: unknown }>;
  };

  if (type === "images") {
    const linkedImages = (Array.isArray(data.results) ? data.results : []).flatMap((result) => {
      const pageUrl = safeHttpUrl(result.url);
      const pageTitle = cleanText(result.title, 180) || "Online image";
      const images = Array.isArray(result.images) ? result.images : [];
      return images.flatMap((image) => {
        const imageUrl = safeHttpUrl(image?.url);
        if (!imageUrl) return [];
        return [{ title: cleanText(image.description, 180) || pageTitle, url: pageUrl || imageUrl, imageUrl, source: pageUrl ? sourceName(pageUrl) : undefined }];
      });
    });
    if (linkedImages.length) return linkedImages;

    // Tavily may return query-related images without their source-page association.
    return (Array.isArray(data.images) ? data.images : []).flatMap((image) => {
      const imageUrl = safeHttpUrl(image?.url);
      if (!imageUrl) return [];
      return [{ title: cleanText(image.description, 180) || "Online image", url: imageUrl, imageUrl }];
    });
  }

  return (Array.isArray(data.results) ? data.results : []).slice(0, 6).flatMap((result) => {
    const url = safeHttpUrl(result.url);
    if (!url) return [];
    const title = cleanText(result.title, 180) || (type === "videos" ? "Video result" : "Web result");
    const snippet = cleanText(result.content, 500);
    return [{ title, url, source: sourceName(url), ...(snippet ? { snippet } : {}) }];
  });
}
