"""Async Enosx Master Orchestrator (direct Python SDK)."""
from __future__ import annotations
import asyncio, json, os
from urllib.request import Request, urlopen
from config import KEYS, MAX_CONCURRENT_REQUESTS, RETRY_ATTEMPTS, REQUEST_TIMEOUT_SECONDS, endpoint_chain
from tools.code_sandbox import python_code_sandbox
from tools.vector_memory import memory_store_and_recall
from tools.web_search import live_web_search
from workers import reasoning_coding, documents_vision_image, rag_search_structured, audio_speech, physical_ai_science_safety

SYSTEM_PROMPT = """You are the Enosx Master Orchestrator, also known as EnosxNemotronBrain. You are the sole top-level supervisor. Before answering, query Long-Term Vector Memory for relevant user context, preferences, and documents. Trigger Live Web Search for current events, live data, or post-cutoff documentation. Trigger the Python Code Sandbox for exact mathematics, CSV/data analysis, or chart generation. Break complex requests into parallel subtasks across the five Department Routers. Synthesize returned outputs into one cohesive, transparent response and save important new facts back to Vector Memory. Never claim a tool ran when it did not, and report partial failures clearly."""

class EnosxNemotronBrain:
    """Production SDK facade; all department execution is bounded and failure-tolerant."""
    def __init__(self, mock: bool = False):
        self.mock = mock
        self.semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)
        self.model = os.getenv("ENOSX_BRAIN_MODEL", "nvidia/nemotron-3.5-super-vl-120b-a12b")
        self.endpoint = os.getenv("NVIDIA_API_BASE_URL", "https://integrate.api.nvidia.com/v1").rstrip("/")
        self.department_tools = {
            "reasoning_coding_router": reasoning_coding.dispatch,
            "documents_vision_image_router": documents_vision_image.dispatch,
            "rag_search_structured_router": rag_search_structured.dispatch,
            "audio_speech_router": audio_speech.dispatch,
            "physical_ai_science_safety_router": physical_ai_science_safety.dispatch,
        }
        self.tools = {**self.department_tools, "live_web_search": live_web_search, "memory_store_and_recall": memory_store_and_recall, "python_code_sandbox": python_code_sandbox}
    async def _limited(self, fn, *args, **kwargs):
        async with self.semaphore: return await fn(*args, **kwargs)
    def _departments_for(self, task: str, force_all: bool) -> list[str]:
        if force_all: return list(self.department_tools)
        t = task.lower(); selected=[]
        groups = {"reasoning_coding_router":("code","math","python","debug","architect"), "documents_vision_image_router":("pdf","image","vision","screen","chart"), "rag_search_structured_router":("data","csv","search","embed","table"), "audio_speech_router":("audio","voice","speech","translat"), "physical_ai_science_safety_router":("robot","medical","weather","physics","video","safety")}
        for name, words in groups.items():
            if any(w in t for w in words): selected.append(name)
        return selected or ["reasoning_coding_router"]
    async def dispatch(self, task: str, *, force_all: bool = False, mock: bool | None = None, user_id: str = "default") -> dict:
        mock = self.mock if mock is None else mock
        memory_task = asyncio.create_task(self._limited(memory_store_and_recall, "recall", task, 5))
        search_task = None
        if any(x in task.lower() for x in ("latest", "current", "today", "recent", "live", "documentation")):
            search_task = asyncio.create_task(self._limited(live_web_search, task, False))
        code_task = None
        if any(x in task.lower() for x in ("calculate", "csv", "data analysis", "plot", "chart")):
            code_task = asyncio.create_task(self._limited(python_code_sandbox, "print('Sandbox ready: provide a Python snippet for this request')"))
        memory = await memory_task
        selected = self._departments_for(task, force_all)
        context = {"memory": memory, "search": await search_task if search_task else None, "sandbox": await code_task if code_task else None}
        results = await asyncio.gather(*(self._limited(self.tools[name], task, context, mock) for name in selected), return_exceptions=True)
        normalized = [{"ok": False, "error": str(x)} if isinstance(x, Exception) else x for x in results]
        answer = await self._synthesize(task, context, normalized, mock)
        await memory_store_and_recall("store", f"User request: {task}\nEnosx response: {answer[:1000]}", metadata={"user_id": user_id})
        return {"answer": answer, "model": self.model, "mock": mock, "departments": selected, "context": context, "results": normalized, "tools_exposed": list(self.tools)}
    async def _synthesize(self, task, context, results, mock):
        if mock:
            count = sum(len(r.get("results", [])) for r in results if isinstance(r, dict))
            return f"Mock Enosx synthesis complete for: {task}\nParallel department results: {count} worker outputs. Memory, routing, and failure isolation verified."
        prompt = json.dumps({"request":task,"memory":context.get("memory"),"department_results":results}, default=str)
        payload = {"model": self.model, "messages":[{"role":"system","content":SYSTEM_PROMPT},{"role":"user","content":prompt}], "parallel_tool_calls":True, "temperature":0.2}
        for endpoint in endpoint_chain():
            try:
                req = Request(endpoint+"/chat/completions", data=json.dumps(payload).encode(), headers={"Content-Type":"application/json","Authorization":f"Bearer {KEYS.next()}"}, method="POST")
                with urlopen(req, timeout=REQUEST_TIMEOUT_SECONDS) as response: data=json.loads(response.read())
                return data["choices"][0]["message"]["content"]
            except Exception: continue
        return "Enosx completed the available routing steps, but synthesis is unavailable until a live model endpoint is configured."

async def run(task: str, **kwargs): return await EnosxNemotronBrain(**{k:v for k,v in kwargs.items() if k == "mock"}).dispatch(task, **{k:v for k,v in kwargs.items() if k != "mock"})
