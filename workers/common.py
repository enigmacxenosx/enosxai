from __future__ import annotations
import asyncio, base64, json, os, time
from pathlib import Path
from urllib.request import Request, urlopen
from config import ALL_WORKERS, KEYS, RETRY_ATTEMPTS, REQUEST_TIMEOUT_SECONDS, endpoint_chain, OUTPUT_DIR

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
        return {"worker": self.name, "model": self.spec.model, "ok": False, "error": "Image generation requires a configured NVIDIA image endpoint; use --mock to verify routing."}

class DepartmentRouter:
    def __init__(self, department: str):
        self.department = department
        self.workers = [Worker(name) for name, spec in ALL_WORKERS.items() if name in __import__('config').DEPARTMENTS[department]]
    async def dispatch(self, task: str, context: dict | None = None, mock: bool = False) -> dict:
        results = await asyncio.gather(*(w.run(task, context, mock) for w in self.workers), return_exceptions=True)
        normalized = [{"ok": False, "error": str(x)} if isinstance(x, Exception) else x for x in results]
        return {"department": self.department, "results": normalized, "worker_count": len(normalized)}
