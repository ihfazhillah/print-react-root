# Research: Tag CRUD & Indonesian Translation

**Feature**: 004-tag-crud-translation
**Date**: 2026-03-01

## R1: Translation Library Choice

**Decision**: Use `deep-translator` with the `GoogleTranslator` backend (source=`en`, target=`id`).

**Rationale**:
- Lightweight pip install (`deep-translator>=1.11.4`), no large model downloads
- GoogleTranslator backend is free, requires no API key, and supports Indonesian (`id`)
- Simple synchronous API: `GoogleTranslator(source='en', target='id').translate(text)`
- Supports batch translation via `.translate_batch(list_of_strings)`

**Alternatives considered**:
- `argos-translate`: Requires downloading ~500MB language models; more complex setup; better for fully offline use but overkill for this use case
- `MyMemoryTranslator` (also in deep-translator): Free but has a 1000 chars/day limit for anonymous use; GoogleTranslator has no such documented limit

## R2: Database Schema Extension

**Decision**: Add `id_translation TEXT NOT NULL DEFAULT ''` column to the existing `tags` table, with a dedicated index.

**Rationale**:
- Aligns with user request for "nullable / make it empty string" — using empty string as default rather than NULL simplifies queries (no COALESCE needed)
- A dedicated index (`idx_tags_id_translation`) enables efficient LIKE searches on Indonesian translations
- SQLite ALTER TABLE ADD COLUMN is the simplest migration path

**Alternatives considered**:
- Separate translations table (normalized): Adds join complexity for a single-language translation; unnecessary for this scope
- NULL default: Would require COALESCE in queries; empty string is simpler and the user explicitly mentioned it

## R3: Search Integration Pattern

**Decision**: Extend the existing `search_by_tag` query to also match against `tags.id_translation` using the same LIKE pattern.

**Rationale**:
- Current search already does `LOWER(t.name) LIKE LOWER(?)` — adding `OR LOWER(t.id_translation) LIKE LOWER(?)` is minimal change
- Deduplication is already handled by `SELECT DISTINCT`
- No separate search endpoint needed; Indonesian search works transparently through existing search

**Alternatives considered**:
- Separate Indonesian search endpoint: Unnecessary complexity; unified search is better UX
- Full-text search (FTS5): Over-engineered for tag-name matching; LIKE with index is sufficient for the ~100-1000 tags expected

## R4: Admin UI Pattern for Tag CRUD

**Decision**: Add a "Tags" sub-tab within the existing Admin view, reusing the same table/modal pattern from the pages CRUD.

**Rationale**:
- Existing admin has Search/Admin tab toggle; adding a "Pages" / "Tags" sub-navigation within Admin is the simplest extension
- Reuses existing CSS classes (`.admin-table`, `.admin-modal`, `.admin-edit-btn`, etc.)
- Modal form has two fields: name and id_translation (simpler than pages modal)

**Alternatives considered**:
- Separate top-level "Tags" tab: Would add a third top-level tab; nested within Admin is cleaner since tags are an admin-only concern

## R5: Bulk Translation Execution Strategy

**Decision**: Server-side endpoint that fetches all untranslated tags, translates them in a batch, and updates the database. Return a summary of results.

**Rationale**:
- `deep-translator` is synchronous; running in a FastAPI endpoint with `run_in_executor` or simply as sync (acceptable for admin-only bulk action)
- `translate_batch()` sends tags efficiently
- Response includes count of translated, skipped, and failed tags

**Alternatives considered**:
- Client-side translation: Would expose translation logic to frontend; server-side is simpler and more reliable
- Background task with polling: Over-engineered for ~100-1000 tags that translate in seconds
