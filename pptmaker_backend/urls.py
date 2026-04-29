from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve

from studio.views import spa_index


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("studio.urls")),
    path("api/", include("ai_jobs.urls")),
    path("", spa_index, name="spa-index"),
    re_path(r"^(?:index\.html)?$", spa_index, name="spa-index-html"),
    re_path(r"^js/(?P<path>.*)$", serve, {"document_root": settings.BASE_DIR / "js"}),
    re_path(r"^css/(?P<path>.*)$", serve, {"document_root": settings.BASE_DIR / "css"}),
    re_path(r"^assets/(?P<path>.*)$", serve, {"document_root": settings.BASE_DIR / "assets"}),
    re_path(r"^bridge/(?P<path>.*)$", serve, {"document_root": settings.BASE_DIR / "bridge"}),
    re_path(r"^extracted_figures/(?P<path>.*)$", serve, {"document_root": settings.BASE_DIR / "extracted_figures"}),
    re_path(r"^static/(?P<path>.*)$", serve, {"document_root": settings.BASE_DIR / "static"}),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
