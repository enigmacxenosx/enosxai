import { useCallback } from "react";

export function useTools() {
  const searchWeb = useCallback(async (query: string) => {
    try {
      const response = await fetch("/api/media-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, type: "web" }),
      });
      if (!response.ok) throw new Error(`Tavily search failed (${response.status})`);
      const data = await response.json() as { results?: Array<{ title?: string; url?: string; snippet?: string }> };
      const results = (Array.isArray(data.results) ? data.results : []).slice(0, 5).map((result) => ({
        title: result.title,
        link: result.url,
        snippet: result.snippet,
      }));
      return JSON.stringify(results, null, 2);
    } catch (error) {
      console.error("Tavily search error:", error);
      return "Search failed due to an error.";
    }
  }, []);

  const scrapeWebpage = useCallback(async (url: string) => {
    try {
      // Using Jina Reader for clean markdown extraction
      const response = await fetch(`https://r.jina.ai/${url}`, {
        method: "GET",
        headers: {
          "Accept": "text/event-stream",
        },
      });

      if (!response.ok) throw new Error("Scraping failed");
      const text = await response.text();
      return text.slice(0, 10000); // Limit to 10k chars for context
    } catch (error) {
      console.error("Scraping error:", error);
      return "Failed to extract content from the webpage.";
    }
  }, []);

  return { searchWeb, scrapeWebpage };
}
