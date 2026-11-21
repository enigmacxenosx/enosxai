"""Configuration and model registry for the Enosx AI orchestration service."""
from __future__ import annotations
import itertools, os
from dataclasses import dataclass
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

ROOT = Path(__file__).resolve().parent
OUTPUT_DIR = ROOT / "output"
DATA_DIR = ROOT / "data"
MAX_CONCURRENT_REQUESTS = int(os.getenv("MAX_CONCURRENT_REQUESTS", "10"))
REQUEST_TIMEOUT_SECONDS = float(os.getenv("REQUEST_TIMEOUT_SECONDS", "90"))
RETRY_ATTEMPTS = int(os.getenv("RETRY_ATTEMPTS", "3"))

@dataclass(frozen=True)
class ModelSpec:
    name: str
    model: str
    modality: str = "chat"
    endpoint_kind: str = "nim"

DEPARTMENTS = {
    "reasoning_coding": {
        "deep_math_logic": "nvidia/openreasoning-nemotron-32b",
        "heavy_code_architect": "nvidia/llama-3_3-nemotron-super-49b",
        "fast_code_patcher": "nvidia/nemotron-3.5-lightning-30b",
        "edge_local_logic": "nvidia/nemotron-3-nano-30b",
        "ultra_light_triage": "nvidia/nemotron-3.5-bolt-e4b",
        "frontier_escalation": "nvidia/nemotron-3-ultra-550b",
    },
    "documents_vision_image": {
        "pdf_table_extractor": "nvidia/nemotron-3.5-parse",
        "visual_doc_embedder": "nvidia/nemotron-colembed-v2",
        "omni_multimodal_reader": "nvidia/nemotron-3-nano-omni",
        "screen_ui_inspector": "nvidia/nemotron-3.5-super-vl-120b-a12b",
        "chart_diagram_analyst": "nvidia/neva-22b",
        "visual_safety_moderator": "nvidia/nemotron-3-content-safety-4b",
        "high_quality_image_gen": "black-forest-labs/flux.1-dev",
        "fast_draft_image_gen": "black-forest-labs/flux.1-schnell",
        "image_inpaint_editor": "black-forest-labs/flux.1-kontext-dev",
        "photoreal_sd3_generator": "stabilityai/stable-diffusion-3-medium",
    },
    "rag_search_structured": {
        "high_dim_text_embedder": "nvidia/nemotron-3.5-embed-8b",
        "fast_text_embedder": "nvidia/nemotron-3.5-embed-1b",
        "multilingual_embedder": "nvidia/llama-embed-nemotron-8b",
        "search_result_reranker": "nvidia/nemotron-3.5-rerank-8b",
        "tabular_csv_predictor": "nvidia/kumo-tabular",
        "route_logistics_solver": "nvidia/cuopt",
    },
    "audio_speech": {
        "high_accuracy_transcriber": "nvidia/parakeet-tdt-0.6b-v2",
        "realtime_stream_asr": "nvidia/nemotron-speech-asr",
        "multilingual_speech_to_text": "nvidia/canary-1b-v2",
        "full_duplex_voice_agent": "nvidia/personaplex-7b",
        "neural_text_to_speech": "nvidia/riva-tts",
        "neural_machine_translator": "nvidia/riva-nmt",
    },
    "physical_ai_science_safety": {
        "video_world_simulator": "nvidia/cosmos-predict-2.5",
        "video_physics_reasoner": "nvidia/cosmos-reason-2",
        "robotics_action_planner": "nvidia/isaac-gr00t-n1.5",
        "medical_imaging_analyst": "nvidia/vista-3d",
        "weather_climate_forecaster": "nvidia/fourcastnet",
        "prompt_output_guardrail": "nvidia/llama-nemoguard",
    },
}
ALL_WORKERS = {worker: ModelSpec(worker, model) for dept in DEPARTMENTS.values() for worker, model in dept.items()}

class KeyRotator:
    def __init__(self) -> None:
        raw = os.getenv("NVIDIA_API_KEYS", "") or os.getenv("NVIDIA_API_KEY", "")
        self._keys = [key.strip() for key in raw.split(",") if key.strip()]
        self._cycle = itertools.cycle(self._keys or [""])
    def next(self) -> str:
        return next(self._cycle)

KEYS = KeyRotator()

def endpoint_chain() -> list[str]:
    chain = [os.getenv("NVIDIA_API_BASE_URL", "https://nvidia.com").rstrip("/")]
    if os.getenv("OPENROUTER_API_KEY", "").strip():
        chain.append(os.getenv("OPENROUTER_API_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/"))
    chain.append(os.getenv("LOCAL_API_BASE_URL", "http://localhost:8000/v1").rstrip("/"))
    return list(dict.fromkeys(chain))
