import os
import sys
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent


def _env_int(name: str, default: int, *, minimum: int | None = None, maximum: int | None = None) -> int:
    try:
        value = int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        value = default
    if minimum is not None:
        value = max(minimum, value)
    if maximum is not None:
        value = min(maximum, value)
    return value


DEBUG = os.getenv("DJANGO_DEBUG", "0") == "1"
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY")
if not SECRET_KEY:
    if DEBUG or "test" in sys.argv:
        SECRET_KEY = "dev-only-pptmaker-secret-key"
    else:
        raise ImproperlyConfigured("DJANGO_SECRET_KEY must be set when DJANGO_DEBUG is not 1.")
ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv("DJANGO_ALLOWED_HOSTS", "127.0.0.1,localhost,testserver").split(",")
    if host.strip()
]


INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "studio",
    "ai_jobs",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "pptmaker_backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

WSGI_APPLICATION = "pptmaker_backend.wsgi.application"
ASGI_APPLICATION = "pptmaker_backend.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

AUTH_PASSWORD_VALIDATORS = (
    []
    if DEBUG
    else [
        {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
        {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
        {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
        {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
    ]
)

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATICFILES_DIRS = [BASE_DIR / "static"]
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
DATA_UPLOAD_MAX_MEMORY_SIZE = _env_int("DJANGO_DATA_UPLOAD_MAX_MEMORY_SIZE", 64 * 1024 * 1024)
FILE_UPLOAD_MAX_MEMORY_SIZE = _env_int("DJANGO_FILE_UPLOAD_MAX_MEMORY_SIZE", 1024 * 1024)
PPTMAKER_MAX_ASSET_UPLOAD_BYTES = _env_int("PPTMAKER_MAX_ASSET_UPLOAD_BYTES", 25 * 1024 * 1024)
PPTMAKER_MAX_MOLECULE_UPLOAD_BYTES = _env_int("PPTMAKER_MAX_MOLECULE_UPLOAD_BYTES", 64 * 1024 * 1024)
PPTMAKER_MAX_USER_ASSET_STORAGE_BYTES = _env_int("PPTMAKER_MAX_USER_ASSET_STORAGE_BYTES", 250 * 1024 * 1024)

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
X_FRAME_OPTIONS = "SAMEORIGIN"

PPTMAKER_CONDA = os.getenv("PPTMAKER_CONDA", "")
PPTMAKER_BRIDGE_JSON_TIMEOUT = _env_int("PPTMAKER_BRIDGE_JSON_TIMEOUT", 7200, minimum=60)
PPTMAKER_ALLOW_REMOTE_LLM = os.getenv("PPTMAKER_ALLOW_REMOTE_LLM", "0") == "1"
PPTMAKER_IMPORT_WORKERS = _env_int("PPTMAKER_IMPORT_WORKERS", 1, minimum=1, maximum=2)
PPTMAKER_USE_MARKER_VISUALS = os.getenv("PPTMAKER_USE_MARKER_VISUALS", "0") == "1"
PPTMAKER_MARKER_TIMEOUT_SECONDS = _env_int("PPTMAKER_MARKER_TIMEOUT_SECONDS", 300, minimum=30)
PPTMAKER_ENABLE_AI_CLEANUP = os.getenv("PPTMAKER_ENABLE_AI_CLEANUP", "0") == "1"
