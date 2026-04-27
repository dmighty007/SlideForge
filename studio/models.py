import uuid

from django.conf import settings
from django.db import models


class Presentation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="presentations",
    )
    title = models.CharField(max_length=255, default="Untitled Presentation")
    presentation_theme = models.CharField(max_length=64, default="editorial")
    state_json = models.JSONField(default=dict)
    bridge_result_json = models.JSONField(default=dict, blank=True)
    source_pdf = models.FileField(upload_to="source_pdfs/", null=True, blank=True)
    autosave_version = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


class PresentationRevision(models.Model):
    presentation = models.ForeignKey(
        Presentation,
        on_delete=models.CASCADE,
        related_name="revisions",
    )
    version = models.PositiveIntegerField()
    state_json = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ("presentation", "version")


class Asset(models.Model):
    ASSET_TYPES = [
        ("image", "Image"),
        ("video", "Video"),
        ("pdf", "PDF"),
        ("export", "Export"),
        ("other", "Other"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assets",
    )
    presentation = models.ForeignKey(
        Presentation,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="assets",
    )
    asset_type = models.CharField(max_length=16, choices=ASSET_TYPES, default="other")
    file = models.FileField(upload_to="assets/")
    metadata_json = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
