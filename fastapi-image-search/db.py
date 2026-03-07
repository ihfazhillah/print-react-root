"""Database connection, schema initialization, and query helpers for printable pages."""

import os
import secrets
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
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
    name TEXT NOT NULL UNIQUE,
    id_translation TEXT NOT NULL DEFAULT ''
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

CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    device_name TEXT NOT NULL CHECK(LENGTH(device_name) > 0 AND LENGTH(device_name) <= 50),
    device_token TEXT NOT NULL UNIQUE,
    registered_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_activity_at TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    is_admin INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_devices_token ON devices(device_token);
CREATE INDEX IF NOT EXISTS idx_devices_active ON devices(is_active);

CREATE TABLE IF NOT EXISTS activity_events (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL REFERENCES devices(id),
    event_type TEXT NOT NULL CHECK(event_type IN ('view', 'detail', 'print')),
    image_id TEXT,
    event_timestamp TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_activity_device ON activity_events(device_id);
CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_events(event_type);
CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity_events(event_timestamp);
"""


async def init_db(db_path: str | None = None) -> None:
    """Create all tables and indexes if they don't exist."""
    path = db_path or DB_PATH
    async with aiosqlite.connect(path) as db:
        await db.execute("PRAGMA foreign_keys = ON")
        await db.executescript(SCHEMA_SQL)
        # Migration: add is_admin column to existing devices table
        try:
            await db.execute(
                "ALTER TABLE devices ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0"
            )
        except aiosqlite.OperationalError:
            pass  # Column already exists

        # Migration: add id_translation column to existing tags table
        try:
            await db.execute(
                "ALTER TABLE tags ADD COLUMN id_translation TEXT NOT NULL DEFAULT ''"
            )
        except aiosqlite.OperationalError:
            pass  # Column already exists
        await db.execute(
            "CREATE INDEX IF NOT EXISTS idx_tags_id_translation ON tags(id_translation)"
        )
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
            OR LOWER(t.id_translation) LIKE LOWER(?)
            OR p.id IN (
              SELECT child.parent_id FROM printable_pages child
              JOIN page_tags cpt ON cpt.page_id = child.id
              JOIN tags ct ON ct.id = cpt.tag_id
              WHERE child.parent_id IS NOT NULL
                AND (LOWER(ct.name) LIKE LOWER(?)
                     OR LOWER(ct.id_translation) LIKE LOWER(?))
            )
          )
        ORDER BY p.id
        LIMIT ? OFFSET ?
        """,
        (like_pattern, like_pattern, like_pattern, like_pattern, limit, skip),
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


async def get_tags(db: aiosqlite.Connection, limit: int) -> list[dict[str, Any]]:
    """Return sorted unique tags with id and translation."""
    async with db.execute(
        "SELECT id, name, id_translation FROM tags ORDER BY name LIMIT ?", (limit,)
    ) as cursor:
        rows = await cursor.fetchall()
    return [
        {"id": row["id"], "name": row["name"], "id_translation": row["id_translation"]}
        for row in rows
    ]


# ---------------------------------------------------------------------------
# Tag CRUD functions
# ---------------------------------------------------------------------------


async def get_all_tags(
    db: aiosqlite.Connection, skip: int = 0, limit: int = 50
) -> list[dict[str, Any]]:
    """Return paginated tags with id, name, and id_translation."""
    async with db.execute(
        "SELECT id, name, id_translation FROM tags ORDER BY name LIMIT ? OFFSET ?",
        (limit, skip),
    ) as cursor:
        rows = await cursor.fetchall()
    return [
        {"id": row["id"], "name": row["name"], "id_translation": row["id_translation"]}
        for row in rows
    ]


async def get_tag(db: aiosqlite.Connection, tag_id: int) -> dict[str, Any] | None:
    """Get a single tag by ID."""
    async with db.execute(
        "SELECT id, name, id_translation FROM tags WHERE id = ?", (tag_id,)
    ) as cursor:
        row = await cursor.fetchone()
    if row is None:
        return None
    return {"id": row["id"], "name": row["name"], "id_translation": row["id_translation"]}


async def create_tag(db: aiosqlite.Connection, data: dict[str, Any]) -> dict[str, Any]:
    """Insert a new tag. Returns the created tag dict."""
    cursor = await db.execute(
        "INSERT INTO tags (name, id_translation) VALUES (?, ?)",
        (data["name"], data.get("id_translation", "")),
    )
    await db.commit()
    tag_id = cursor.lastrowid
    return await get_tag(db, tag_id)


async def update_tag(
    db: aiosqlite.Connection, tag_id: int, data: dict[str, Any]
) -> dict[str, Any] | None:
    """Update an existing tag. Returns updated tag dict or None if not found."""
    existing = await get_tag(db, tag_id)
    if existing is None:
        return None
    updates = []
    params: list[Any] = []
    for field in ("name", "id_translation"):
        if field in data:
            updates.append(f"{field} = ?")
            params.append(data[field])
    if updates:
        params.append(tag_id)
        await db.execute(
            f"UPDATE tags SET {', '.join(updates)} WHERE id = ?", params
        )
        await db.commit()
    return await get_tag(db, tag_id)


async def delete_tag(db: aiosqlite.Connection, tag_id: int) -> bool:
    """Delete a tag by ID. CASCADE handles page_tags cleanup. Returns True if deleted."""
    cursor = await db.execute("DELETE FROM tags WHERE id = ?", (tag_id,))
    await db.commit()
    return cursor.rowcount > 0


async def bulk_translate_tags(db: aiosqlite.Connection) -> dict[str, Any]:
    """Translate all tags with empty id_translation from English to Indonesian.

    Returns a summary dict with translated, skipped, failed counts and error details.
    """
    from deep_translator import GoogleTranslator

    # Fetch untranslated tags
    async with db.execute(
        "SELECT id, name FROM tags WHERE id_translation = '' ORDER BY id"
    ) as cursor:
        untranslated = await cursor.fetchall()

    # Count already-translated tags
    async with db.execute(
        "SELECT COUNT(*) as cnt FROM tags WHERE id_translation != ''"
    ) as cursor:
        row = await cursor.fetchone()
        skipped = row["cnt"]

    if not untranslated:
        return {"translated": 0, "skipped": skipped, "failed": 0, "errors": []}

    translator = GoogleTranslator(source="en", target="id")
    translated = 0
    failed = 0
    errors: list[dict[str, Any]] = []

    for tag_row in untranslated:
        try:
            result = translator.translate(tag_row["name"])
            await db.execute(
                "UPDATE tags SET id_translation = ? WHERE id = ?",
                (result, tag_row["id"]),
            )
            translated += 1
        except Exception as e:
            failed += 1
            errors.append(
                {"tag_id": tag_row["id"], "name": tag_row["name"], "error": str(e)}
            )

    await db.commit()
    return {
        "translated": translated,
        "skipped": skipped,
        "failed": failed,
        "errors": errors,
    }


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


# ---------------------------------------------------------------------------
# Device management functions
# ---------------------------------------------------------------------------


def _utcnow() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


async def register_device(db: aiosqlite.Connection, initial_name: str) -> dict[str, Any]:
    """Register a new device. Returns device_id, device_token, device_name, registered_at."""
    device_id = str(uuid.uuid4())
    device_token = secrets.token_hex(32)
    registered_at = _utcnow()
    await db.execute(
        "INSERT INTO devices (id, device_name, device_token, registered_at) VALUES (?, ?, ?, ?)",
        (device_id, initial_name, device_token, registered_at),
    )
    await db.commit()
    return {
        "device_id": device_id,
        "device_token": device_token,
        "device_name": initial_name,
        "registered_at": registered_at,
    }


async def get_device_by_token(
    db: aiosqlite.Connection, token: str
) -> dict[str, Any] | None:
    """Look up an active device by its token. Returns device dict or None."""
    async with db.execute(
        "SELECT * FROM devices WHERE device_token = ? AND is_active = 1", (token,)
    ) as cursor:
        row = await cursor.fetchone()
    if row is None:
        return None
    return {
        "device_id": row["id"],
        "device_name": row["device_name"],
        "device_token": row["device_token"],
        "registered_at": row["registered_at"],
        "last_activity_at": row["last_activity_at"],
        "is_active": bool(row["is_active"]),
    }


async def update_device_name(
    db: aiosqlite.Connection, device_id: str, name: str
) -> dict[str, Any] | None:
    """Update device name. Returns updated device dict or None if not found."""
    updated_at = _utcnow()
    cursor = await db.execute(
        "UPDATE devices SET device_name = ?, last_activity_at = ? WHERE id = ? AND is_active = 1",
        (name, updated_at, device_id),
    )
    await db.commit()
    if cursor.rowcount == 0:
        return None
    return {"device_id": device_id, "device_name": name, "updated_at": updated_at}


async def record_activity_event(
    db: aiosqlite.Connection, device_id: str, data: dict[str, Any]
) -> dict[str, Any]:
    """Record an activity event for a device. Returns event_id and status."""
    event_id = str(uuid.uuid4())
    now = _utcnow()
    await db.execute(
        "INSERT INTO activity_events (id, device_id, event_type, image_id, event_timestamp) VALUES (?, ?, ?, ?, ?)",
        (event_id, device_id, data["event_type"], data.get("image_id"), data.get("timestamp") or now),
    )
    await db.execute(
        "UPDATE devices SET last_activity_at = ? WHERE id = ?", (now, device_id)
    )
    await db.commit()
    return {"event_id": event_id, "status": "recorded"}


async def get_all_devices(
    db: aiosqlite.Connection, include_inactive: bool = False
) -> list[dict[str, Any]]:
    """Return all devices (active only by default)."""
    where = "" if include_inactive else "WHERE is_active = 1"
    async with db.execute(
        f"SELECT * FROM devices {where} ORDER BY registered_at DESC"
    ) as cursor:
        rows = await cursor.fetchall()
    return [
        {
            "device_id": row["id"],
            "device_name": row["device_name"],
            "registered_at": row["registered_at"],
            "last_activity_at": row["last_activity_at"],
            "is_active": bool(row["is_active"]),
            "is_admin": bool(row["is_admin"]),
        }
        for row in rows
    ]


async def set_device_admin(
    db: aiosqlite.Connection, device_id: str, is_admin: bool
) -> dict[str, Any] | None:
    """Set the is_admin flag on a device. Returns updated device dict or None."""
    cursor = await db.execute(
        "UPDATE devices SET is_admin = ? WHERE id = ?",
        (1 if is_admin else 0, device_id),
    )
    await db.commit()
    if cursor.rowcount == 0:
        return None
    async with db.execute("SELECT * FROM devices WHERE id = ?", (device_id,)) as c:
        row = await c.fetchone()
    return {
        "device_id": row["id"],
        "device_name": row["device_name"],
        "is_admin": bool(row["is_admin"]),
    }


async def deactivate_device(db: aiosqlite.Connection, device_id: str) -> bool:
    """Soft-delete a device. Returns True if found and deactivated."""
    cursor = await db.execute(
        "UPDATE devices SET is_active = 0 WHERE id = ? AND is_active = 1", (device_id,)
    )
    await db.commit()
    return cursor.rowcount > 0


# ---------------------------------------------------------------------------
# Analytics query functions (007-usage-insights)
# ---------------------------------------------------------------------------

_NON_ADMIN_FILTER = "device_id NOT IN (SELECT id FROM devices WHERE is_admin = 1)"


async def get_usage_summary(db: aiosqlite.Connection) -> list[dict[str, Any]]:
    """Per-device usage stats (views, details, prints), excluding admin devices."""
    async with db.execute(
        f"""
        SELECT
            d.id AS device_id,
            d.device_name,
            d.is_active,
            COALESCE(SUM(CASE WHEN ae.event_type = 'view' THEN 1 ELSE 0 END), 0) AS total_views,
            COALESCE(SUM(CASE WHEN ae.event_type = 'detail' THEN 1 ELSE 0 END), 0) AS total_details,
            COALESCE(SUM(CASE WHEN ae.event_type = 'print' THEN 1 ELSE 0 END), 0) AS total_prints
        FROM devices d
        LEFT JOIN activity_events ae ON ae.device_id = d.id
        WHERE d.is_admin = 0
        GROUP BY d.id
        ORDER BY total_prints DESC
        """
    ) as cursor:
        rows = await cursor.fetchall()
    return [
        {
            "device_id": row["device_id"],
            "device_name": row["device_name"],
            "is_active": bool(row["is_active"]),
            "total_views": row["total_views"],
            "total_details": row["total_details"],
            "total_prints": row["total_prints"],
        }
        for row in rows
    ]


async def get_top_tags_per_device(
    db: aiosqlite.Connection, limit: int = 5
) -> list[dict[str, Any]]:
    """Top printed tags per non-admin device, ranked by print count."""
    async with db.execute(
        f"""
        SELECT
            d.id AS device_id,
            d.device_name,
            t.id AS tag_id,
            t.name AS tag_name,
            t.id_translation,
            COUNT(*) AS print_count
        FROM activity_events ae
        JOIN devices d ON d.id = ae.device_id
        JOIN printable_pages pp ON pp.id = CAST(ae.image_id AS INTEGER)
        JOIN page_tags pt ON pt.page_id = pp.id
        JOIN tags t ON t.id = pt.tag_id
        WHERE ae.event_type = 'print'
          AND {_NON_ADMIN_FILTER}
        GROUP BY d.id, t.id
        ORDER BY d.device_name, print_count DESC
        """
    ) as cursor:
        rows = await cursor.fetchall()

    # Group by device with limit
    devices: dict[str, dict[str, Any]] = {}
    for row in rows:
        did = row["device_id"]
        if did not in devices:
            devices[did] = {
                "device_id": did,
                "device_name": row["device_name"],
                "top_tags": [],
            }
        if len(devices[did]["top_tags"]) < limit:
            devices[did]["top_tags"].append({
                "tag_id": row["tag_id"],
                "tag_name": row["tag_name"],
                "id_translation": row["id_translation"],
                "print_count": row["print_count"],
            })
    return list(devices.values())


async def get_top_images(
    db: aiosqlite.Connection, limit: int = 10
) -> dict[str, Any]:
    """Most printed images overall and per non-admin device."""
    # Overall
    async with db.execute(
        f"""
        SELECT
            CAST(ae.image_id AS INTEGER) AS image_id,
            pp.thumbnail,
            pp.url,
            COUNT(*) AS print_count
        FROM activity_events ae
        JOIN printable_pages pp ON pp.id = CAST(ae.image_id AS INTEGER)
        WHERE ae.event_type = 'print'
          AND {_NON_ADMIN_FILTER}
        GROUP BY ae.image_id
        ORDER BY print_count DESC
        LIMIT ?
        """,
        (limit,),
    ) as cursor:
        overall_rows = await cursor.fetchall()

    async def _image_tags(db: aiosqlite.Connection, image_id: int) -> list[str]:
        async with db.execute(
            "SELECT t.name FROM page_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.page_id = ?",
            (image_id,),
        ) as c:
            return [r["name"] for r in await c.fetchall()]

    overall = []
    for row in overall_rows:
        tags = await _image_tags(db, row["image_id"])
        overall.append({
            "image_id": row["image_id"],
            "thumbnail": row["thumbnail"],
            "url": row["url"],
            "print_count": row["print_count"],
            "tags": tags,
        })

    # Per device
    async with db.execute(
        f"""
        SELECT
            d.id AS device_id,
            d.device_name,
            CAST(ae.image_id AS INTEGER) AS image_id,
            pp.thumbnail,
            pp.url,
            COUNT(*) AS print_count
        FROM activity_events ae
        JOIN devices d ON d.id = ae.device_id
        JOIN printable_pages pp ON pp.id = CAST(ae.image_id AS INTEGER)
        WHERE ae.event_type = 'print'
          AND {_NON_ADMIN_FILTER}
        GROUP BY d.id, ae.image_id
        ORDER BY d.device_name, print_count DESC
        """
    ) as cursor:
        per_device_rows = await cursor.fetchall()

    per_device: dict[str, dict[str, Any]] = {}
    for row in per_device_rows:
        did = row["device_id"]
        if did not in per_device:
            per_device[did] = {
                "device_id": did,
                "device_name": row["device_name"],
                "top_images": [],
            }
        if len(per_device[did]["top_images"]) < limit:
            tags = await _image_tags(db, row["image_id"])
            per_device[did]["top_images"].append({
                "image_id": row["image_id"],
                "thumbnail": row["thumbnail"],
                "url": row["url"],
                "print_count": row["print_count"],
                "tags": tags,
            })

    return {"overall": overall, "per_device": list(per_device.values())}


async def get_shared_unique_interests(db: aiosqlite.Connection) -> dict[str, Any]:
    """Shared and unique tag preferences across non-admin devices (top 5 tags each)."""
    per_device = await get_top_tags_per_device(db, limit=5)

    # Build tag → set of device names
    tag_devices: dict[str, set[str]] = {}
    for d in per_device:
        for tag in d["top_tags"]:
            tag_devices.setdefault(tag["tag_name"], set()).add(d["device_name"])

    shared = [
        {"tag_name": tag, "devices": sorted(devs)}
        for tag, devs in tag_devices.items()
        if len(devs) > 1
    ]

    unique: dict[str, list[str]] = {}
    for tag, devs in tag_devices.items():
        if len(devs) == 1:
            name = next(iter(devs))
            unique.setdefault(name, []).append(tag)

    return {
        "shared": sorted(shared, key=lambda x: len(x["devices"]), reverse=True),
        "unique": [
            {"device_name": name, "tags": tags}
            for name, tags in sorted(unique.items())
        ],
    }


async def get_recommendations(
    db: aiosqlite.Connection, device_id: str, limit: int = 20
) -> list[dict[str, Any]]:
    """Images from device's top tags that the device hasn't printed, randomized."""
    # Check minimum prints
    async with db.execute(
        "SELECT COUNT(*) AS cnt FROM activity_events WHERE device_id = ? AND event_type = 'print'",
        (device_id,),
    ) as cursor:
        row = await cursor.fetchone()
        if row["cnt"] < 2:
            return []

    # Get device's top 5 tags by print count
    async with db.execute(
        """
        SELECT t.id AS tag_id
        FROM activity_events ae
        JOIN printable_pages pp ON pp.id = CAST(ae.image_id AS INTEGER)
        JOIN page_tags pt ON pt.page_id = pp.id
        JOIN tags t ON t.id = pt.tag_id
        WHERE ae.device_id = ? AND ae.event_type = 'print'
        GROUP BY t.id
        ORDER BY COUNT(*) DESC
        LIMIT 5
        """,
        (device_id,),
    ) as cursor:
        top_tag_ids = [r["tag_id"] for r in await cursor.fetchall()]

    if not top_tag_ids:
        return []

    # Get printed image IDs for this device
    async with db.execute(
        "SELECT DISTINCT CAST(image_id AS INTEGER) AS iid FROM activity_events WHERE device_id = ? AND event_type = 'print'",
        (device_id,),
    ) as cursor:
        printed_ids = {r["iid"] for r in await cursor.fetchall()}

    placeholders = ",".join("?" * len(top_tag_ids))
    async with db.execute(
        f"""
        SELECT DISTINCT pp.*
        FROM printable_pages pp
        JOIN page_tags pt ON pt.page_id = pp.id
        WHERE pt.tag_id IN ({placeholders})
          AND pp.parent_id IS NULL
          AND pp.id NOT IN ({",".join("?" * len(printed_ids)) if printed_ids else "NULL"})
        ORDER BY RANDOM()
        LIMIT ?
        """,
        (*top_tag_ids, *printed_ids, limit),
    ) as cursor:
        rows = await cursor.fetchall()

    return [await _build_item_dict(db, r) for r in rows]


async def get_device_timeline(
    db: aiosqlite.Connection,
    device_id: str,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    """Activity timeline for a device, grouped by date, reverse chronological."""
    # Get device name
    async with db.execute(
        "SELECT device_name FROM devices WHERE id = ?", (device_id,)
    ) as cursor:
        dev = await cursor.fetchone()
    if dev is None:
        return {"device_name": None, "events": []}

    async with db.execute(
        """
        SELECT
            ae.event_type,
            CAST(ae.image_id AS INTEGER) AS image_id,
            pp.thumbnail,
            ae.event_timestamp,
            DATE(ae.event_timestamp) AS event_date
        FROM activity_events ae
        LEFT JOIN printable_pages pp ON pp.id = CAST(ae.image_id AS INTEGER)
        WHERE ae.device_id = ?
        ORDER BY ae.event_timestamp DESC
        LIMIT ? OFFSET ?
        """,
        (device_id, limit, offset),
    ) as cursor:
        rows = await cursor.fetchall()

    # Group by date
    grouped: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        date = row["event_date"] or "unknown"
        grouped.setdefault(date, []).append({
            "event_type": row["event_type"],
            "image_id": row["image_id"],
            "thumbnail": row["thumbnail"],
            "timestamp": row["event_timestamp"],
        })

    return {
        "device_name": dev["device_name"],
        "events": [
            {"date": date, "items": items}
            for date, items in grouped.items()
        ],
    }
