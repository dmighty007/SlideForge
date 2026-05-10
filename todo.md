# TODO: Code Review Findings and Improvement Ideas

Generated after a static review of the Django backend, PDF/AI bridge, and browser editor/export code.

## P0 - Fix likely breakages first

- [x] Fix PPTX export 500 caused by missing `re` import.
  - File: `studio/views.py:297-300`
  - `export_pptx_view()` calls `re.sub(...)` but `re` is not imported.
  - Suggested fix: `import re` at the top, or replace with `django.utils.text.get_valid_filename` plus a `.pptx` suffix guard.

- [x] Make PPTX image path resolution portable.
  - File: `bridge/pptx_exporter.py:79-93`
  - `_get_image_stream()` hardcodes `/home/dm/Dibyendu/GitProjects/pptmaker_ai`, so exports will break from any other checkout or deployment path.
  - Suggested fix: pass `settings.BASE_DIR` / `settings.MEDIA_ROOT` into `PPTXExporter`, or derive the root relative to the module path.

- [x] Fix PDF/PNG exports for non-4:3 decks.
  - File: `js/export.js:42-45`, `js/export.js:72-81`, `js/export.js:109-117`
  - Exports hard-code `1024x768`, so 16:9 and 16:10 decks can be cropped or stretched.
  - Suggested fix: use `getPresentationPageSetupConfig()` for export width, height, and orientation.

- [x] Capture the active slide instead of the whole Reveal container during image/PDF export.
  - File: `js/export.js:59-73`, `js/export.js:102-117`
  - Capturing `#slides-container` can include Reveal transforms, hidden slides, or extra blank space.
  - Suggested fix: render/capture each active slide section at native dimensions, ideally in an offscreen export stage.

- [x] Restore editor UI in `finally` blocks when PDF/PNG export fails.
  - File: `js/export.js:61-77`, `js/export.js:105-120`
  - Resize handles and selection classes are restored only on the success path.
  - Suggested fix: wrap hide/capture/restore logic in `try/finally`.

- [x] Return HTTP 400 instead of 500 for malformed JSON during presentation creation.
  - File: `studio/views.py:205`
  - `presentation_create()` calls `_request_json()` without catching `ValueError`.
  - Suggested fix: mirror `presentation_detail()` and `auth_views.py` error handling.

## P1 - Security and privacy hardening

- [x] Stop exposing backend source and generated artifacts through public URL routes.
  - File: `pptmaker_backend/urls.py:16-21`
  - `/bridge/...` exposes Python bridge source and helper files. `/extracted_figures/...` may expose imported PDF figures across users.
  - Suggested fix: do not serve backend source directories. Serve static frontend assets through staticfiles/web server only, and protect generated files by ownership.

- [x] Do not serve media files with `static()` outside development.
  - File: `pptmaker_backend/urls.py:22`
  - Uploaded/imported media is publicly retrievable by URL.
  - Suggested fix: append `static(settings.MEDIA_URL, ...)` only when `settings.DEBUG`; use authenticated download views or private object storage for production.

- [x] Replace insecure production defaults.
  - File: `pptmaker_backend/settings.py:6-8`, `pptmaker_backend/settings.py:59`
  - `SECRET_KEY` has a hardcoded fallback, `DEBUG` defaults to on, and password validators are disabled.
  - Suggested fix: default `DJANGO_DEBUG` to off, fail startup without a real secret when `DEBUG=0`, configure `ALLOWED_HOSTS`, and enable Django password validators.

- [x] Require authentication and quotas for asset uploads.
  - File: `studio/views.py:137-144`
  - Anonymous upload creates ownerless assets and can be abused for public file hosting or storage exhaustion.
  - Suggested fix: require auth or use strict guest quotas; validate file content, size, extension, and MIME type.

- [x] Make remote LLM use opt-in and visible to users.
  - File: `ai_jobs/services.py:69-78`
  - The import service always passes `--allow-remote-llm`, so PDFs may be sent to remote APIs if keys are configured.
  - Suggested fix: add deployment/user/job setting for local-only vs remote-enhanced import, with clear disclosure.

- [x] Sanitize rendered text and imported deck content.
  - File: `js/textContent.js:371-373`, `js/render.js:1452`, `js/render.js:1518`, `js/export.js:1523`
  - Raw text/HTML content is rendered with `innerHTML`, enabling stored XSS through imported JSON, pasted content, or saved decks.
  - Suggested fix: use DOMPurify or a strict allowlist before saving/rendering; use `textContent` for plain text paths.

- [x] Sandbox HTML embeds.
  - File: `js/render.js:1700-1704`, `js/export.js:1642-1646`, `js/htmlEmbed.js:176-188`, `js/commands.js:1299-1325`
  - Imported HTML is placed into `iframe.srcdoc` without a sandbox and can run same-origin scripts.
  - Suggested fix: add `sandbox` without `allow-same-origin` by default, add a trust prompt, and strip dangerous HTML where possible.

