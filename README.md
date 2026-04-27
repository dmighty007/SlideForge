# PPTMaker AI Standalone

This folder is a clean standalone copy of the Django app, frontend, and AI PDF import bridge needed to run PPTMaker without depending on the parent repository layout.

## Contents

- `manage.py`
- `pptmaker_backend/`
- `studio/`
- `ai_jobs/`
- `bridge/`
- `index.html`
- `js/`
- `css/`
- `static/`

## Setup

1. Create and activate a Python environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Copy `.env.example` to `.env` and fill in the keys you want to use.
4. Initialize the database:

```bash
python manage.py migrate --run-syncdb
```

5. Start the server:

```bash
python manage.py runserver
```

Open `http://127.0.0.1:8000/`.

## Notes

- The AI PDF import endpoint is handled by Django through `ai_jobs/` and `bridge/pdf_bridge.py`.
- `GOOGLE_API_KEY` enables Gemini-first slide writing.
- `GROQ_API_KEY` enables Groq fallback.
- Local Ollama remains the final fallback and is also used for local vision analysis.
- `PPTMAKER_CONDA` is optional. Leave it empty unless you specifically want bridge jobs to run through `conda run`.
- This project currently relies on `migrate --run-syncdb` because the copied apps do not include migration files.
