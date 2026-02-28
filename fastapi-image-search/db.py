"""Database connection, schema initialization, and query helpers for printable pages."""

import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import aiosqlite

DB_PATH = os.environ.get("DB_PATH", str(Path(__file__).parent / "printable_pages.db"))

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


async def init_db(db_path: str | None = None) -> None:
    """Create all tables and indexes if they don't exist."""
    path = db_path or DB_PATH
    async with aiosqlite.connect(path) as db:
        await db.execute("PRAGMA foreign_keys = ON")
        await db.executescript(SCHEMA_SQL)
        await db.commit()


@asynccontextmanager
async def get_db(db_path: str | None = None):
    """Async context manager that yields an aiosqlite connection with Row factory."""
    path = db_path or DB_PATH
    db = await aiosqlite.connect(path)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA foreign_keys = ON")
    try:
        yield db
    finally:
        await db.close()


# ---------------------------------------------------------------------------
# Query functions — all DB access goes through these (swappable in tests)
# ---------------------------------------------------------------------------


async def _build_item_dict(db: aiosqlite.Connection, row: aiosqlite.Row) -> dict[str, Any]:
    """Convert a printable_pages row into the API response dict with searches."""
    item: dict[str, Any] = {
        "id": row["id"],
        "thumbnail": row["thumbnail"],
        "url": row["url"],
        "type": row["type"],
        "source": row["source"],
    }
    # Reconstruct searches array from page_tags + tags
    async with db.execute(
        """
        SELECT t.name, pt.link
        FROM page_tags pt
        JOIN tags t ON t.id = pt.tag_id
        WHERE pt.page_id = ?
        ORDER BY t.name
        """,
        (row["id"],),
    ) as cursor:
        searches = []
        async for tag_row in cursor:
            entry: dict[str, str] = {"text": tag_row["name"]}
            if tag_row["link"] is not None:
                entry["link"] = tag_row["link"]
            searches.append(entry)
        item["searches"] = searches
    return item


async def get_items(db: aiosqlite.Connection, skip: int, limit: int) -> list[dict[str, Any]]:
    """Return paginated top-level items (parent_id IS NULL)."""
    async with db.execute(
        "SELECT * FROM printable_pages WHERE parent_id IS NULL ORDER BY id LIMIT ? OFFSET ?",
        (limit, skip),
    ) as cursor:
        rows = await cursor.fetchall()
    return [await _build_item_dict(db, r) for r in rows]


async def get_item_count(db: aiosqlite.Connection) -> int:
    """Return total count of top-level items."""
    async with db.execute(
        "SELECT COUNT(*) as cnt FROM printable_pages WHERE parent_id IS NULL"
    ) as cursor:
        row = await cursor.fetchone()
        return row["cnt"]


async def search_by_tag(
    db: aiosqlite.Connection, query: str, skip: int, limit: int
) -> list[dict[str, Any]]:
    """Search top-level items by tag name (case-insensitive LIKE)."""
    like_pattern = f"%{query}%"
    # Find top-level items whose own tags match, OR that are collections
    # containing child prints whose tags match.
    async with db.execute(
        """
        SELECT DISTINCT p.* FROM printable_pages p
        LEFT JOIN page_tags pt ON pt.page_id = p.id
        LEFT JOIN tags t ON t.id = pt.tag_id
        WHERE p.parent_id IS NULL
          AND (
            LOWER(t.name) LIKE LOWER(?)
            OR p.id IN (
              SELECT child.parent_id FROM printable_pages child
              JOIN page_tags cpt ON cpt.page_id = child.id
              JOIN tags ct ON ct.id = cpt.tag_id
              WHERE child.parent_id IS NOT NULL
                AND LOWER(ct.name) LIKE LOWER(?)
            )
          )
        ORDER BY p.id
        LIMIT ? OFFSET ?
        """,
        (like_pattern, like_pattern, limit, skip),
    ) as cursor:
        rows = await cursor.fetchall()
    return [await _build_item_dict(db, r) for r in rows]


async def get_related(db: aiosqlite.Connection, item_id: int) -> list[dict[str, Any]]:
    """For collections: return child prints. For prints: return items sharing tags."""
    async with db.execute(
        "SELECT * FROM printable_pages WHERE id = ?", (item_id,)
    ) as cursor:
        item = await cursor.fetchone()
    if item is None:
        return []

    if item["type"] == "collection":
        # Return child prints
        async with db.execute(
            "SELECT * FROM printable_pages WHERE parent_id = ? ORDER BY id",
            (item_id,),
        ) as cursor:
            rows = await cursor.fetchall()
        return [await _build_item_dict(db, r) for r in rows]
    else:
        # Find items sharing overlapping tags (exclude self)
        async with db.execute(
            """
            SELECT DISTINCT p.* FROM printable_pages p
            JOIN page_tags pt ON pt.page_id = p.id
            WHERE p.id != ?
              AND p.parent_id IS NULL
              AND pt.tag_id IN (
                SELECT tag_id FROM page_tags WHERE page_id = ?
              )
            ORDER BY p.id
            """,
            (item_id, item_id),
        ) as cursor:
            rows = await cursor.fetchall()
        return [await _build_item_dict(db, r) for r in rows]


