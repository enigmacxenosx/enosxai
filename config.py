"""Configuration and model registry for the Enosx AI orchestration service."""
from __future__ import annotations

import itertools
import os
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
def _normalized_url(name: str, default: str, aliases: set[str] | None = None) -> str:
    value = os.getenv(name, "").strip().rstrip("/")
    if not value or value in (aliases or set()):
        return default.rstrip("/")
    return value


NVIDIA_STANDARD_BASE_URL = _normalized_url(
    "NVIDIA_STANDARD_BASE_URL",
    "https://integrate.api.nvidia.com/v1",
    {"https://nvidia.com"},
)
NVIDIA_IMAGE_BASE_URL = _normalized_url("NVIDIA_IMAGE_BASE_URL", "https://nvidia.com")
OPENROUTER_BASE_URL = _normalized_url("OPENROUTER_BASE_URL", "https://openrouter.ai")


@dataclass(frozen=True)
class ModelSpec:
    name: str
    model: str
    modality: str = "chat"
    endpoint_kind: str = "nim"


DEPARTMENTS = {
    "reasoning_coding": {
        "deep_math_logic": "nvidia/ising-calibration-1.5-31b",
        "heavy_code_architect": "bigcode/starcoder2-15b",
        "fast_code_patcher": "nvidia/nemotron-3.5-lightning-30b-a3b",
        "edge_local_logic": "poolside/laguna-xs-2.1",
        "ultra_light_triage": "nvidia/nemotron-3.5-bolt-e4b",
        "frontier_escalation": "nvidia/nemotron-3-ultra-550b-a55b",
        "agentic_coder_alt": "minimaxai/minimax-m3.1-flash",
        "fast_reasoning_alt": "z-ai/glm-5.3-flash",
    },
    "documents_vision_image": {
        "visual_doc_embedder": "nvidia/llama-3.2-nemoretriever-1b-vlm-embed-v1",
        "omni_multimodal_reader": "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
        "screen_ui_inspector": "nvidia/nemotron-3.5-super-vl-120b-a12b",
        "chart_diagram_analyst": "google/gemma-4-31b-it",
        "vision_clip_matcher": "nvidia/nvclip",
        "visual_safety_moderator": "nvidia/nemotron-3.5-content-safety",
        "high_quality_image_gen": "black-forest-labs/flux.1-dev",
        "fast_draft_image_gen": "black-forest-labs/flux.1-schnell",
    },
    "rag_search_structured": {
        "high_dim_text_embedder": "nvidia/nemotron-3.5-embed-8b",
        "fast_text_embedder": "nvidia/nemotron-3.5-embed-1b",
        "light_embed_v3": "nvidia/nemotron-3-embed-1b",
        "qa_text_embedder": "nvidia/llama-3.2-nv-embedqa-1b-v1",
        "mistral_qa_embedder": "nvidia/nv-embedqa-mistral-7b-v2",
        "multilingual_embedder": "snowflake/arctic-embed-l",
        "general_data_analyst": "mistralai/mistral-large-4-1t-a52b",
        "long_context_synthesizer": "moonshotai/kimi-k3.1-pro",
    },
    "audio_speech": {
        "neural_machine_translator": "nvidia/riva-translate-4b-instruct-v2",
        "multilingual_assistant": "google/gemma-3-12b-it",
        "compact_edge_responder": "google/gemma-3-4b-it",
        "creative_dialogue_writer": "meta/muse-glimmer-30b",
        "step_reasoning_helper": "stepfun-ai/step-5-preview",
    },
    "physical_ai_science_safety": {
        "video_physics_reasoner": "nvidia/cosmos-reason2-8b",
        "synthetic_video_detector": "nvidia/ai-synthetic-video-detector",
        "prompt_output_guardrail": "nvidia/llama-3.1-nemotron-safety-guard-8b-v3",
        "topic_control_guardrail": "nvidia/llama-3.1-nemoguard-8b-topic-control",
        "pii_privacy_scrubber": "fastino/gliner2-pii",
    },
}

EMBEDDING_WORKERS = {
    "visual_doc_embedder",
    "high_dim_text_embedder",
    "fast_text_embedder",
    "light_embed_v3",
    "qa_text_embedder",
    "mistral_qa_embedder",
    "multilingual_embedder",
}
IMAGE_WORKERS = {"high_quality_image_gen", "fast_draft_image_gen"}

ALL_WORKERS = {
    worker: ModelSpec(
        worker,
        model,
        modality=("embedding" if worker in EMBEDDING_WORKERS else "image" if worker in IMAGE_WORKERS else "chat"),
        endpoint_kind=("embedding" if worker in EMBEDDING_WORKERS else "image_generation" if worker in IMAGE_WORKERS else "nim"),
    )
    for department in DEPARTMENTS.values()
    for worker, model in department.items()
}


class KeyRotator:
    def __init__(self) -> None:
        raw = os.getenv("NVIDIA_API_KEYS", "") or os.getenv("NVIDIA_API_KEY", "")
        self._keys = [key.strip() for key in raw.split(",") if key.strip()]
        self._cycle = itertools.cycle(self._keys or [""])

    def next(self) -> str:
        return next(self._cycle)


KEYS = KeyRotator()


def endpoint_chain() -> list[str]:
    standard = _normalized_url(
        "NVIDIA_API_BASE_URL",
        NVIDIA_STANDARD_BASE_URL,
        {"https://nvidia.com"},
    )
    chain = [standard]
    if os.getenv("OPENROUTER_API_KEY", "").strip():
        chain.append(os.getenv("OPENROUTER_API_BASE_URL", OPENROUTER_BASE_URL).rstrip("/"))
    if os.getenv("ENABLE_LOCAL_FALLBACK", "false").strip().lower() == "true":
        chain.append(os.getenv("LOCAL_API_BASE_URL", "http://localhost:8000/v1").rstrip("/"))
    return list(dict.fromkeys(chain))
