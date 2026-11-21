"""Offline verification: python test_parallel.py --mock"""
from __future__ import annotations
import argparse, asyncio, time
from config import ALL_WORKERS, DEPARTMENTS
from orchestrator import EnosxNemotronBrain
from tools.code_sandbox import python_code_sandbox
from tools.vector_memory import memory_store_and_recall

async def main(mock: bool):
    if not mock: print("Live mode requires configured provider keys; running a smoke dispatch.")
    brain = EnosxNemotronBrain(mock=mock)
    started = time.perf_counter()
    result = await brain.dispatch("Verify every department: calculate 2+2, inspect a data chart, search current docs, and report capabilities.", force_all=True, mock=mock)
    elapsed = time.perf_counter() - started
    worker_results = [item for dept in result["results"] for item in dept.get("results", []) if isinstance(dept, dict)]
    assert len(ALL_WORKERS) == 34, f"roster has {len(ALL_WORKERS)} workers"
    assert len(worker_results) == 34, f"only {len(worker_results)} worker results returned"
    assert all(item.get("ok") for item in worker_results), "one or more mock workers failed"
    await memory_store_and_recall("store", "Justin prefers production-ready asynchronous orchestration.", metadata={"test": True})
    recalled = await memory_store_and_recall("recall", "production-ready orchestration", 3)
    assert recalled["memories"], "memory recall returned no results"
    sandbox = await python_code_sandbox("print(2 + 2)")
    assert sandbox["ok"] and "4" in sandbox["stdout"]
    print(f"PASS: {len(worker_results)}/34 workers, memory recall, sandbox, and parallel gather verified in {elapsed:.2f}s")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(); parser.add_argument("--mock", action="store_true"); args = parser.parse_args()
    asyncio.run(main(args.mock))
