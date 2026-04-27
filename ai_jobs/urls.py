from django.urls import path

from .views import ai_import_start, ai_import_status


urlpatterns = [
    path("ai-import-start", ai_import_start, name="ai-import-start"),
    path("ai-import-status", ai_import_status, name="ai-import-status"),
]
