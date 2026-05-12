import json
import logging
import os
import re
import shutil
import subprocess
import tempfile
import uuid
from pathlib import Path

from django.conf import settings
from django.core.files.base import File
from django.db import transaction
from django.http import FileResponse, HttpResponseBadRequest, JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_http_methods
from PIL import Image, UnidentifiedImageError

from bridge.llm_utils import _generate_structured_json, build_task_provider
from .models import Asset, Presentation, PresentationRevision
from bridge.pptx_exporter import PPTXExporter


logger = logging.getLogger(__name__)

ALLOWED_IMAGE_EXTENSIONS = {".gif", ".jpeg", ".jpg", ".png", ".webp"}
ALLOWED_VIDEO_EXTENSIONS = {".mov", ".mp4", ".m4v", ".webm"}
ALLOWED_PDF_EXTENSIONS = {".pdf"}
ALLOWED_MOLECULE_EXTENSIONS = {".pdb", ".ent", ".gro", ".mol2", ".xyz", ".sdf", ".cif", ".mmcif"}


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


def _json_error(message, *, status=400):
    return JsonResponse({"error": message}, status=status)


def _as_float(value, default=0.0):
    try:
        return float(str(value).replace("px", ""))
    except (TypeError, ValueError):
        return default


def _limited_text(value, limit=1600):
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    return text[:limit]


def _cleanup_element_summary(element):
    styles = element.get("styles") if isinstance(element.get("styles"), dict) else {}
    element_type = str(element.get("type") or "")
    content_limit = 260 if element_type == "text" else 80
    summary = {
        "id": str(element.get("id") or ""),
        "type": element_type,
        "x": _as_float(element.get("x")),
        "y": _as_float(element.get("y")),
        "width": _as_float(element.get("width"), 1.0),
        "height": _as_float(element.get("height"), 1.0),
        "content": _limited_text(element.get("content"), content_limit),
        "styles": {
            key: styles.get(key)
            for key in (
                "color",
                "backgroundColor",
                "borderColor",
                "fontSize",
                "fontFamily",
                "fontWeight",
                "textAlign",
                "padding",
                "borderRadius",
                "zIndex",
            )
            if key in styles
        },
    }
    if element.get("shapeType"):
        summary["shapeType"] = element.get("shapeType")
    if element.get("tableData"):
        table_data = element.get("tableData") if isinstance(element.get("tableData"), dict) else {}
        summary["tableData"] = {
            "rows": table_data.get("rows"),
            "cols": table_data.get("cols"),
            "headerRow": table_data.get("headerRow"),
        }
    return summary


