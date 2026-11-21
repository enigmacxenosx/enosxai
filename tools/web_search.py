"""Live web search with Tavily and a no-key DuckDuckGo fallback."""
from __future__ import annotations
import asyncio, json, os, re
from html.parser import HTMLParser
from urllib.parse import quote
from urllib.request import Request, urlopen

class _Text(HTMLParser):
    def __init__(self): super().__init__(); self.parts=[]
    def handle_data(self, data): self.parts.append(data)

def _get(url: str, headers: dict | None = None) -> str:
    req = Request(url, headers={"User-Agent": "EnosxAI/1.0", **(headers or {})})
    with urlopen(req, timeout=15) as r: return r.read().decode("utf-8", "ignore")

def _extract(html: str, limit: int = 5000) -> str:
    p = _Text(); p.feed(html)
    return re.sub(r"\s+", " ", " ".join(p.parts)).strip()[:limit]

def _tavily(query: str) -> list[dict]:
    key = os.getenv("TAVILY_API_KEY", "").strip()
    if not key: return []
    body = json.dumps({"api_key": key, "query": query, "search_depth": "advanced", "include_answer": True}).encode()
    req = Request("https://api.tavily.com/search", data=body, headers={"Content-Type":"application/json"}, method="POST")
    with urlopen(req, timeout=20) as r: data=json.loads(r.read())
    return [{"title": x.get("title", ""), "url": x.get("url", ""), "snippet": x.get("content", "")} for x in data.get("results", [])]

def _ddgs(query: str) -> list[dict]:
    try:
        from ddgs import DDGS
        return [{"title": x.get("title", ""), "url": x.get("href", ""), "snippet": x.get("body", "")} for x in DDGS().text(query, max_results=5)]
    except Exception:
        html = _get("https://html.duckduckgo.com/html/?q=" + quote(query))
        links = re.findall(r'class="result__a" href="([^"]+)"[^>]*>(.*?)</a>', html)
        return [{"title": _extract(title, 200), "url": url, "snippet": ""} for url, title in links[:5]]

async def live_web_search(query: str, extract_pages: bool = False) -> dict:
    if not query.strip(): return {"query": query, "results": [], "error": "query is required"}
    try: results = await asyncio.to_thread(_tavily, query)
    except Exception as exc: results = []
    if not results:
        try: results = await asyncio.to_thread(_ddgs, query)
        except Exception as exc: return {"query": query, "results": [], "error": str(exc)}
    if extract_pages:
        async def enrich(item):
            try: item["page_text"] = await asyncio.to_thread(lambda: _extract(_get(item["url"])))
            except Exception: pass
            return item
        results = await asyncio.gather(*(enrich(x) for x in results))
    return {"query": query, "results": results, "source": "tavily" if os.getenv("TAVILY_API_KEY") else "ddgs"}
