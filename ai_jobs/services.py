from __future__ import annotations

import json
import shutil
import subprocess
import sys
import concurrent.futures
import threading
import time
import urllib.request
import urllib.error
from pathlib import Path

from django.conf import settings
from django.db import close_old_connections

from studio.models import Presentation

from .models import ImportJob

_IMPORT_EXECUTOR = concurrent.futures.ThreadPoolExecutor(max_workers=4, thread_name_prefix="import_worker")

_OLLAMA_LOCK = threading.Lock()
_OLLAMA_REF_COUNT = 0
_OLLAMA_PROC = None

def _acquire_ollama():
    global _OLLAMA_REF_COUNT, _OLLAMA_PROC
    with _OLLAMA_LOCK:
        _OLLAMA_REF_COUNT += 1
        if _OLLAMA_REF_COUNT == 1:
            try:
                urllib.request.urlopen("http://127.0.0.1:11434/", timeout=1)
            except Exception:
                _OLLAMA_PROC = subprocess.Popen(["ollama", "serve"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                time.sleep(2)

def _release_ollama():
    global _OLLAMA_REF_COUNT, _OLLAMA_PROC
    with _OLLAMA_LOCK:
        _OLLAMA_REF_COUNT -= 1
        if _OLLAMA_REF_COUNT == 0 and _OLLAMA_PROC is not None:
            if _OLLAMA_PROC.poll() is None:
                _OLLAMA_PROC.terminate()
                try:
                    _OLLAMA_PROC.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    _OLLAMA_PROC.kill()
            _OLLAMA_PROC = None


EVENT_PROGRESS = {
    "queued": 2,
    "upload": 6,
    "processing": 14,
    "vision_extract": 28,
    "vision_candidate": 40,
    "vision": 48,
    "vision_start": 55,
    "storyboard": 66,
    "section": 80,
    "export": 95,
    "done": 100,
}


def _bridge_command(pdf_path: Path, output_path: Path) -> list[str]:
    bridge_args = [
        "bridge/pdf_bridge.py",
        "-i",
        str(pdf_path),
        "-o",
        str(output_path),
        "--json-progress",
        "--allow-remote-llm",
    ]
    executable_path = Path(sys.executable).resolve()
    if "envs/django_env" in executable_path.as_posix():
        return [str(executable_path), *bridge_args]

    conda_candidates = []
    configured_conda = str(getattr(settings, "PPTMAKER_CONDA", "") or "").strip()
    if configured_conda:
        conda_candidates.append(Path(configured_conda).expanduser())
    conda_candidates.extend(
        [
            Path.home() / "Soft" / "miniconda3" / "bin" / "conda",
            Path.home() / "miniconda3" / "bin" / "conda",
        ]
    )
    for conda_path in conda_candidates:
        if conda_path.exists():
            return [str(conda_path), "run", "-n", "django_env", "python", *bridge_args]

    return [str(executable_path), *bridge_args]


def _materialize_bridge_visuals(bridge_result: dict, job: ImportJob) -> dict:
    slides = bridge_result.get("slides")
    if not isinstance(slides, list):
        return bridge_result

    media_root = Path(settings.MEDIA_ROOT)
    target_dir = media_root / "imports" / "figures" / str(job.id)
    target_dir.mkdir(parents=True, exist_ok=True)

    copied_urls: dict[str, str] = {}

    def localize_path(raw_path: str) -> str:
        normalized = str(raw_path or "").strip()
        if not normalized:
            return normalized
        if normalized.startswith("/media/"):
            return normalized
        if normalized in copied_urls:
            return copied_urls[normalized]

        source = Path(normalized).resolve()
        if not source.exists() or not source.is_file():
            return normalized

        try:
            source.relative_to(settings.BASE_DIR)
        except ValueError:
            return normalized  # Prevent Path Traversal

        destination = target_dir / source.name
        if destination.exists():
            stem = destination.stem
            suffix = destination.suffix
            counter = 1
            while destination.exists():
                destination = target_dir / f"{stem}_{counter}{suffix}"
                counter += 1
        shutil.copy2(source, destination)
        relative = destination.relative_to(media_root).as_posix()
        url = f"{settings.MEDIA_URL.rstrip('/')}/{relative}"
        copied_urls[normalized] = url
        return url

    for slide in slides:
        if not isinstance(slide, dict):
            continue
        if isinstance(slide.get("fig_path"), str):
            slide["fig_path"] = localize_path(slide["fig_path"])
        visuals = slide.get("visuals")
        if not isinstance(visuals, list):
            continue
        for visual in visuals:
            if not isinstance(visual, dict):
                continue
            if isinstance(visual.get("path"), str):
                visual["path"] = localize_path(visual["path"])
        if not slide.get("fig_path"):
            first_visual = next(
                (item for item in visuals if isinstance(item, dict) and isinstance(item.get("path"), str) and item.get("path")),
                None,
            )
            if first_visual:
                slide["fig_path"] = first_visual["path"]
                if not slide.get("fig_cap") and first_visual.get("caption"):
                    slide["fig_cap"] = first_visual["caption"]

    return bridge_result


def queue_import_job(import_job: ImportJob):
    _IMPORT_EXECUTOR.submit(_run_import_job, import_job.id)


def _run_import_job(job_id):
    _acquire_ollama()
    close_old_connections()
    job = ImportJob.objects.get(id=job_id)
    pdf_path = Path(job.source_pdf.path)
    output_path = pdf_path.with_name("presentation_export.json")

    job.status = "running"
    job.event = "processing"
    job.message = "Starting PDF bridge"
    job.progress_percent = 10
    job.save(update_fields=["status", "event", "message", "progress_percent", "updated_at"])

    cmd = _bridge_command(pdf_path, output_path)
    proc = subprocess.Popen(
        cmd,
        cwd=str(settings.BASE_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )

    try:
        if proc.stdout is not None:
            for raw_line in proc.stdout:
                line = raw_line.strip()
                if not line:
                    continue
                try:
                    payload = json.loads(line)
                except json.JSONDecodeError:
                    job.message = line[:512]
                    job.save(update_fields=["message", "updated_at"])
                    continue

                event = str(payload.get("event", "running"))
                job.event = event
                job.message = str(payload.get("message", ""))[:512]
                raw_percent = payload.get("percent")
                try:
                    parsed_percent = int(round(float(raw_percent)))
                except (TypeError, ValueError):
                    parsed_percent = EVENT_PROGRESS.get(event, job.progress_percent)
                job.progress_percent = max(job.progress_percent, max(0, min(100, parsed_percent)))
                job.save(update_fields=["event", "message", "progress_percent", "updated_at"])

        returncode = proc.wait(timeout=settings.PPTMAKER_BRIDGE_JSON_TIMEOUT)
        if returncode != 0:
            raise RuntimeError(f"Bridge exited with code {returncode}")

        bridge_result = json.loads(output_path.read_text(encoding="utf-8"))
        bridge_result = _materialize_bridge_visuals(bridge_result, job)
        title = bridge_result.get("title") or pdf_path.stem
        presentation = Presentation.objects.create(
            owner=job.owner,
            title=title,
            presentation_theme="editorial",
            state_json={},
            bridge_result_json=bridge_result,
            source_pdf=job.source_pdf,
        )

        job.presentation = presentation
        job.status = "completed"
        job.event = "done"
        job.message = "AI import complete"
        job.progress_percent = 100
        job.output_json = bridge_result
        job.save(update_fields=["presentation", "status", "event", "message", "progress_percent", "output_json", "updated_at"])
    except Exception as exc:
        job.status = "failed"
        job.event = "failed"
        job.message = "AI import failed"
        job.error = str(exc)
        job.progress_percent = 100
        job.save(update_fields=["status", "event", "message", "error", "progress_percent", "updated_at"])
    finally:
        if 'proc' in locals() and proc is not None and proc.poll() is None:
            proc.kill()
            proc.wait()
        _release_ollama()
        close_old_connections()
