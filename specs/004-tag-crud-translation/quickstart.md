# Quickstart: Tag CRUD & Indonesian Translation

**Feature**: 004-tag-crud-translation
**Date**: 2026-03-01

## Prerequisites

- Python 3.10+
- `uv` package manager
- Existing `fastapi-image-search/` backend running

## Setup

1. Install new dependency:
   ```bash
   cd fastapi-image-search
   uv add deep-translator>=1.11.4
   ```

2. Run the server (schema migration runs automatically on startup):
   ```bash
   uv run uvicorn main:app --reload
   ```

3. The `id_translation` column is added automatically via `ALTER TABLE` in `init_db()`.

## Verify

1. **Tag CRUD**: Navigate to `http://localhost:8000` → Admin → Tags tab
2. **Bulk Translate**: Click "Translate All" button in the Tags tab
3. **Indonesian Search**: Search for an Indonesian word in the main search bar

## Run Tests

```bash
cd fastapi-image-search
uv run python -m unittest discover -v
```

## Key Files Modified

| File | Change |
|------|--------|
| `db.py` | Add `id_translation` column, migration, tag CRUD functions, updated search |
| `main.py` | New tag CRUD endpoints, bulk translate endpoint |
| `templates/index.html` | Tags sub-tab in admin view, tag CRUD modal |
| `static/js/app.js` | Tag admin table, modal, bulk translate button logic |
| `pyproject.toml` | Add `deep-translator` dependency |