async def get_tags(db: aiosqlite.Connection, limit: int) -> list[str]:
    """Return sorted unique tag names."""
    async with db.execute(
        "SELECT DISTINCT name FROM tags ORDER BY name LIMIT ?", (limit,)
    ) as cursor:
        rows = await cursor.fetchall()
    return [row["name"] for row in rows]


# ---------------------------------------------------------------------------
# CRUD functions (US2)
# ---------------------------------------------------------------------------


async def get_page(db: aiosqlite.Connection, page_id: int) -> dict[str, Any] | None:
    """Get a single page by ID."""
    async with db.execute(
        "SELECT * FROM printable_pages WHERE id = ?", (page_id,)
    ) as cursor:
        row = await cursor.fetchone()
    if row is None:
        return None
    return await _build_item_dict(db, row)


async def create_page(db: aiosqlite.Connection, data: dict[str, Any]) -> dict[str, Any]:
    """Insert a new page with tags. Returns the created page dict."""
    cursor = await db.execute(
        """
        INSERT INTO printable_pages (url, thumbnail, type, source, parent_id)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            data["url"],
            data["thumbnail"],
            data.get("type", "print"),
            data.get("source", "manual"),
            data.get("parent_id"),
        ),
    )
    page_id = cursor.lastrowid
    # Insert tags
    for tag_name in data.get("tags", []):
        await db.execute("INSERT OR IGNORE INTO tags (name) VALUES (?)", (tag_name,))
        async with db.execute("SELECT id FROM tags WHERE name = ?", (tag_name,)) as c:
            tag_row = await c.fetchone()
        await db.execute(
            "INSERT OR IGNORE INTO page_tags (page_id, tag_id) VALUES (?, ?)",
            (page_id, tag_row["id"]),
        )
    await db.commit()
    return await get_page(db, page_id)


async def update_page(
    db: aiosqlite.Connection, page_id: int, data: dict[str, Any]
) -> dict[str, Any] | None:
    """Update an existing page. Returns updated page dict or None if not found."""
    # Check exists
    existing = await get_page(db, page_id)
    if existing is None:
        return None

    # Update fields that are provided
    updates = []
    params = []
    for field in ("url", "thumbnail", "type", "source", "parent_id"):
        if field in data:
            updates.append(f"{field} = ?")
            params.append(data[field])
    if updates:
        params.append(page_id)
        await db.execute(
            f"UPDATE printable_pages SET {', '.join(updates)} WHERE id = ?", params
        )

    # Replace tags if provided
    if "tags" in data:
        await db.execute("DELETE FROM page_tags WHERE page_id = ?", (page_id,))
        for tag_name in data["tags"]:
            await db.execute("INSERT OR IGNORE INTO tags (name) VALUES (?)", (tag_name,))
            async with db.execute("SELECT id FROM tags WHERE name = ?", (tag_name,)) as c:
                tag_row = await c.fetchone()
            await db.execute(
                "INSERT OR IGNORE INTO page_tags (page_id, tag_id) VALUES (?, ?)",
                (page_id, tag_row["id"]),
            )
    await db.commit()
    return await get_page(db, page_id)


async def delete_page(db: aiosqlite.Connection, page_id: int) -> bool:
    """Delete a page by ID. Returns True if deleted, False if not found."""
    cursor = await db.execute("DELETE FROM printable_pages WHERE id = ?", (page_id,))
    await db.commit()
    return cursor.rowcount > 0


# ---------------------------------------------------------------------------
# Interaction functions (US3)
# ---------------------------------------------------------------------------


async def record_interaction(db: aiosqlite.Connection, data: dict[str, Any]) -> dict[str, Any]:
    """Record an interaction. Returns the created interaction dict."""
    cursor = await db.execute(
        """
        INSERT INTO interactions (page_id, interaction_type, session_id)
        VALUES (?, ?, ?)
        """,
        (data["page_id"], data["interaction_type"], data.get("session_id")),
    )
    await db.commit()
    interaction_id = cursor.lastrowid
    async with db.execute(
        "SELECT * FROM interactions WHERE id = ?", (interaction_id,)
    ) as c:
        row = await c.fetchone()
    return {
        "id": row["id"],
        "page_id": row["page_id"],
        "interaction_type": row["interaction_type"],
        "session_id": row["session_id"],
        "created_at": row["created_at"],
    }


async def get_interactions(
    db: aiosqlite.Connection,
    session_id: str | None = None,
    page_id: int | None = None,
    interaction_type: str | None = None,
    skip: int = 0,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """Query interactions with optional filters."""
    conditions = []
    params: list[Any] = []
    if session_id is not None:
        conditions.append("session_id = ?")
        params.append(session_id)
    if page_id is not None:
        conditions.append("page_id = ?")
        params.append(page_id)
    if interaction_type is not None:
        conditions.append("interaction_type = ?")
        params.append(interaction_type)

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    params.extend([limit, skip])

    async with db.execute(
        f"SELECT * FROM interactions {where} ORDER BY created_at DESC LIMIT ? OFFSET ?",
        params,
    ) as cursor:
        rows = await cursor.fetchall()
    return [
        {
            "id": row["id"],
            "page_id": row["page_id"],
            "interaction_type": row["interaction_type"],
            "session_id": row["session_id"],
            "created_at": row["created_at"],
        }
        for row in rows
    ]
