"""FastMCP adapter for Enosx. Run with MCP_TRANSPORT=stdio or sse."""
from __future__ import annotations
import os
from orchestrator import EnosxNemotronBrain
from tools.code_sandbox import python_code_sandbox
from tools.vector_memory import memory_store_and_recall
from tools.web_search import live_web_search

try:
    from fastmcp import FastMCP
except ImportError as exc:
    raise RuntimeError("Install requirements.txt before starting the MCP server") from exc

mcp = FastMCP("Enosx AI")
brain = EnosxNemotronBrain()

@mcp.tool()
async def enosx_master_orchestrator(task: str, mock: bool = False) -> dict: return await brain.dispatch(task, mock=mock)
@mcp.tool()
async def live_web_search_tool(query: str, extract_pages: bool = False) -> dict: return await live_web_search(query, extract_pages)
@mcp.tool()
async def memory_store_and_recall_tool(operation: str, text: str = "", top_k: int = 5) -> dict: return await memory_store_and_recall(operation, text, top_k)
@mcp.tool()
async def python_code_sandbox_tool(code: str, timeout_seconds: int = 10) -> dict: return await python_code_sandbox(code, timeout_seconds)

for _name, _fn in brain.department_tools.items():
    async def _router(task: str, mock: bool = False, _fn=_fn): return await _fn(task, mock=mock)
    _router.__name__ = _name
    mcp.tool()(_router)

if __name__ == "__main__":
    mcp.run(transport=os.getenv("MCP_TRANSPORT", "stdio"), host=os.getenv("MCP_HOST", "0.0.0.0"), port=int(os.getenv("MCP_PORT", "8765")))
