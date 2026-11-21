"""Small, timeout-limited Python sandbox for calculations, CSV work, and charts."""
from __future__ import annotations
import asyncio, base64, json, os, shutil, subprocess, sys, tempfile
from pathlib import Path
from config import OUTPUT_DIR

_ALLOWED = """import math, statistics, json, csv, re\nfrom pathlib import Path\n"""

def _run(code: str, timeout: int) -> dict:
    OUTPUT_DIR.joinpath("charts").mkdir(parents=True, exist_ok=True)
    wrapped = _ALLOWED + "\n" + code
    with tempfile.TemporaryDirectory(prefix="enosx-sandbox-") as td:
        script = Path(td) / "snippet.py"; script.write_text(wrapped)
        env = {"PATH": os.getenv("PATH", ""), "MPLBACKEND": "Agg", "PYTHONPATH": ""}
        try:
            p = subprocess.run([sys.executable, "-I", str(script)], capture_output=True, text=True, timeout=timeout, cwd=td, env=env)
            charts = []
            for source in Path(td).glob("*.png"):
                target = OUTPUT_DIR / "charts" / source.name
                shutil.copyfile(source, target)
                item = {"url": f"/output/charts/{target.name}"}
                if os.getenv("RETURN_BASE64_MEDIA", "false").lower() == "true":
                    item["data_uri"] = "data:image/png;base64," + base64.b64encode(target.read_bytes()).decode()
                charts.append(item)
            return {"ok": p.returncode == 0, "stdout": p.stdout[-10000:], "stderr": p.stderr[-5000:], "returncode": p.returncode, "charts": charts}
        except subprocess.TimeoutExpired: return {"ok": False, "error": f"sandbox timed out after {timeout}s"}

async def python_code_sandbox(code: str, timeout_seconds: int = 10) -> dict:
    if not code.strip(): return {"ok": False, "error": "code is required"}
    return await asyncio.to_thread(_run, code, min(max(timeout_seconds, 1), 30))