def _deterministic_cleanup_updates(elements, slide_width, slide_height):
    if not elements:
        return []

    grid = 10.0
    snap_threshold = 28.0
    gap = 16.0
    edge_margin = round(max(36.0, min(slide_width, slide_height) * 0.05) / grid) * grid
    center_x = slide_width / 2.0
    center_y = slide_height / 2.0

    def snap(value):
        return round((float(value) if value is not None else 0.0) / grid) * grid

    def clamp(value, lower, upper):
        return max(lower, min(value, upper))

    def bounds(element):
        width = max(8.0, _as_float(element.get("width"), 1.0))
        height = max(8.0, _as_float(element.get("height"), 1.0))
        return {
            "x": _as_float(element.get("x")),
            "y": _as_float(element.get("y")),
            "width": min(width, slide_width),
            "height": min(height, slide_height),
        }

    working = []
    for element in elements[:80]:
        item = {"id": str(element.get("id") or ""), "type": str(element.get("type") or ""), **bounds(element)}
        if item["id"]:
            working.append(item)

    original = {
        item["id"]: (round(item["x"], 2), round(item["y"], 2), round(item["width"], 2), round(item["height"], 2))
        for item in working
    }

    for item in working:
        width = item["width"]
        height = item["height"]
        nx = snap(item["x"])
        ny = snap(item["y"])
        if abs((nx + width / 2.0) - center_x) < snap_threshold:
            nx = snap(center_x - width / 2.0)
        if abs((ny + height / 2.0) - center_y) < snap_threshold:
            ny = snap(center_y - height / 2.0)
        if abs(nx - edge_margin) < snap_threshold:
            nx = edge_margin
        if abs(ny - edge_margin) < snap_threshold:
            ny = edge_margin
        if abs(nx + width - (slide_width - edge_margin)) < snap_threshold:
            nx = snap(slide_width - edge_margin - width)
        if abs(ny + height - (slide_height - edge_margin)) < snap_threshold:
            ny = snap(slide_height - edge_margin - height)
        item["x"] = clamp(nx, 0.0, max(0.0, slide_width - width))
        item["y"] = clamp(ny, 0.0, max(0.0, slide_height - height))

    working.sort(key=lambda item: (item["y"], item["x"]))
    for idx in range(1, len(working)):
        prev = working[idx - 1]
        current = working[idx]
        overlaps_x = current["x"] < prev["x"] + prev["width"] - gap and current["x"] + current["width"] > prev["x"] + gap
        overlaps_y = current["y"] < prev["y"] + prev["height"] + gap
        if overlaps_x and overlaps_y and current["y"] >= prev["y"]:
            current["y"] = clamp(snap(prev["y"] + prev["height"] + gap), 0.0, max(0.0, slide_height - current["height"]))

    updates = []
    for item in working:
        changed = original.get(item["id"]) != (
            round(item["x"], 2),
            round(item["y"], 2),
            round(item["width"], 2),
            round(item["height"], 2),
        )
        if not changed:
            continue
        updates.append({
            "id": item["id"],
            "x": round(item["x"], 2),
            "y": round(item["y"], 2),
            "width": f"{round(item['width'], 2)}px",
            "height": f"{round(item['height'], 2)}px",
        })
    return updates


def _sanitize_cleanup_updates(result, original_by_id, slide_width, slide_height):
    raw_updates = result.get("elements") if isinstance(result, dict) else []
    if not isinstance(raw_updates, list):
        return []

    allowed_styles = {
        "color",
        "backgroundColor",
        "borderColor",
        "borderWidth",
        "fontSize",
        "fontFamily",
        "fontWeight",
        "textAlign",
        "padding",
        "borderRadius",
        "boxShadow",
    }
    updates = []
    for item in raw_updates[:80]:
        if not isinstance(item, dict):
            continue
        element_id = str(item.get("id") or "")
        original = original_by_id.get(element_id)
        if not original:
            continue
        original_width = max(1.0, _as_float(original.get("width"), 1.0))
        original_height = max(1.0, _as_float(original.get("height"), 1.0))
        width = max(8.0, min(_as_float(item.get("width"), original_width), slide_width))
        height = max(8.0, min(_as_float(item.get("height"), original_height), slide_height))
        x = max(0.0, min(_as_float(item.get("x"), _as_float(original.get("x"))), max(0.0, slide_width - width)))
        y = max(0.0, min(_as_float(item.get("y"), _as_float(original.get("y"))), max(0.0, slide_height - height)))
        update = {
            "id": element_id,
            "x": round(x, 2),
            "y": round(y, 2),
            "width": f"{round(width, 2)}px",
            "height": f"{round(height, 2)}px",
        }
        styles = item.get("styles")
        if isinstance(styles, dict):
            safe_styles = {key: value for key, value in styles.items() if key in allowed_styles and isinstance(value, (str, int, float))}
            if safe_styles:
                update["styles"] = safe_styles
        content = item.get("content")
        if isinstance(content, str) and original.get("type") == "text":
            update["content"] = content[:5000]
        updates.append(update)
    return updates


def _local_cleanup_response(elements, slide_width, slide_height, *, reason="", mode="local"):
    updates = _deterministic_cleanup_updates(elements, slide_width, slide_height)
    response = {
        "summary": "Local cleanup applied",
        "elements": updates,
        "fallback": mode,
    }
    if reason and settings.DEBUG:
        response["debug"] = {
            "reason": _limited_text(reason, 500),
            "elementCount": len(elements),
        }
    return response


def _uploaded_file_head(uploaded_file, length):
    try:
        head = uploaded_file.read(length)
        uploaded_file.seek(0)
        return head
    except Exception:
        return b""


