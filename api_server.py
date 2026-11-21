"""FastAPI adapter for webhooks and OpenAI-compatible clients."""
from __future__ import annotations
import asyncio, json
import os
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Request, HTTPException
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from orchestrator import EnosxNemotronBrain
from tools.vector_memory import memory_store_and_recall

app = FastAPI(title="Enosx AI Orchestrator", version="1.0.0")
root = Path(__file__).resolve().parent
app.mount("/output", StaticFiles(directory=root / "output"), name="output")

def _require_bridge_auth(request: Request) -> None:
    expected = os.getenv("ENOSX_ORCHESTRATOR_SECRET", "").strip()
    if expected and request.headers.get("authorization", "") != f"Bearer {expected}":
        raise HTTPException(status_code=401, detail="Invalid orchestrator credentials")

class ChatRequest(BaseModel):
    messages: list[dict]
    model: str | None = None
    stream: bool = False
    mock: bool = False
class DispatchRequest(BaseModel):
    task: str
    mock: bool = False

@app.get("/healthz")
async def healthz(): return {"ok": True, "service": "enosx-orchestrator"}
@app.post("/v1/chat/completions")
async def chat(request: Request, payload: ChatRequest):
    _require_bridge_auth(request)
    task = next((m.get("content", "") for m in reversed(payload.messages) if m.get("role") == "user"), "")
    result = await EnosxNemotronBrain(mock=payload.mock).dispatch(task, mock=payload.mock)
    body = {"id":"enosx-chat", "object":"chat.completion", "model":payload.model or result["model"], "choices":[{"index":0,"message":{"role":"assistant","content":result["answer"]},"finish_reason":"stop"}], "enosx":result}
    if not payload.stream: return body
    async def events():
        chunk = {"id": body["id"], "object": "chat.completion.chunk", "model": body["model"], "choices": [{"index": 0, "delta": {"role": "assistant", "content": result["answer"]}, "finish_reason": None}]}
        finish = {"id": body["id"], "object": "chat.completion.chunk", "model": body["model"], "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}]}
        yield f"data: {json.dumps(chunk)}\n\n"
        yield f"data: {json.dumps(finish)}\n\n"
        yield "data: [DONE]\n\n"
    return StreamingResponse(events(), media_type="text/event-stream")
@app.post("/v1/memory/ingest")
async def ingest(request: Request, file: UploadFile = File(...)):
    _require_bridge_auth(request)
    text = (await file.read()).decode("utf-8", "ignore")
    return await memory_store_and_recall("store", text, metadata={"filename": file.filename})
@app.post("/v1/enosx/dispatch")
async def dispatch(request: Request, payload: DispatchRequest):
    _require_bridge_auth(request)
    async def events():
        yield f"data: {json.dumps({'event':'started','task':payload.task})}\n\n"
        result = await EnosxNemotronBrain(mock=payload.mock).dispatch(payload.task, mock=payload.mock)
        yield f"data: {json.dumps({'event':'completed','result':result}, default=str)}\n\n"
        yield "data: [DONE]\n\n"
    return StreamingResponse(events(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api_server:app", host="0.0.0.0", port=8080, reload=False)
