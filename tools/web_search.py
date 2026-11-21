"""Live web search with Tavily and keyless public-news fallbacks."""
from __future__ import annotations

import asyncio
import json
import os
import re
from email.utils import parsedate_to_datetime
from html import unescape
from html.parser import HTMLParser
from urllib.parse import quote
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET


class _Text(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts: list[str] = []

    def handle_data(self, data):
        self.parts.append(data)


def _get(url: str, headers: dict | None = None) -> str:
    req = Request(url, headers={"User-Agent": "EnosxAI/1.0", **(headers or {})})
    with urlopen(req, timeout=15) as response:
        return response.read().decode("utf-8", "ignore")


def _extract(html: str, limit: int = 5000) -> str:
    parser = _Text()
    parser.feed(html)
    return re.sub(r"\s+", " ", " ".join(parser.parts)).strip()[:limit]


def _is_news_query(query: str) -> bool:
    return bool(re.search(r"\b(?:news|headlines?|current events?|top stories|latest|today|recent|breaking)\b", query, re.I))


def _published_date(value: str) -> str | None:
    try:
        return parsedate_to_datetime(value).isoformat()
    except (TypeError, ValueError, OverflowError):
        return None


def _tavily(query: str) -> list[dict]:
    key = os.getenv("TAVILY_API_KEY", "").strip()
    if not key:
        return []
    body = {
        "query": query,
        "search_depth": "basic",
        "topic": "news" if _is_news_query(query) else "general",
        "max_results": 8,
        "include_answer": False,
        "include_raw_content": False,
        "include_images": False,
    }
    req = Request(
        "https://api.tavily.com/search",
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )
    with urlopen(req, timeout=20) as response:
        data = json.loads(response.read())
    return [
        {
            "title": x.get("title", ""),
            "url": x.get("url", ""),
            "snippet": x.get("content", ""),
            **({"published_date": x["published_date"]} if x.get("published_date") else {}),
        }
        for x in data.get("results", [])
        if isinstance(x, dict)
    ]


def _google_news(query: str) -> list[dict]:
    """Use Google's public RSS endpoint for current news when no paid key is configured."""
    rss_url = "https://news.google.com/rss/search?q=" + quote(query) + "&hl=en-US&gl=US&ceid=US:en"
    root = ET.fromstring(_get(rss_url, {"Accept": "application/rss+xml, application/xml"}))
    results: list[dict] = []
    for item in root.findall("./channel/item")[:8]:
        title = unescape((item.findtext("title") or "").strip())
        link = (item.findtext("link") or "").strip()
        description = _extract(unescape(item.findtext("description") or ""), 600)
        published = _published_date((item.findtext("pubDate") or "").strip())
        source_node = item.find("source")
        source = (source_node.text or "").strip() if source_node is not None else ""
        if not title or not link:
            continue
        results.append({
            "title": title,
            "url": link,
            "snippet": description,
            "source": source,
            **({"published_date": published} if published else {}),
        })
    return results


def _ddgs(query: str) -> list[dict]:
    try:
        from ddgs import DDGS
        return [
            {"title": x.get("title", ""), "url": x.get("href", ""), "snippet": x.get("body", "")}
            for x in DDGS().text(query, max_results=5)
        ]
    except Exception:
        # DDG's HTML endpoint can return an anti-bot page. Treat that as a
        # failed provider instead of silently reporting an empty search.
        html = _get("https://html.duckduckgo.com/html/?q=" + quote(query))
        if "anomaly.js" in html or "challenge" in html.lower():
            raise RuntimeError("DuckDuckGo returned an anti-bot challenge")
        links = re.findall(r'class="result__a"[^>]+href="([^"]+)"[^>]*>(.*?)</a>', html, re.S)
        return [{"title": _extract(title, 200), "url": url, "snippet": ""} for url, title in links[:5]]


async def live_web_search(query: str, extract_pages: bool = False) -> dict:
    query = query.strip()
    if not query:
        return {"query": query, "results": [], "error": "query is required", "source": "none"}

    errors: list[str] = []
    results: list[dict] = []
    source = "none"
    if os.getenv("TAVILY_API_KEY", "").strip():
        try:
            results = await asyncio.to_thread(_tavily, query)
            if results:
                source = "tavily"
        except Exception as exc:
            errors.append(f"Tavily: {type(exc).__name__}")

    if not results and _is_news_query(query):
        try:
            results = await asyncio.to_thread(_google_news, query)
            if results:
                source = "google_news_rss"
        except Exception as exc:
            errors.append(f"Google News RSS: {type(exc).__name__}")

    if not results:
        try:
            results = await asyncio.to_thread(_ddgs, query)
            if results:
                source = "ddgs"
        except Exception as exc:
            errors.append(f"DuckDuckGo: {type(exc).__name__}")

    if extract_pages and results:
        async def enrich(item):
            try:
                item["page_text"] = await asyncio.to_thread(lambda: _extract(_get(item["url"])))
            except Exception:
                pass
            return item
        results = await asyncio.gather(*(enrich(item) for item in results))

    response = {"query": query, "results": results, "source": source}
    if not results:
        response["error"] = "; ".join(errors) if errors else "No search results returned"
    return response
