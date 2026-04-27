import json
import os
import shutil
import subprocess
import tempfile
import uuid
from pathlib import Path

from django.core.files.base import File
from django.http import FileResponse, HttpResponseBadRequest, JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_http_methods

from .models import Asset, Presentation, PresentationRevision


def _auth_required(request):
    if request.user.is_authenticated:
        return None
    return JsonResponse({"error": "Authentication required"}, status=401)


def _owned_presentation(request, presentation_id):
    try:
        presentation = Presentation.objects.get(id=presentation_id, owner=request.user)
    except Presentation.DoesNotExist:
        return None
    return presentation


def _request_json(request):
    try:
        return json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError as exc:
        raise ValueError(str(exc)) from exc


def _normalize_video_file(uploaded_file):
    suffix = Path(uploaded_file.name or "upload.mp4").suffix or ".mp4"
    src_fd, src_path = tempfile.mkstemp(suffix=suffix)
    os.close(src_fd)
    out_fd, out_path = tempfile.mkstemp(suffix=".mp4")
    os.close(out_fd)

    try:
        with open(src_path, "wb") as fh:
            for chunk in uploaded_file.chunks():
                fh.write(chunk)

        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            src_path,
            "-movflags",
            "+faststart",
            "-pix_fmt",
            "yuv420p",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "23",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            out_path,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0 or not Path(out_path).exists() or Path(out_path).stat().st_size == 0:
            raise RuntimeError(result.stderr.strip() or "ffmpeg failed")
        return out_path, {
            "transcoded": True,
            "originalName": uploaded_file.name,
            "originalContentType": uploaded_file.content_type or "",
        }
    except Exception as exc:
        shutil.copyfile(src_path, out_path)
        return out_path, {
            "transcoded": False,
            "transcodeError": str(exc),
            "originalName": uploaded_file.name,
            "originalContentType": uploaded_file.content_type or "",
        }
    finally:
        try:
            os.remove(src_path)
        except FileNotFoundError:
            pass


def _save_asset_file(uploaded_file, *, asset_type="other", owner=None, presentation=None):
    metadata = {
        "originalName": uploaded_file.name,
        "contentType": uploaded_file.content_type or "",
        "size": uploaded_file.size,
    }

    saved_path = None
    ext = (Path(uploaded_file.name or "").suffix or "").lower()
    content_type = uploaded_file.content_type or ""

    if asset_type == "video":
        saved_path, extra_metadata = _normalize_video_file(uploaded_file)
        metadata.update(extra_metadata)
        ext = ".mp4"
        content_type = "video/mp4"

    basename = f"{uuid.uuid4().hex}{ext or ''}"
    asset = Asset(owner=owner, presentation=presentation, asset_type=asset_type, metadata_json=metadata)
    try:
        if saved_path:
            with open(saved_path, "rb") as fh:
                asset.file.save(basename, File(fh), save=False)
        else:
            asset.file.save(basename, uploaded_file, save=False)
        asset.save()
        return asset, content_type
    finally:
        if saved_path:
            try:
                os.remove(saved_path)
            except FileNotFoundError:
                pass


@require_GET
@ensure_csrf_cookie
def spa_index(request):
    return FileResponse(open(Path(__file__).resolve().parent.parent / "index.html", "rb"))


@require_http_methods(["POST"])
def asset_upload(request):
    uploaded_file = request.FILES.get("file")
    if uploaded_file is None:
        return HttpResponseBadRequest("Missing file upload")

    owner = request.user if request.user.is_authenticated else None
    presentation = None
    presentation_id = request.POST.get("presentationId")
    if presentation_id and request.user.is_authenticated:
        presentation = _owned_presentation(request, presentation_id)

    content_type = uploaded_file.content_type or ""
    if content_type.startswith("image/"):
        asset_type = "image"
    elif content_type.startswith("video/"):
        asset_type = "video"
    elif content_type == "application/pdf":
        asset_type = "pdf"
    else:
        asset_type = "other"

    asset, normalized_content_type = _save_asset_file(
        uploaded_file,
        asset_type=asset_type,
        owner=owner,
        presentation=presentation,
    )
    return JsonResponse(
        {
            "id": str(asset.id),
            "assetType": asset.asset_type,
            "url": asset.file.url,
            "contentType": normalized_content_type,
            "metadata": asset.metadata_json,
        },
        status=201,
    )


@require_http_methods(["GET", "POST"])
def presentation_create(request):
    auth_error = _auth_required(request)
    if auth_error:
        return auth_error

    if request.method == "GET":
        presentations = (
            Presentation.objects.filter(owner=request.user)
            .order_by("-updated_at")
            .values("id", "title", "presentation_theme", "autosave_version", "updated_at", "created_at")
        )
        return JsonResponse(
            {
                "presentations": [
                    {
                        "id": str(item["id"]),
                        "title": item["title"],
                        "presentationTheme": item["presentation_theme"],
                        "autosaveVersion": item["autosave_version"],
                        "updatedAt": item["updated_at"].isoformat(),
                        "createdAt": item["created_at"].isoformat(),
                    }
                    for item in presentations
                ]
            }
        )

    payload = _request_json(request)
    presentation = Presentation.objects.create(
        owner=request.user,
        title=payload.get("title") or "Untitled Presentation",
        presentation_theme=payload.get("presentationTheme") or "editorial",
        state_json=payload.get("state") or {
            "presentationTheme": payload.get("presentationTheme") or "editorial",
            "slides": payload.get("slides") or [],
            "selectedIds": [],
            "clipboard": None,
        },
    )
    return JsonResponse(
        {
            "id": str(presentation.id),
            "title": presentation.title,
            "presentationTheme": presentation.presentation_theme,
            "state": presentation.state_json,
            "autosaveVersion": presentation.autosave_version,
        },
        status=201,
    )


@require_http_methods(["GET", "PATCH", "PUT"])
def presentation_detail(request, presentation_id):
    auth_error = _auth_required(request)
    if auth_error:
        return auth_error

    presentation = _owned_presentation(request, presentation_id)
    if presentation is None:
        return JsonResponse({"error": "Presentation not found"}, status=404)

    if request.method == "GET":
        return JsonResponse(
            {
                "id": str(presentation.id),
                "title": presentation.title,
                "presentationTheme": presentation.presentation_theme,
                "state": presentation.state_json,
                "bridgeResult": presentation.bridge_result_json,
                "autosaveVersion": presentation.autosave_version,
                "updatedAt": presentation.updated_at.isoformat(),
            }
        )

    try:
        payload = _request_json(request)
    except ValueError as exc:
        return HttpResponseBadRequest(str(exc))

    next_state = payload.get("state")
    if next_state is not None:
        presentation.state_json = next_state
    if "title" in payload:
        presentation.title = payload.get("title") or presentation.title
    if "presentationTheme" in payload:
        presentation.presentation_theme = payload.get("presentationTheme") or presentation.presentation_theme
    if "bridgeResult" in payload:
        presentation.bridge_result_json = payload.get("bridgeResult") or {}
    presentation.autosave_version += 1
    presentation.save()

    if payload.get("saveRevision"):
        PresentationRevision.objects.create(
            presentation=presentation,
            version=presentation.autosave_version,
            state_json=presentation.state_json,
        )

    return JsonResponse(
        {
            "id": str(presentation.id),
            "autosaveVersion": presentation.autosave_version,
            "updatedAt": presentation.updated_at.isoformat(),
        }
    )