- [x] Validate imported and persisted presentation state before assigning it to `state`.
  - File: `js/commands.js:3486-3523`, `js/state.js:1008-1028`, `js/render.js:1017-1040`
  - Arbitrary imported JSON can define element HTML, CSS, URLs, embeds, and unsupported element shapes.
  - Suggested fix: add a schema validator that allowlists element types, style keys/values, URL schemes, max sizes, and slide counts.

- [x] Restrict bridge-localized file paths to known extraction directories and image MIME types.
  - File: `ai_jobs/services.py:120-140`
  - Malformed bridge output could copy any file under `BASE_DIR` into public media.
  - Suggested fix: only allow paths under expected extraction/output directories; verify extension and MIME as images before copying.

- [x] Restrict server-side PPTX export image reads to owned media/static assets.
  - File: `bridge/pptx_exporter.py:79-98`
  - User-submitted state controls image paths that the server attempts to read.
  - Suggested fix: resolve paths and enforce `relative_to(MEDIA_ROOT)` or a safe static root; do ownership checks where possible.

- [x] Avoid leaking raw exception text from export failures.
  - File: `studio/views.py:309-310`
  - Raw internal error strings are returned to clients.
  - Suggested fix: log exceptions server-side and return a generic JSON error with a request/job id.

- [ ] Add Subresource Integrity or self-host third-party frontend dependencies.
  - File: `index.html:30-31`, `index.html:70`, `index.html:78-85`, `index.html:959-971`
  - CDN scripts/styles are loaded without SRI.
  - Suggested fix: pin versions, add SRI + `crossorigin`, or bundle/self-host dependencies.

## P1 - Reliability and data integrity

- [ ] Add timeout/resource limits to video transcoding.
  - File: `studio/views.py:52-75`
  - `ffmpeg` can run indefinitely or consume excessive resources on problematic uploads.
  - Suggested fix: add subprocess timeout, ffprobe validation, file size/duration caps, and async worker isolation.

- [x] Move Ollama acquisition inside AI job failure handling.
  - File: `ai_jobs/services.py:202-205`
  - `_acquire_ollama()` runs before the `try`; startup failure can leave jobs queued/running without proper failure status.
  - Suggested fix: catch acquisition errors and mark the job failed; keep ref-count updates exception-safe.

- [ ] Fix bridge subprocess timeout supervision.
  - File: `ai_jobs/services.py:225-249`
  - The worker blocks while iterating `proc.stdout`; `proc.wait(timeout=...)` is reached only after stdout closes.
  - Suggested fix: use a deadline with nonblocking reads, `communicate(timeout=...)`, or a watchdog process/thread.

- [x] Use per-job output filenames/directories for bridge JSON.
  - File: `ai_jobs/services.py:206-207`
  - Every import currently writes `presentation_export.json` beside the PDF, creating a race risk for concurrent jobs.
  - Suggested fix: include `job.id` in the filename or create a per-job output directory.

- [x] Make autosave version increments atomic.
  - File: `studio/views.py:267-275`
  - Concurrent saves can lose version increments and `PresentationRevision` can hit `unique_together` conflicts.
  - Suggested fix: use `transaction.atomic()`, `select_for_update()` or `F()` expressions, and handle revision collisions.

- [x] Parse CSS font weights safely in PPTX export.
  - File: `bridge/pptx_exporter.py:181`
  - `int(styles.get("fontWeight") or 400)` fails for CSS values like `normal`, causing text elements to be skipped by the outer catch.
  - Suggested fix: map `normal` to 400, `bold` to 700, and tolerate unknown values.

- [ ] Add timeouts and better errors for PDF extraction subprocesses.
  - File: `bridge/processors.py:58-67`
  - `marker_single` can run indefinitely and exceptions are swallowed.
  - Suggested fix: add subprocess timeout, capture stderr, and propagate structured failure reasons.

- [ ] Standardize API error responses.
  - Files: `studio/views.py`, `ai_jobs/views.py`, `studio/auth_views.py`
  - Some endpoints return plain text 400s, others JSON.
  - Suggested fix: use a consistent JSON schema such as `{ "error": { "code": "...", "message": "..." } }`.

## P2 - UX fixes

- [x] Allow the auth modal to close while unauthenticated.
  - File: `js/state.js:913-919`
  - `closeAuthModal()` only hides the modal when `currentAuthUser` is truthy.
  - Suggested fix: make modal closing independent of auth state; keep entry-gate behavior separate.

- [ ] Either implement real guest persistence or rename “Local only mode”.
  - File: `js/state.js:341-344`
  - `continueAsGuest()` dismisses the gate but no local deck persistence path was found.
  - Suggested fix: save guest decks to IndexedDB/localStorage with asset handling, or make the UI explicit that work is not saved after reload.

