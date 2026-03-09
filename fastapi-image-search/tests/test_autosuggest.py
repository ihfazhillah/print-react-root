"""Tests for GET /api/tags autosuggest extensions (011-search-autosuggest)."""

import asyncio
import importlib
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi.testclient import TestClient

import db as db_module


def _make_test_app(db_path: str):
    db_module.DB_PATH = db_path
    asyncio.run(db_module.init_db(db_path))
    import main as main_module
    importlib.reload(main_module)
    return main_module.app


def _seed(db_path: str):
    async def _run():
        async with db_module.get_db(db_path) as conn:
            conn.row_factory = aiosqlite.Row

            # Insert pages and capture IDs
            await conn.execute(
                "INSERT INTO printable_pages (url, thumbnail, type, source) VALUES ('u_cat', '', 'print', 'test')"
            )
            async with conn.execute("SELECT last_insert_rowid()") as c:
                page_cat_id = (await c.fetchone())[0]

            await conn.execute(
                "INSERT INTO printable_pages (url, thumbnail, type, source) VALUES ('u_dino', '', 'print', 'test')"
            )
            async with conn.execute("SELECT last_insert_rowid()") as c:
                page_dino_id = (await c.fetchone())[0]

            # Tags
            await conn.execute("INSERT INTO tags (name, id_translation, blocked) VALUES ('cat', 'kucing', 0)")
            async with conn.execute("SELECT last_insert_rowid()") as c:
                tag_cat_id = (await c.fetchone())[0]

            await conn.execute("INSERT INTO tags (name, id_translation, blocked) VALUES ('dog', 'anjing', 0)")
            await conn.execute("INSERT INTO tags (name, id_translation, blocked) VALUES ('dinosaur', 'dinosaurus', 0)")
            async with conn.execute("SELECT last_insert_rowid()") as c:
                tag_dino_id = (await c.fetchone())[0]

            await conn.execute("INSERT INTO tags (name, id_translation, blocked) VALUES ('dingo', 'dingo', 0)")
            await conn.execute("INSERT INTO tags (name, id_translation, blocked) VALUES ('blocked-tag', 'terblokir', 1)")
            await conn.commit()

            # page_tags
            await conn.execute(
                "INSERT INTO page_tags (page_id, tag_id, link) VALUES (?, ?, '')",
                (page_cat_id, tag_cat_id)
            )
            await conn.execute(
                "INSERT INTO page_tags (page_id, tag_id, link) VALUES (?, ?, '')",
                (page_dino_id, tag_dino_id)
            )
            await conn.commit()

            # Device + activity events: dinosaur 3 prints, cat 1 print
            await conn.execute(
                "INSERT INTO devices (id, device_name, device_token, registered_at) VALUES ('d1', 'Test', 'tok1', '2026-01-01')"
            )
            await conn.commit()

            for _ in range(3):
                await conn.execute(
                    "INSERT INTO activity_events (device_id, event_type, image_id, event_timestamp) "
                    "VALUES ('d1', 'print', ?, '2026-01-01T00:00:00Z')",
                    (page_dino_id,)
                )
            await conn.execute(
                "INSERT INTO activity_events (device_id, event_type, image_id, event_timestamp) "
                "VALUES ('d1', 'print', ?, '2026-01-01T00:00:00Z')",
                (page_cat_id,)
            )
            await conn.commit()

    import aiosqlite
    asyncio.run(_run())


import aiosqlite


class TestGetTagsPrefixFilter(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self.db_path = self.tmp.name
        app = _make_test_app(self.db_path)
        _seed(self.db_path)
        self.client = TestClient(app)

    def test_prefix_filter_returns_matching_tags(self):
        resp = self.client.get("/api/tags?q=di&limit=10")
        self.assertEqual(resp.status_code, 200)
        names = [t["name"] for t in resp.json()]
        self.assertIn("dinosaur", names)
        self.assertIn("dingo", names)
        self.assertNotIn("cat", names)
        self.assertNotIn("dog", names)

    def test_prefix_filter_no_match_returns_empty(self):
        resp = self.client.get("/api/tags?q=zzz&limit=10")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), [])

    def test_prefix_filter_case_insensitive(self):
        resp = self.client.get("/api/tags?q=DI&limit=10")
        self.assertEqual(resp.status_code, 200)
        names = [t["name"] for t in resp.json()]
        self.assertIn("dinosaur", names)

    def test_blocked_tags_excluded_from_prefix_results(self):
        resp = self.client.get("/api/tags?q=blocked&limit=10")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), [])

    def test_invalid_order_by_returns_400(self):
        resp = self.client.get("/api/tags?order_by=invalid")
        self.assertEqual(resp.status_code, 400)


class TestGetTagsPopularityOrdering(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self.db_path = self.tmp.name
        app = _make_test_app(self.db_path)
        _seed(self.db_path)
        self.client = TestClient(app)

    def test_popularity_order_most_printed_first(self):
        resp = self.client.get("/api/tags?order_by=popularity&limit=10")
        self.assertEqual(resp.status_code, 200)
        names = [t["name"] for t in resp.json()]
        self.assertIn("dinosaur", names)
        self.assertIn("cat", names)
        # dinosaur has 3 prints, cat has 1 — dinosaur must rank higher
        self.assertLess(names.index("dinosaur"), names.index("cat"))

    def test_popularity_excludes_blocked(self):
        resp = self.client.get("/api/tags?order_by=popularity&limit=10")
        self.assertEqual(resp.status_code, 200)
        names = [t["name"] for t in resp.json()]
        self.assertNotIn("blocked-tag", names)

    def test_response_has_name_and_translation_no_id(self):
        resp = self.client.get("/api/tags?order_by=popularity&limit=5")
        self.assertEqual(resp.status_code, 200)
        for tag in resp.json():
            self.assertIn("name", tag)
            self.assertIn("id_translation", tag)
            self.assertNotIn("id", tag)


if __name__ == "__main__":
    unittest.main()
