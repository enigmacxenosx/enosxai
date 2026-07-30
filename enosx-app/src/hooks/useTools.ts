import { useCallback } from "react";

const SEARCH_API_KEY = import.meta.env.VITE_SERPER_API_KEY || ""; // Using Serper.dev for search

export function useTools() {
  const searchWeb = useCallback(async (query: string) => {
    if (!SEARCH_API_KEY) {
      console.warn("Serper API Key is missing. Web search will not work.");
      return "Search failed: API key missing.";
    }

    try {
      const response = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": SEARCH_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q: query }),
      });

      const data = await response.json();
      const results = data.organic?.slice(0, 5).map((res: any) => ({
        title: res.title,
        link: res.link,
        snippet: res.snippet,
      }));

      return JSON.stringify(results, null, 2);
    } catch (error) {
      console.error("Search error:", error);
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
