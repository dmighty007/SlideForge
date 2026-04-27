from django.contrib import admin

from .models import ExportJob, ImportJob


@admin.register(ImportJob)
class ImportJobAdmin(admin.ModelAdmin):
    list_display = ("id", "status", "progress_percent", "event", "updated_at")
    search_fields = ("id", "message")


@admin.register(ExportJob)
class ExportJobAdmin(admin.ModelAdmin):
    list_display = ("id", "presentation", "export_format", "status", "progress_percent", "updated_at")