def _validate_image_upload(uploaded_file):
    try:
        Image.open(uploaded_file).verify()
        uploaded_file.seek(0)
    except (UnidentifiedImageError, OSError, ValueError):
        return "Uploaded image is not a valid image file"
    return None


def _validate_pdf_upload(uploaded_file):
    if _uploaded_file_head(uploaded_file, 5) != b"%PDF-":
        return "Uploaded PDF is not a valid PDF file"
    return None


def _validate_molecule_upload(uploaded_file):
    head = _uploaded_file_head(uploaded_file, 4096)
    if b"\x00" in head:
        return "Uploaded molecule file must be plain text"
    try:
        head.decode("utf-8")
    except UnicodeDecodeError:
        try:
            head.decode("latin-1")
        except UnicodeDecodeError:
            return "Uploaded molecule file must be readable text"
    return None


def _classify_asset_upload(uploaded_file):
    content_type = uploaded_file.content_type or ""
    ext = (Path(uploaded_file.name or "").suffix or "").lower()

    if content_type.startswith("image/") and ext in ALLOWED_IMAGE_EXTENSIONS:
        return "image", _validate_image_upload(uploaded_file)
    if content_type.startswith("video/") and ext in ALLOWED_VIDEO_EXTENSIONS:
        return "video", None
    if content_type == "application/pdf" and ext in ALLOWED_PDF_EXTENSIONS:
        return "pdf", _validate_pdf_upload(uploaded_file)
    if ext in ALLOWED_MOLECULE_EXTENSIONS:
        return "molecule", _validate_molecule_upload(uploaded_file)
    return "other", "Unsupported asset type"


