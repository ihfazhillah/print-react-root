"""Seed script: import data.json entries into SQLite database."""

import argparse
import json
import logging
import sqlite3
import time
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(message)s")
log = logging.getLogger(__name__)

DEFAULT_DATA = str(Path(__file__).parent / "data.json")
DEFAULT_DB = str(Path(__file__).parent / "printable_pages.db")

# Schema must match db.py — duplicated here so seed.py is standalone (no async needed).
SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS printable_pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL UNIQUE,
    thumbnail TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('print', 'collection')) DEFAULT 'print',
    source TEXT NOT NULL DEFAULT 'krokotak',
    parent_id INTEGER REFERENCES printable_pages(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pages_type ON printable_pages(type);
CREATE INDEX IF NOT EXISTS idx_pages_parent ON printable_pages(parent_id);
CREATE INDEX IF NOT EXISTS idx_pages_source ON printable_pages(source);

CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS page_tags (
    page_id INTEGER NOT NULL REFERENCES printable_pages(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    link TEXT,
    PRIMARY KEY (page_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_page_tags_tag ON page_tags(tag_id);

CREATE TABLE IF NOT EXISTS interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id INTEGER NOT NULL REFERENCES printable_pages(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL CHECK(interaction_type IN ('view', 'select', 'print')),
    session_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_interactions_page ON interactions(page_id);
CREATE INDEX IF NOT EXISTS idx_interactions_session ON interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_interactions_created ON interactions(created_at);
"""


def _insert_page(
    conn: sqlite3.Connection,
    entry: dict,
    index: int,
    source: str,
    parent_id: int | None = None,
) -> int | None:
    """Insert a single page entry. Returns the page id, or None if skipped."""
    url = entry.get("url")
    thumbnail = entry.get("thumbnail")

    if not url:
        log.warning(f"  Skipping entry {index}: missing url")
        return None
    if not thumbnail:
        log.warning(f"  Skipping entry {index}: missing thumbnail")
        return None

    entry_type = entry.get("type", "print")

    cursor = conn.execute(
        "INSERT OR IGNORE INTO printable_pages (url, thumbnail, type, source, parent_id) "
        "VALUES (?, ?, ?, ?, ?)",
        (url, thumbnail, entry_type, source, parent_id),
    )

    if cursor.lastrowid == 0 or cursor.rowcount == 0:
        # Already existed (INSERT OR IGNORE skipped)
        row = conn.execute(
            "SELECT id FROM printable_pages WHERE url = ?", (url,)
        ).fetchone()
        return row[0] if row else None

    page_id = cursor.lastrowid

    # Insert tags
    for search in entry.get("searches", []):
        tag_text = search.get("text", "").strip()
        if not tag_text:
            continue
        tag_link = search.get("link")
        conn.execute("INSERT OR IGNORE INTO tags (name) VALUES (?)", (tag_text,))
        tag_row = conn.execute(
            "SELECT id FROM tags WHERE name = ?", (tag_text,)
        ).fetchone()
        conn.execute(
            "INSERT OR IGNORE INTO page_tags (page_id, tag_id, link) VALUES (?, ?, ?)",
            (page_id, tag_row[0], tag_link),
        )

    return page_id


def seed(data_path: str, db_path: str, source: str = "krokotak") -> dict:
    """Seed the database from a JSON file. Returns summary stats."""
    with open(data_path, "r", encoding="utf-8") as f:
        entries = json.load(f)

    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript(SCHEMA_SQL)

    imported = 0
    collections = 0
    prints = 0
    skipped = 0
    tags_before = conn.execute("SELECT COUNT(*) FROM tags").fetchone()[0]

    for i, entry in enumerate(entries):
        page_id = _insert_page(conn, entry, i, source)
        if page_id is None:
            skipped += 1
            continue

        imported += 1
        entry_type = entry.get("type", "print")

        if entry_type == "collection":
            collections += 1
            # Insert nested prints with parent_id
            for j, child in enumerate(entry.get("prints", [])):
                child_id = _insert_page(conn, child, f"{i}.{j}", source, parent_id=page_id)
                if child_id is None:
                    skipped += 1
                else:
                    prints += 1
                    imported += 1
        else:
            prints += 1

    conn.commit()
    tags_after = conn.execute("SELECT COUNT(*) FROM tags").fetchone()[0]
    tags_created = tags_after - tags_before
    conn.close()

    return {
        "imported": imported,
        "collections": collections,
        "prints": prints,
        "skipped": skipped,
        "tags_created": tags_created,
    }


def main():
    parser = argparse.ArgumentParser(description="Seed printable pages database from JSON")
    parser.add_argument("--data", default=DEFAULT_DATA, help="Path to data.json")
    parser.add_argument("--db", default=DEFAULT_DB, help="Path to SQLite database file")
    args = parser.parse_args()

    log.info(f"Seeding from {args.data} into {args.db}...")
    start = time.time()
    stats = seed(args.data, args.db)
    elapsed = time.time() - start

    log.info(
        f"Imported: {stats['imported']} pages, "
        f"{stats['collections']} collections, {stats['prints']} prints"
    )
    log.info(f"Tags created: {stats['tags_created']}")
    log.info(f"Skipped: {stats['skipped']} (malformed entries)")
    log.info(f"Done in {elapsed:.1f}s")


if __name__ == "__main__":
    main()
