from django.urls import path

from .auth_views import auth_login, auth_logout, auth_register, auth_session
from .views import asset_upload, export_pptx_view, presentation_create, presentation_detail, slide_cleanup_view


urlpatterns = [
    path("auth/session/", auth_session, name="auth-session"),
    path("auth/register/", auth_register, name="auth-register"),
    path("auth/login/", auth_login, name="auth-login"),
    path("auth/logout/", auth_logout, name="auth-logout"),
    path("assets/upload/", asset_upload, name="asset-upload"),
    path("slides/cleanup/", slide_cleanup_view, name="slide-cleanup"),
    path("presentations/", presentation_create, name="presentation-create"),
    path("presentations/<uuid:presentation_id>/", presentation_detail, name="presentation-detail"),
    path("presentations/export/pptx/", export_pptx_view, name="export-pptx"),
]
