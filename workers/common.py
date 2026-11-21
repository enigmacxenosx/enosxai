from __future__ import annotations

import asyncio
import base64
import html
import json
import os
import time
import uuid
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from config import (
    ALL_WORKERS,
    KEYS,
    NVIDIA_IMAGE_BASE_URL,
    NVIDIA_STANDARD_BASE_URL,
    OUTPUT_DIR,
    REQUEST_TIMEOUT_SECONDS,
    RETRY_ATTEMPTS,
    endpoint_chain,
)


async def _http_json(url: str, payload: dict, headers: dict) -> dict:
    def call():
        req = Request(
            url,
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json", **headers},
            method="POST",
        )
        with urlopen(req, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            return json.loads(response.read())

    return await asyncio.to_thread(call)


class Worker:
    def __init__(self, name: str):
        self.name = name
        self.spec = ALL_WORKERS[name]

    async def run(self, task: str, context: dict | None = None, mock: bool = False) -> dict:
        started = time.perf_counter()
        if mock:
            await asyncio.sleep(0.01)
            return {
                "worker": self.name,
                "model": self.spec.model,
                "modality": self.spec.modality,
                "ok": True,
                "mock": True,
                "output": f"[{self.name} mock result] Processed: {task[:240]}",
                "latency_ms": round((time.perf_counter() - started) * 1000, 2),
            }
        if self.spec.modality == "image":
            return await self._image(task)
        if self.spec.modality == "embedding":
            return await self._embedding(task)
        return await self._chat(task)

    async def _chat(self, task: str) -> dict:
        payload = {
            "model": self.spec.model,
            "messages": [{"role": "user", "content": task}],
            "temperature": 0.2,
        }
        errors = []
        for endpoint in endpoint_chain():
            for attempt in range(RETRY_ATTEMPTS):
                try:
                    data = await _http_json(
                        endpoint + "/chat/completions",
                        payload,
                        {"Authorization": f"Bearer {KEYS.next()}"},
                    )
                    content = data.get("choices", [{}])[0].get("message", {}).get("content", data)
                    return {
                        "worker": self.name,
                        "model": self.spec.model,
                        "modality": self.spec.modality,
                        "ok": True,
                        "output": content,
                        "endpoint": endpoint,
                    }
                except Exception as exc:
                    errors.append(f"{endpoint}: {exc}")
                    if attempt < RETRY_ATTEMPTS - 1:
                        await asyncio.sleep(2**attempt)
        return {
            "worker": self.name,
            "model": self.spec.model,
            "modality": self.spec.modality,
            "ok": False,
            "error": "; ".join(errors[-3:]),
        }

    async def _embedding(self, task: str) -> dict:
        payload = {"model": self.spec.model, "input": task}
        errors = []
        for endpoint in endpoint_chain():
            for attempt in range(RETRY_ATTEMPTS):
                try:
                    data = await _http_json(
                        endpoint + "/embeddings",
                        payload,
                        {"Authorization": f"Bearer {KEYS.next()}"},
                    )
                    item = (data.get("data") or [{}])[0]
                    return {
                        "worker": self.name,
                        "model": self.spec.model,
                        "modality": self.spec.modality,
                        "ok": True,
                        "embedding": item.get("embedding"),
                        "endpoint": endpoint,
                    }
                except Exception as exc:
                    errors.append(f"{endpoint}: {exc}")
                    if attempt < RETRY_ATTEMPTS - 1:
                        await asyncio.sleep(2**attempt)
        return {
            "worker": self.name,
            "model": self.spec.model,
            "modality": self.spec.modality,
            "ok": False,
            "error": "; ".join(errors[-3:]),
        }

    async def _image(self, task: str) -> dict:
        endpoint = os.getenv("NVIDIA_IMAGE_ENDPOINT", "").strip() or (
            f"{NVIDIA_IMAGE_BASE_URL}/{self.spec.model}"
        )
        is_schnell = self.spec.model.endswith("flux.1-schnell")
        payload = {
            "prompt": task,
            "height": 1024,
            "width": 1024,
            "mode": "base",
            "samples": 1,
            "steps": 4 if is_schnell else 50,
        }
        if not is_schnell:
            payload["cfg_scale"] = 3.5
        try:
            data = await _http_json(endpoint, payload, {"Authorization": f"Bearer {KEYS.next()}"})
            item = (data.get("artifacts") or data.get("data") or [{}])[0]
            encoded = item.get("base64") or item.get("b64_json")
            if not encoded and isinstance(item.get("url"), str):
                return {
                    "worker": self.name,
                    "model": self.spec.model,
                    "modality": self.spec.modality,
                    "ok": False,
                    "error": "Image endpoint returned a URL instead of base64 image data",
                }
            if not encoded:
                return {
                    "worker": self.name,
                    "model": self.spec.model,
                    "modality": self.spec.modality,
                    "ok": False,
                    "error": "Image endpoint returned no base64 image",
                }
            path = OUTPUT_DIR / "images" / f"{self.name}-{uuid.uuid4().hex[:10]}.png"
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(base64.b64decode(encoded))
            result = {
                "worker": self.name,
                "model": self.spec.model,
                "modality": self.spec.modality,
                "ok": True,
                "image_url": f"/output/images/{path.name}",
            }
            if os.getenv("RETURN_BASE64_MEDIA", "false").lower() == "true":
                result["data_uri"] = "data:image/png;base64," + encoded
            return result
        except Exception as exc:
            if isinstance(exc, HTTPError) and exc.code in {403, 404} and not os.getenv("OPENROUTER_API_KEY", "").strip():
                return await self._image_fallback(task, exc)
            return {
                "worker": self.name,
                "model": self.spec.model,
                "modality": self.spec.modality,
                "ok": False,
                "error": str(exc),
            }

    async def _image_fallback(self, task: str, cause: Exception) -> dict:
        """Return a usable SVG when the unavailable image tier rejects Flux."""
        svg = ""
        prompt = (
            "Create a standalone SVG illustration for this request. Return SVG markup only, "
            "with a 1200x800 viewBox, readable typography, strong composition, and no external assets.\n\n"
            f"Request: {task}"
        )
        try:
            data = await _http_json(
                NVIDIA_STANDARD_BASE_URL + "/chat/completions",
                {
                    "model": "nvidia/nemotron-3.5-super-vl-120b-a12b",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.2,
                    "max_tokens": 4096,
                },
                {"Authorization": f"Bearer {KEYS.next()}"},
            )
            svg = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            if "<svg" in svg:
                svg = svg[svg.find("<svg"):]
                if "</svg>" in svg:
                    svg = svg[:svg.rfind("</svg>") + len("</svg>")]
        except Exception:
            svg = ""
        if not svg:
            safe_task = html.escape(task[:500])
            svg = (
                '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">'
                '<defs><linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">'
                '<stop stop-color="#171b3d"/><stop offset="1" stop-color="#6d2047"/></linearGradient></defs>'
                '<rect width="1200" height="800" fill="url(#bg)"/><circle cx="930" cy="210" r="150" fill="#ff6b8a" opacity=".35"/>'
                '<circle cx="260" cy="620" r="220" fill="#6be7ff" opacity=".2"/>'
                '<text x="80" y="150" fill="white" font-family="sans-serif" font-size="48" font-weight="700">ENOSX Visual Fallback</text>'
                f'<foreignObject x="80" y="240" width="1040" height="360"><div xmlns="http://www.w3.org/1999/xhtml" style="color:white;font:30px sans-serif;line-height:1.35">{safe_task}</div></foreignObject>'
                '</svg>'
            )
        path = OUTPUT_DIR / "images" / f"{self.name}-{uuid.uuid4().hex[:10]}.svg"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(svg, encoding="utf-8")
        result = {
            "worker": self.name,
            "model": "nvidia/nemotron-3.5-super-vl-120b-a12b",
            "modality": "image",
            "ok": True,
            "fallback": True,
            "output": "Generated an SVG visual fallback because the configured NVIDIA image tier returned HTTP 403/404.",
            "image_url": f"/output/images/{path.name}",
            "source_error": str(cause),
        }
        if os.getenv("RETURN_BASE64_MEDIA", "false").lower() == "true":
            result["data_uri"] = "data:image/svg+xml;base64," + base64.b64encode(svg.encode()).decode()
        return result


class DepartmentRouter:
    def __init__(self, department: str):
        self.department = department
        self.workers = [
            Worker(name)
            for name in ALL_WORKERS
            if name in __import__("config").DEPARTMENTS[department]
        ]

    async def dispatch(self, task: str, context: dict | None = None, mock: bool = False) -> dict:
        results = await asyncio.gather(
            *(worker.run(task, context, mock) for worker in self.workers),
            return_exceptions=True,
        )
        normalized = [
            {"ok": False, "error": str(result)} if isinstance(result, Exception) else result
            for result in results
        ]
        return {
            "department": self.department,
            "results": normalized,
            "worker_count": len(normalized),
        }
