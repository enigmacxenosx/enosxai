# =============================================================================
# ENOSX AI — WebAssembly Python External Library Test
# ----------------------------------------------------------------------------
# Paste this into the Script Console (or ask ENOSX AI: "run the pyodide lib
# test") to verify that Python running in WebAssembly supports external
# libraries via micropip (the pure-Python/wasm pip port that works in Pyodide).
#
# What each stage verifies:
#   Stage 1 — stdlib: built-in Python works without network access.
#   Stage 2 — core WASM math: numpy (compiled to WebAssembly) loads and runs.
#   Stage 3 — micropip install: external pure-Python packages download and
#             import correctly from the CDN at runtime.
#   Stage 4 — data crunching: numpy + a pip package chain produces real
#             computed output (proves execution, not just imports).
#
# Notes:
#   * The "full" Pyodide distribution does NOT auto-install packages; they
#     must be loaded explicitly. We install numpy and pyyaml via micropip.
#   * Pyodide executes code inside its own event loop, so we use top-level
#     await (valid Python 3.8+; Pyodide's runPythonAsync handles it).
#   * Only network access is needed; packages are fetched from cdn.jsdelivr.net.
# =============================================================================

import sys
import asyncio

def banner(title: str) -> None:
    print("=" * 56)
    print(f"  {title}")
    print("=" * 56)

# Note: numpy/micropip are auto-loaded by the Enosx Script Console runtime
# (it scans imports and calls Pyodide's loadPackage in JavaScript before
# execution). No bootstrap is needed in the script itself.

banner("STAGE 1 — Standard library (no network)")
import math
import random
import datetime
print(f"Python version: {sys.version.split()[0]} (CPython compiled to WebAssembly)")
print(f"sqrt(2)  = {math.sqrt(2):.10f}")
print(f"today    = {datetime.date.today().isoformat()}")
print(f"randoms  = {[round(random.random(), 3) for _ in range(5)]}")

async def stage2() -> None:
    banner("STAGE 2 — numpy (WebAssembly-compiled, loaded via Pyodide)")
    import numpy as np
    print(f"numpy version: {np.__version__}")
    a = np.arange(12).reshape(3, 4).astype(float)
    b = np.eye(4)
    print(f"matrix A:\n{a}")
    print(f"A @ I  =\n{np.round(a @ b)}")
    print(f"mean={a.mean():.2f}  std={a.std():.2f}  det(A.T@A)={np.linalg.det(a.T @ a):.2f}")

async def stage3() -> None:
    banner("STAGE 3 — micropip install of an external pure-Python package")
    import micropip
    await micropip.install("pyyaml")  # fetched from CDN at runtime
    import yaml
    doc = yaml.safe_load('enosx: {runtime: pyodide, libs: [pyyaml]}')
    print(f"yaml parsed: {doc}")

async def stage4() -> None:
    banner("STAGE 4 — combined compute: numpy + pyyaml data processing")
    import numpy as np
    import yaml
    series = np.random.default_rng(42).normal(loc=10.0, scale=2.0, size=1000)
    result = {
        "n_samples": int(series.size),
        "mean": float(f"{series.mean():.4f}"),
        "std": float(f"{series.std():.4f}"),
        "percentiles": [float(f"{q:.4f}") for q in np.percentile(series, [25, 50, 75])],
        "within_2_sigma": float(f"{(abs(series - series.mean()) < 2 * series.std()).mean():.4f}"),
    }
    print(yaml.dump(result, default_flow_style=False))
    print("STAGE 4 OK — external library + WASM compute chain works end-to-end")

async def main() -> None:
    try:
        await stage2()
        await stage3()
        await stage4()
        print()
        print("ALL STAGES PASSED — Enosx WebAssembly Python with external")
        print("libraries (numpy via micropip/wasm, pyyaml via micropip/CDN)")
        print("is fully operational.")
    except Exception as exc:  # noqa: BLE001
        print(f"FAILED: {type(exc).__name__}: {exc}")
        print("Note: micropip needs network access to cdn.jsdelivr.net.")

await main()  # top-level await — handled by Pyodide's runPythonAsync
