"""Persistent semantic memory; ChromaDB is optional and JSON storage keeps mock mode dependency-light."""
from __future__ import annotations
import asyncio, hashlib, json, math, os, re
from pathlib import Path
from config import DATA_DIR

class VectorMemory:
    def __init__(self, path: str | Path | None = None):
        self.path = Path(path or os.getenv("MEMORY_PATH", str(DATA_DIR / "enosx_memory")))
        self.path.mkdir(parents=True, exist_ok=True)
        self.file = self.path / "memories.json"
        self.items = json.loads(self.file.read_text()) if self.file.exists() else []
        self._collection = None
        try:
            import chromadb
            self._collection = chromadb.PersistentClient(path=str(self.path)).get_or_create_collection("enosx_memory")
        except Exception: pass
    def _save(self): self.file.write_text(json.dumps(self.items[-500:], indent=2))
    @staticmethod
    def _tokens(text): return set(re.findall(r"[a-z0-9_]+", text.lower()))
    async def store(self, text: str, metadata: dict | None = None) -> dict:
        if not text.strip(): return {"stored": False, "reason": "empty"}
        item = {"id": hashlib.sha256((text + str(metadata)).encode()).hexdigest()[:16], "text": text, "metadata": metadata or {}}
        self.items = [x for x in self.items if x["id"] != item["id"]] + [item]; self._save()
        if self._collection:
            try: self._collection.upsert(ids=[item["id"]], documents=[text], metadatas=[item["metadata"]])
            except Exception: pass
        return {"stored": True, "id": item["id"]}
    async def recall(self, query: str, top_k: int = 5) -> list[dict]:
        if self._collection:
            try:
                result = self._collection.query(query_texts=[query], n_results=top_k)
                return [{"text": t, "metadata": m or {}, "distance": d} for t,m,d in zip(result["documents"][0], result["metadatas"][0], result["distances"][0])]
            except Exception: pass
        q = self._tokens(query)
        scored = []
        for item in self.items:
            words = self._tokens(item["text"]); score = len(q & words) / max(1, math.sqrt(len(q) * len(words)))
            scored.append((score, item))
        return [{**item, "score": score} for score,item in sorted(scored, key=lambda x:x[0], reverse=True)[:top_k] if score > 0 or not q]

_memory = VectorMemory()
async def memory_store_and_recall(operation: str, text: str = "", top_k: int = 5, metadata: dict | None = None) -> dict:
    if operation == "store": return await _memory.store(text, metadata)
    if operation == "recall": return {"memories": await _memory.recall(text, top_k)}
    return {"error": "operation must be store or recall"}