- [x] Remove duplicate KaTeX stylesheet and fix chalk color label target.
  - File: `index.html:30`, `index.html:82`, `index.html:453`, `index.html:480`
  - KaTeX CSS is loaded twice. A label targets `present-chalk-color` while wrapping/near a different chip input.
  - Suggested fix: keep one stylesheet and align label `for` with the intended input id.

- [x] Remove leftover debug logging.
  - File: `js/main.js:408`, `js/main.js:432`
  - Group/ungroup operations log to console.
  - Suggested fix: remove logs or guard them behind a debug flag.

## P2 - Export quality improvements

- [ ] Add export progress, cancel, and asset diagnostics.
  - File: `js/export.js`
  - Current export loops use fixed waits and only lightweight status hints.
  - Suggested feature: progress modal with cancel button, per-slide status, missing-media warnings, CORS warnings, and a final report.

- [x] Make ZIP viewer render HTML embeds the same way as the editor.
  - File: `js/export.js:1642-1646`, compare `js/render.js:1701`
  - ZIP viewer uses raw `elData.content` instead of `buildHtmlEmbedSrcdoc()`.
  - Suggested fix: include equivalent embed wrapping/autofit code in exported viewer generation.

- [x] Preserve table column widths and row heights in exported ZIP viewer.
  - File: `js/export.js:1458-1485`, `js/export.js:1537-1560`
  - Table export normalizes data but drops `rowHeights` and `colWidths`.
  - Suggested fix: mirror the editor table renderer, including `<colgroup>` and row height styles.

- [x] Improve native PPTX fidelity.
  - File: `bridge/pptx_exporter.py`
  - Current exporter strips most HTML, handles limited shapes, partial cropping, and no video/pdf/html/embed support.
  - Suggested feature: support rich text runs, tables, charts, connectors, speaker notes, theme fonts/colors, and asset fallback placeholders.
  - Implemented first fidelity pass: rich text runs, tables, connectors, speaker notes, background colors, and placeholders for unsupported chart/video/pdf/html/equation content.

## P3 - Product features

- [ ] Add a proper background job queue.
  - File: `ai_jobs/services.py:21`, `ai_jobs/services.py:198-199`
  - In-process `ThreadPoolExecutor` jobs are lost on process restart and do not coordinate across multiple web workers.
  - Suggested feature: Celery/RQ/Django-Q with retries, cancellation, stale job recovery, job logs, and admin observability.

- [ ] Add asset ownership, cleanup, retention, and quotas.
  - File: `studio/models.py:44-71`, `ai_jobs/models.py:9-40`
  - Uploaded assets/import PDFs/generated figures can accumulate without retention policy.
  - Suggested feature: per-user storage accounting, orphan cleanup command, delete hooks, and configurable retention windows.

- [ ] Add safer import preview.
  - File: `js/commands.js:3486-3523`
  - Suggested feature: show deck metadata before import, validate schema, list external URLs/HTML embeds/scripts, and ask whether to trust active content.

- [ ] Add revision history UI and restore.
  - File: `studio/models.py:29-41`, `studio/views.py:270-275`
  - The model exists but there is no visible API/UI for browsing or restoring revisions.
  - Suggested feature: revision list, diff preview, named snapshots, and restore-to-copy.

- [ ] Add collaboration-safe saves.
  - File: `studio/views.py:230-283`, `js/state.js:1072-1096`
  - Suggested feature: optimistic concurrency using autosave version/ETag, conflict detection, and “restore local changes” when another tab overwrites state.

## Verification notes

- Verified with conda environment `django_env` at `/home/dm/Soft/miniconda3/envs/django_env`.
- Python/Django versions in `django_env`: Python 3.12.13, Django 5.1.3.
- Initial runtime probes confirmed the P0 PPTX export bug and malformed JSON bug before fixes.
- Added regression tests in `studio/tests.py` for PPTX export, malformed JSON handling, portable PPTX image path resolution, and PDF/PNG export sizing/capture behavior.
- `/home/dm/Soft/miniconda3/envs/django_env/bin/python manage.py test studio.tests -v 2` passed: 22 tests OK.
- `/home/dm/Soft/miniconda3/envs/django_env/bin/python manage.py test -v 2` passed: 22 tests OK.
- `DJANGO_DEBUG=1 /home/dm/Soft/miniconda3/envs/django_env/bin/python manage.py check` passed: `System check identified no issues (0 silenced).`
- `/home/dm/Soft/miniconda3/envs/django_env/bin/python -m compileall -q pptmaker_backend studio ai_jobs bridge` passed.
- `node --check js/export.js` passed.
- `node --check js/commands.js` passed.
- `node --check js/state.js` passed.
- `node --check js/textContent.js` passed.
- `node --check js/htmlEmbed.js` passed.
- `node --check js/render.js` passed.
- `node --check js/properties.js` passed.
- Review and fixes are still not a full browser/manual export smoke test; PDF/PNG browser rendering should be smoke-tested in the UI before release.
