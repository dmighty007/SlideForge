import json

from django.conf import settings
from django.core.files.base import ContentFile
from django.http import HttpResponseBadRequest, JsonResponse
from django.utils.text import get_valid_filename
from django.views.decorators.http import require_GET, require_POST

from .models import ImportJob
from .services import queue_import_job, check_bridge_dependencies


def _auth_required(request):
    if request.user.is_authenticated:
        return None
    return JsonResponse({"error": "Authentication required"}, status=401)


def _looks_like_pdf(uploaded_file=None, raw_body=b""):
    if uploaded_file is not None:
        try:
            head = uploaded_file.read(5)
            uploaded_file.seek(0)
        except Exception:
            return False
        return head == b"%PDF-"
    return bytes(raw_body[:5]) == b"%PDF-"


@require_POST
def ai_import_start(request):
    auth_error = _auth_required(request)
    if auth_error:
        return auth_error

    uploaded_file = request.FILES.get("file")
    filename = request.GET.get("filename") or (uploaded_file.name if uploaded_file else "upload.pdf")
    filename = get_valid_filename(filename or "upload.pdf")
    if not filename.lower().endswith(".pdf"):
        filename = f"{filename}.pdf"

    raw_body = b""
    if uploaded_file is None:
        raw_body = request.body

    if uploaded_file is None and not raw_body:
        return HttpResponseBadRequest("Empty upload")
    if not _looks_like_pdf(uploaded_file, raw_body):
        return HttpResponseBadRequest("Uploaded file is not a valid PDF")

    missing_deps = check_bridge_dependencies()
    if missing_deps:
        return JsonResponse({"error": missing_deps}, status=500)

    job = ImportJob.objects.create(
        owner=request.user,
        status="queued",
        event="queued",
        message="PDF uploaded",
        progress_percent=4,
    )
    if uploaded_file is not None:
        job.source_pdf.save(filename, uploaded_file, save=True)
    else:
        job.source_pdf.save(filename, ContentFile(raw_body), save=True)
    queue_import_job(job)
    return JsonResponse({"job_id": str(job.id), "remote_llm_enabled": settings.PPTMAKER_ALLOW_REMOTE_LLM})


@require_GET
def ai_import_status(request):
    auth_error = _auth_required(request)
    if auth_error:
        return auth_error

    job_id = request.GET.get("job_id")
    if not job_id:
        return HttpResponseBadRequest("Missing job_id")

    try:
        job = ImportJob.objects.get(id=job_id, owner=request.user)
    except ImportJob.DoesNotExist:
        return JsonResponse({"error": "Job not found"}, status=404)

    return JsonResponse(
        {
            "job_id": str(job.id),
            "state": job.status,
            "event": job.event,
            "message": job.message,
            "percent": job.progress_percent,
            "error": job.error,
            "remote_llm_enabled": settings.PPTMAKER_ALLOW_REMOTE_LLM,
            "presentation_id": str(job.presentation_id) if job.presentation_id else None,
            "result": job.output_json if job.status == "completed" else None,
        }
    )
