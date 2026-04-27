import json
import os
import re
import sys

import requests

# Ensure local imports work when running as a script
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from standalone_pdf2ppt import (
        GeminiProvider,
        GroqProvider,
        OllamaProvider,
        SmartFallbackProvider,
    )
    from utils import _parse_jsonish
    from vision import _available_vision_model
except (ImportError, ModuleNotFoundError):
    try:
        from .standalone_pdf2ppt import (
            GeminiProvider,
            GroqProvider,
            OllamaProvider,
            SmartFallbackProvider,
        )
        from .utils import _parse_jsonish
        from .vision import _available_vision_model
    except Exception:
        # Fallback for some environments
        import utils

        _parse_jsonish = utils._parse_jsonish

_OLLAMA_BASE = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
# _TEXT_MODEL_PRIORITY = ["llama3.1:8b", "qwen2.5:7b", "llama3:latest"]
_TEXT_MODEL_PRIORITY = ["gemma4:latest", "gemma4:31b"]


def _available_ollama_models() -> set[str]:
    """Return installed Ollama model names, including tagless aliases."""
    try:
        resp = requests.get(f"{_OLLAMA_BASE}/api/tags", timeout=5)
        resp.raise_for_status()
        models = set()
        for item in resp.json().get("models", []):
            name = item.get("name", "").strip()
            if not name:
                continue
            models.add(name)
            models.add(name.split(":", 1)[0])
        return models
    except Exception:
        return set()


def _choose_text_model() -> str | None:
    available = _available_ollama_models()
    for model in _TEXT_MODEL_PRIORITY:
        if model in available:
            return model
        base = model.split(":", 1)[0]
        if base in available:
            return model if ":" in model else base
    return None


def _validate_local_models() -> tuple[str, str]:
    """Require both a local vision model and a local text model."""
    text_model = _choose_text_model()
    if not text_model:
        raise RuntimeError(
            "No compatible Ollama text model installed. Install one of: qwen2.5:7b, qwen2.5, llama3.1:8b, llama3."
        )

    vision_model = os.getenv("OLLAMA_VISION_MODEL") or _available_vision_model()
    if not vision_model:
        raise RuntimeError(
            "No compatible Ollama vision model installed. "
            "Install one of: qwen2.5-vl, llama3.2-vision, minicpm-v, llava."
        )

    return text_model, vision_model


def _unload_ollama_models():
    """Tells Ollama to unload all models from GPU memory to free up VRAM for Marker."""
    ollama_base = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
    try:
        resp = requests.get(f"{ollama_base}/api/ps", timeout=5)
        if resp.status_code == 200:
            models = resp.json().get("models", [])
            for m in models:
                name = m.get("name")
                if name:
                    requests.post(
                        f"{ollama_base}/api/generate", json={"model": name, "prompt": "", "keep_alive": 0}, timeout=5
                    )
    except Exception:
        pass


def _generate_structured_json(llm, prompt: str, system_prompt: str, context: str, schema_hint: str = ""):
    raw = llm.generate(prompt, system_prompt, json_mode=True)
    try:
        return _parse_jsonish(raw)
    except Exception as first_exc:
        repair_prompt = (
            "Repair the following malformed JSON-like output into valid JSON.\n"
            "Do not add commentary. Do not wrap in markdown.\n"
            f"Context: {context}\n"
            f"{schema_hint}\n"
            "Malformed payload:\n"
            f"{raw}"
        )
        repaired = llm.generate(repair_prompt, "Return valid JSON only.", json_mode=True)
        try:
            return _parse_jsonish(repaired)
        except Exception as second_exc:
            preview = re.sub(r"\s+", " ", str(raw))[:400]
            raise RuntimeError(
                f"Failed to parse {context} JSON. "
                f"Initial error: {first_exc}. Repair error: {second_exc}. "
                f"Raw preview: {preview}"
            ) from second_exc


def build_provider(allow_remote: bool = False):
    text_model = _choose_text_model()
    providers = []
    if allow_remote:
        if os.getenv("GROQ_API_KEY"):
            providers.append(GroqProvider())
        if os.getenv("GOOGLE_API_KEY"):
            providers.append(GeminiProvider())
    providers.append(OllamaProvider(model=text_model or "llama3:latest"))
    return SmartFallbackProvider(providers)


def build_task_provider(task: str = "general", allow_remote: bool = False):
    providers = []
    if allow_remote:
        if os.getenv("GROQ_API_KEY"):
            providers.append(GroqProvider())
        if os.getenv("GOOGLE_API_KEY"):
            providers.append(GeminiProvider())
    text_model = _choose_text_model()
    providers.append(
        OllamaProvider(
            models=[text_model, "llama3.1:8b", "qwen2.5:7b", "llama3:latest"]
            if text_model
            else ["llama3.1:8b", "qwen2.5:7b", "llama3:latest"]
        )
    )
    return SmartFallbackProvider(providers)