def _user_asset_storage_bytes(user):
    total = 0
    for metadata in Asset.objects.filter(owner=user).values_list("metadata_json", flat=True):
        if isinstance(metadata, dict):
            try:
                total += int(metadata.get("size") or 0)
            except (TypeError, ValueError):
                continue
    return total


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
    auth_error = _auth_required(request)
    if auth_error:
        return auth_error

    uploaded_file = request.FILES.get("file")
    if uploaded_file is None:
        return _json_error("Missing file upload")

    asset_type, validation_error = _classify_asset_upload(uploaded_file)
    if validation_error:
        return _json_error(validation_error)

    max_upload_bytes = (
        settings.PPTMAKER_MAX_MOLECULE_UPLOAD_BYTES
        if asset_type == "molecule"
        else settings.PPTMAKER_MAX_ASSET_UPLOAD_BYTES
    )
    if uploaded_file.size > max_upload_bytes:
        return _json_error("File is too large", status=413)

    max_user_bytes = settings.PPTMAKER_MAX_USER_ASSET_STORAGE_BYTES
    if _user_asset_storage_bytes(request.user) + uploaded_file.size > max_user_bytes:
        return _json_error("Asset storage quota exceeded", status=413)

    owner = request.user
    presentation = None
    presentation_id = request.POST.get("presentationId")
    if presentation_id:
        presentation = _owned_presentation(request, presentation_id)
        if presentation is None:
            return _json_error("Presentation not found", status=404)

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

    try:
        payload = _request_json(request)
    except ValueError as exc:
        return HttpResponseBadRequest(str(exc))
    presentation = Presentation.objects.create(
        owner=request.user,
        title=payload.get("title") or "Untitled Presentation",
        presentation_theme=payload.get("presentationTheme") or "editorial",
        state_json=payload.get("state") or {
            "presentationTheme": payload.get("presentationTheme") or "editorial",
            "pageSetup": "standard-4-3",
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

    with transaction.atomic():
        presentation = Presentation.objects.select_for_update().get(id=presentation.id, owner=request.user)
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


@require_http_methods(["POST"])
def slide_cleanup_view(request):
    auth_error = _auth_required(request)
    if auth_error:
        return auth_error

    try:
        payload = _request_json(request)
    except ValueError as exc:
        return HttpResponseBadRequest(str(exc))

    slide = payload.get("slide")
    if not isinstance(slide, dict):
        return _json_error("Missing slide")

    elements = [el for el in slide.get("elements", []) if isinstance(el, dict) and el.get("id")]
    if not elements:
        return JsonResponse({"elements": [], "summary": "No elements to clean up"})

    page_setup = payload.get("pageSetup") if isinstance(payload.get("pageSetup"), dict) else {}
    slide_width = max(320.0, _as_float(page_setup.get("width"), 1024.0))
    slide_height = max(240.0, _as_float(page_setup.get("height"), 768.0))
    theme = _limited_text(payload.get("theme") or "editorial", 80)
    selected_only = bool(payload.get("selectedOnly"))
    target_elements = [_cleanup_element_summary(el) for el in elements[:80]]

    if not getattr(settings, "PPTMAKER_ENABLE_AI_CLEANUP", False):
        return JsonResponse(_local_cleanup_response(elements, slide_width, slide_height))

    prompt = (
        "You improve one presentation slide. Return valid JSON only.\n"
        "Goal: make the slide visually cleaner while preserving meaning and all element ids.\n"
        "Improve layout hierarchy, spacing, alignment, size balance, readable typography, and restrained color use.\n"
        "Do not invent new elements. Do not remove elements. Keep images/videos/pdf/html content unchanged.\n"
        "For text, you may lightly improve wording only if it is clearly too verbose or inconsistent.\n"
        "Keep every element inside the slide bounds and avoid overlap unless intentional.\n"
        "Return only elements that need changes; unchanged elements must be omitted.\n"
        "Limit the response to at most 40 changed elements.\n"
        "Return this shape exactly: {\"summary\":\"short note\",\"elements\":[{\"id\":\"existing id\",\"x\":0,\"y\":0,\"width\":100,\"height\":40,\"content\":\"optional text only\",\"styles\":{}}]}.\n"
        f"Slide size: {slide_width} x {slide_height}px.\n"
        f"Theme: {theme}.\n"
        f"Selected-only cleanup: {selected_only}.\n"
        f"Slide notes: {_limited_text(slide.get('notes'), 1000)}\n"
        f"Elements JSON:\n{json.dumps(target_elements, ensure_ascii=False)}"
    )

    try:
        llm = build_task_provider(task="creative", allow_remote=True)
        result = _generate_structured_json(llm, prompt, "Presentation design director. Return JSON only.", "slide cleanup")
    except Exception as exc:
        logger.warning(
            "AI slide cleanup failed; using deterministic fallback: %s",
            _limited_text(str(exc), 300),
            extra={
                "slide_id": slide.get("id"),
                "element_count": len(elements),
                "prompt_element_count": len(target_elements),
            },
        )
        response = _local_cleanup_response(elements, slide_width, slide_height, reason=str(exc), mode="ai_failed_local")
        response["summary"] = "Local cleanup applied after AI returned invalid JSON"
        if settings.DEBUG and isinstance(response.get("debug"), dict):
            response["debug"]["promptElementCount"] = len(target_elements)
        return JsonResponse(response)

    updates = _sanitize_cleanup_updates(result, {str(el.get("id")): el for el in elements}, slide_width, slide_height)
    return JsonResponse(
        {
            "summary": _limited_text(result.get("summary") if isinstance(result, dict) else "", 300) or "AI cleanup applied",
            "elements": updates,
        }
    )


@require_http_methods(["POST"])
def export_pptx_view(request):
    try:
        payload = _request_json(request)
        state = payload.get("state")
        if not state:
            return HttpResponseBadRequest("Missing state in payload")

        exporter = PPTXExporter(state)
        pptx_stream = exporter.export()
        
        filename = payload.get("filename", "presentation.pptx")
        # Sanitize filename
        filename = re.sub(r'[^\w\s.-]', '', filename).strip().replace(' ', '_')
        if not filename.endswith(".pptx"):
            filename += ".pptx"

        response = FileResponse(
            pptx_stream,
            content_type="application/vnd.openxmlformats-officedocument.presentationml.presentation"
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response
    except Exception:
        logger.exception("PPTX export failed")
        return JsonResponse({"error": "PPTX export failed"}, status=500)
