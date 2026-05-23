# SlideForge

SlideForge is a browser-based presentation editor with a Django backend. It combines a canvas-style slide builder, project persistence, PPTX export, animation tooling, and document-to-slide workflows in one local web app.

## What It Does

- Edit presentations in a Figma-like canvas with draggable, resizable, styleable slide elements.
- Build slides from text, images, shapes, tables, media, scientific figures, and generated presets.
- Insert editable Mermaid diagrams for flowcharts, sequence diagrams, state charts, Gantt timelines, ER diagrams, and mind maps.
- Apply and preview slide and object animations, including advanced text and shape effects.
- Import presentation JSON and clean up slide content.
- Save presentations through the Django API and export decks to PowerPoint.
- Run locally with SQLite for development.

## Project Layout

```text
SlideForge/
|-- backend/
|   |-- manage.py
|   |-- pptmaker_backend/   # Django settings and root URL routing
|   |-- studio/             # Django views, auth, assets, presentations, exports
|   `-- bridge/             # Document parsing, LLM helpers, PPTX exporter
|-- frontend/
|   |-- index.html          # Single-page editor shell
|   |-- js/                 # Frontend editor modules
|   |-- css/                # Editor styles
|   |-- assets/             # Static images and icons
|   `-- static/             # Extra static source directory for Django
|-- tests/
|   `-- browser/            # Optional Playwright/browser probes
|-- requirements.txt        # Python dependencies
`-- package.json            # Optional Playwright dependency for browser probes
```

## Requirements

- Python 3.10 or newer
- Django 5.2, installed from `requirements.txt`
- SQLite, used by default through `db.sqlite3`
- Node.js, optional, only needed for Playwright-based browser checks
- Optional local document extraction tools for PDF processing workflows.

## Quick Start

Create and activate a Python environment:

```bash
python -m venv .venv
source .venv/bin/activate
```

Install the backend dependencies:

```bash
pip install -r requirements.txt
```

Create your local environment file:

```bash
cp .env.example .env
```

Run database migrations:

```bash
python backend/manage.py migrate
```

Start the development server:

```bash
python backend/manage.py runserver
```

Open the editor at:

```text
http://127.0.0.1:8000/
```

In development mode, Django serves the editor shell from `frontend/` plus the `/js/`, `/css/`, `/assets/`, `/static/`, and `/media/` paths.

## Configuration

The main runtime settings are loaded from `.env`.

Core Django settings:

```text
DJANGO_SECRET_KEY=change-me
DJANGO_DEBUG=1
DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost,testserver
```

Document extraction settings:

```text
MINERU_BIN=
PPTMAKER_MINERU_BACKEND=pipeline
PPTMAKER_MINERU_TIMEOUT_SECONDS=1800
PPTMAKER_FIGURE_BACKEND=auto
```

## API Surface

The Django app exposes the editor at `/` and serves backend endpoints under `/api/`.

- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `POST /api/auth/logout/`
- `GET /api/auth/session/`
- `POST /api/assets/upload/`
- `POST /api/slides/cleanup/`
- `POST /api/presentations/`
- `GET/PATCH/DELETE /api/presentations/<presentation_id>/`
- `POST /api/presentations/export/pptx/`

## Development

Run Django checks:

```bash
npm run check:backend
```

Run Django tests:

```bash
npm run test:backend
```

Install optional browser tooling:

```bash
npm install
```

Run the animation probe when Playwright is installed:

```bash
npm run test:animations
```

For focused frontend syntax checks, use Node against the files you changed:

```bash
npm run check:frontend
```

## Mermaid Diagrams

Use the toolbar button labelled `Flowchart / Mermaid Diagram` or press `Ctrl+Shift+M` to open the diagram editor. Flowcharts open as a hybrid visual/code editor with draggable nodes, quick connections, inline label editing, a compact floating toolbar, markdown-lite labels, multi-select basics, layout controls, and Mermaid source kept in sync. Non-flowchart Mermaid types still use the sanitized Mermaid preview/render path.

Architecture notes:

- `frontend/js/mermaid/mermaid-engine.js` lazy-loads Mermaid from the ESM CDN, validates source, queues async renders, caches SVG, and sanitizes output.
- `frontend/js/mermaid/mermaid-graph.js` parses flowchart Mermaid into SlideForge's graph model, lays out nodes, regenerates Mermaid with `sf:graph` position metadata, and exports custom SVG.
- `frontend/js/mermaid/mermaid-dialog.js` owns visual/code/split modes, templates, direct graph manipulation, theme controls, debounce, diagnostics, and insert/update flow.
- `frontend/js/mermaid/mermaid-object.js` creates and renders canvas objects so diagrams can be moved, resized, copied, duplicated, styled, and animated like other elements.
- `frontend/js/mermaid/mermaid-export.js` handles browser SVG download.
- `backend/bridge/pptx_exporter.py` exports Mermaid diagrams as SVG when supported and falls back to high-resolution PNG through CairoSVG.

Migration notes:

- Existing projects load unchanged.
- New Mermaid elements preserve `mermaidSource`, `mermaidType`, `theme`, `svgContent`, `graphModel`, `nodePositions`, routing/layout flags, dimensions, style, and animation data.
- Visual node positions are stored both in `graphModel` and in Mermaid comments such as `%% sf:graph {...} %%`, so source remains portable while SlideForge can restore manual layout.
- Double-click a node to edit inline, drag from a connector to create a linked node, use `Enter` for child nodes, `Tab` for siblings, `Ctrl/Cmd+D` to duplicate, arrow keys to nudge, and `F` to focus the current selection.
- If an older saved project contains a Mermaid object without `svgContent`, the editor re-renders it on load.

## Notes

- Local development data lives in `backend/db.sqlite3` and `backend/media/`.
- Do not commit `.env`, uploaded media, generated caches, or local browser probe output.
- The frontend is intentionally framework-light: most editor behavior lives in ES modules under `frontend/js/`.
- PPTX export is implemented in `backend/bridge/pptx_exporter.py` and exposed through the Django presentation export endpoint.
