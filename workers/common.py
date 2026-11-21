from __future__ import annotations
import asyncio, base64, json, os, time, uuid
from pathlib import Path
from urllib.request import Request, urlopen
from config import ALL_WORKERS, KEYS, RETRY_ATTEMPTS, REQUEST_TIMEOUT_SECONDS, endpoint_chain, OUTPUT_DIR, NVIDIA_IMAGE_BASE_URL

async def _http_json(url: str, payload: dict, headers: dict) -> dict:
    def call():
        req = Request(url, data=json.dumps(payload).encode(), headers={"Content-Type":"application/json", **headers}, method="POST")
        with urlopen(req, timeout=REQUEST_TIMEOUT_SECONDS) as r: return json.loads(r.read())
    return await asyncio.to_thread(call)

class Worker:
    def __init__(self, name: str): self.name = name; self.spec = ALL_WORKERS[name]
    async def run(self, task: str, context: dict | None = None, mock: bool = False) -> dict:
        started = time.perf_counter()
        if mock:
            await asyncio.sleep(0.01)
            return {"worker": self.name, "model": self.spec.model, "ok": True, "mock": True, "output": f"[{self.name} mock result] Processed: {task[:240]}", "latency_ms": round((time.perf_counter()-started)*1000, 2)}
        if "image_gen" in self.name or self.name == "photoreal_sd3_generator":
            return await self._image(task)
        payload = {"model": self.spec.model, "messages": [{"role":"user", "content": task}], "temperature": 0.2}
        errors=[]
        for endpoint in endpoint_chain():
            for attempt in range(RETRY_ATTEMPTS):
                try:
                    data = await _http_json(endpoint + "/chat/completions", payload, {"Authorization": f"Bearer {KEYS.next()}"})
                    content = data.get("choices", [{}])[0].get("message", {}).get("content", data)
                    return {"worker": self.name, "model": self.spec.model, "ok": True, "output": content, "endpoint": endpoint}
                except Exception as exc:
                    errors.append(f"{endpoint}: {exc}")
                    if attempt < RETRY_ATTEMPTS - 1: await asyncio.sleep(2 ** attempt)
        return {"worker": self.name, "model": self.spec.model, "ok": False, "error": "; ".join(errors[-3:])}
    async def _image(self, task: str) -> dict:
        endpoint = os.getenv("NVIDIA_IMAGE_ENDPOINT", NVIDIA_IMAGE_BASE_URL + "/v1/images/generations")
        payload = {"model": self.spec.model, "prompt": task, "response_format": "b64_json"}
        try:
            data = await _http_json(endpoint, payload, {"Authorization": f"Bearer {KEYS.next()}"})
            item = (data.get("data") or [{}])[0]
            encoded = item.get("b64_json") or item.get("base64")
            if not encoded: return {"worker": self.name, "model": self.spec.model, "ok": False, "error": "Image endpoint returned no base64 image"}
            path = OUTPUT_DIR / "images" / f"{self.name}-{uuid.uuid4().hex[:10]}.png"
            path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes(base64.b64decode(encoded))
            result = {"worker": self.name, "model": self.spec.model, "ok": True, "image_url": f"/output/images/{path.name}"}
            if os.getenv("RETURN_BASE64_MEDIA", "false").lower() == "true": result["data_uri"] = "data:image/png;base64," + encoded
            return result
        except Exception as exc:
            return {"worker": self.name, "model": self.spec.model, "ok": False, "error": str(exc)}

class DepartmentRouter:
    def __init__(self, department: str):
        self.department = department
        self.workers = [Worker(name) for name, spec in ALL_WORKERS.items() if name in __import__('config').DEPARTMENTS[department]]
    async def dispatch(self, task: str, context: dict | None = None, mock: bool = False) -> dict:
        results = await asyncio.gather(*(w.run(task, context, mock) for w in self.workers), return_exceptions=True)
        normalized = [{"ok": False, "error": str(x)} if isinstance(x, Exception) else x for x in results]
        return {"department": self.department, "results": normalized, "worker_count": len(normalized)}
