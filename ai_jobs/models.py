import uuid

from django.conf import settings
from django.db import models

from studio.models import Presentation


class ImportJob(models.Model):
    STATUS_CHOICES = [
        ("queued", "Queued"),
        ("running", "Running"),
        ("completed", "Completed"),
        ("failed", "Failed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="import_jobs",
    )
    presentation = models.ForeignKey(
        Presentation,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="import_jobs",
    )
    source_pdf = models.FileField(upload_to="imports/pdfs/")
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="queued")
    progress_percent = models.PositiveSmallIntegerField(default=0)
    event = models.CharField(max_length=64, default="queued")
    message = models.CharField(max_length=512, default="Queued")
    output_json = models.JSONField(default=dict, blank=True)
    error = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class ExportJob(models.Model):
    FORMAT_CHOICES = [
        ("pptx", "PPTX"),
        ("pdf", "PDF"),
        ("html", "HTML"),
    ]
    STATUS_CHOICES = ImportJob.STATUS_CHOICES

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="export_jobs",
    )
    presentation = models.ForeignKey(
        Presentation,
        on_delete=models.CASCADE,
        related_name="export_jobs",
    )
    export_format = models.CharField(max_length=8, choices=FORMAT_CHOICES)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="queued")
    progress_percent = models.PositiveSmallIntegerField(default=0)
    message = models.CharField(max_length=512, default="Queued")
    output_file = models.FileField(upload_to="exports/", null=True, blank=True)
    error = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
