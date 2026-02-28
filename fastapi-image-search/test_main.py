"""Tests for API endpoints using in-memory SQLite database."""

import os
import sqlite3
import tempfile
import unittest
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, patch

import aiosqlite
from fastapi.testclient import TestClient

import db as db_module
import main as main_module
from main import app
from printer.base import PrinterError, PrintResult


def _seed_test_db(db_path):
    """Create schema and insert minimal test data into the given DB file."""
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript(db_module.SCHEMA_SQL)

    # Collection with 1 child print
    conn.execute(
        "INSERT INTO printable_pages (id, url, thumbnail, type, source) "
        "VALUES (1, 'http://example.com/collection1', 'http://img/col1.webp', 'collection', 'krokotak')"
    )
    conn.execute(
        "INSERT INTO printable_pages (id, url, thumbnail, type, source, parent_id) "
        "VALUES (2, 'http://example.com/print1', 'http://img/p1.webp', 'print', 'krokotak', 1)"
    )
    # Standalone print
    conn.execute(
        "INSERT INTO printable_pages (id, url, thumbnail, type, source) "
        "VALUES (3, 'http://example.com/print2', 'http://img/p2.webp', 'print', 'krokotak')"
    )

    # Tags
    conn.execute("INSERT INTO tags (id, name) VALUES (1, 'animals')")
    conn.execute("INSERT INTO tags (id, name) VALUES (2, 'crafts')")

    # Tag associations
    conn.execute("INSERT INTO page_tags (page_id, tag_id, link) VALUES (1, 1, 'http://search/animals')")
    conn.execute("INSERT INTO page_tags (page_id, tag_id) VALUES (1, 2)")
    conn.execute("INSERT INTO page_tags (page_id, tag_id) VALUES (2, 1)")
    conn.execute("INSERT INTO page_tags (page_id, tag_id) VALUES (3, 2)")

    conn.commit()
    conn.close()


class DBTestCase(unittest.TestCase):
    """Base test case that patches get_db in main module to use a temp SQLite DB."""

    def setUp(self):
        # Create temp DB file with test data
        fd, self._tmp_path = tempfile.mkstemp(suffix=".db")
        os.close(fd)
        _seed_test_db(self._tmp_path)

        tmp_path = self._tmp_path

        @asynccontextmanager
        async def _test_get_db(db_path=None):
            db = await aiosqlite.connect(tmp_path)
            db.row_factory = aiosqlite.Row
            await db.execute("PRAGMA foreign_keys = ON")
            try:
                yield db
            finally:
                await db.close()

        # Patch get_db where it's used (in main module namespace)
        self._patcher = patch.object(main_module, "get_db", side_effect=_test_get_db)
        self._patcher.start()

        # Patch init_db to be a no-op (DB already seeded)
        self._init_patcher = patch.object(main_module, "init_db", new_callable=AsyncMock)
        self._init_patcher.start()

        self.client = TestClient(app)

    def tearDown(self):
        self._patcher.stop()
        self._init_patcher.stop()
        if os.path.exists(self._tmp_path):
            os.unlink(self._tmp_path)


class TestAPIItems(DBTestCase):
    """Test /api/items endpoint"""

    def test_get_items_returns_top_level_only(self):
        """Items endpoint returns only top-level items (no children)."""
        response = self.client.get("/api/items")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        # Should return collection(1) and standalone print(3), not child print(2)
        self.assertEqual(len(data), 2)
        ids = [item["id"] for item in data]
        self.assertIn(1, ids)
        self.assertIn(3, ids)
        self.assertNotIn(2, ids)

    def test_get_items_has_id_field(self):
        """Each item has an id field."""
        response = self.client.get("/api/items")
        data = response.json()
        for item in data:
            self.assertIn("id", item)
            self.assertIsInstance(item["id"], int)

    def test_get_items_has_searches(self):
        """Each item has a searches array with text entries."""
        response = self.client.get("/api/items")
        data = response.json()
        for item in data:
            self.assertIn("searches", item)
            self.assertIsInstance(item["searches"], list)
            for s in item["searches"]:
                self.assertIn("text", s)

    def test_get_items_pagination(self):
        """Pagination via skip and limit works."""
        response = self.client.get("/api/items?skip=0&limit=1")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)

        response2 = self.client.get("/api/items?skip=1&limit=1")
        data2 = response2.json()
        self.assertEqual(len(data2), 1)
        self.assertNotEqual(data[0]["id"], data2[0]["id"])


class TestAPISearch(DBTestCase):
    """Test /api/search endpoint"""

    def test_search_empty_query_returns_items(self):
        """Empty query returns all top-level items."""
        response = self.client.get("/api/search?q=")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 2)

    def test_search_matching_tag(self):
        """Search by tag name returns matching items."""
        response = self.client.get("/api/search?q=animals")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreaterEqual(len(data), 1)
        ids = [item["id"] for item in data]
        self.assertIn(1, ids)

    def test_search_no_match(self):
        """Search with non-matching query returns empty."""
        response = self.client.get("/api/search?q=zzzznonexistent")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 0)


class TestAPIRelated(DBTestCase):
    """Test /api/related/{item_id} endpoint"""

    def test_related_collection_returns_children(self):
        """Related for a collection returns its child prints."""
        response = self.client.get("/api/related/1")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["id"], 2)

    def test_related_invalid_id(self):
        """Related for nonexistent id returns empty list."""
        response = self.client.get("/api/related/999999")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data, [])

    def test_related_with_session_id_records_view(self):
        """Passing session_id records a view interaction."""
        response = self.client.get("/api/related/1?session_id=test-session")
        self.assertEqual(response.status_code, 200)
        # Verify the interaction was recorded
        resp2 = self.client.get("/api/interactions?session_id=test-session")
        interactions = resp2.json()
        self.assertGreaterEqual(len(interactions), 1)
        self.assertEqual(interactions[0]["interaction_type"], "view")


class TestAPITags(DBTestCase):
    """Test /api/tags endpoint"""

    def test_get_tags_returns_sorted(self):
        """Tags are returned sorted alphabetically."""
        response = self.client.get("/api/tags")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data, sorted(data))
        self.assertIn("animals", data)
        self.assertIn("crafts", data)

    def test_get_tags_with_limit(self):
        """Limit parameter works."""
        response = self.client.get("/api/tags?limit=1")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)


class TestCRUD(DBTestCase):
    """Test CRUD endpoints for /api/pages"""

    def test_create_page(self):
        """POST /api/pages creates a new page."""
        response = self.client.post(
            "/api/pages",
            json={
                "url": "http://example.com/new-page",
                "thumbnail": "http://img/new.webp",
                "type": "print",
                "tags": ["new-tag"],
            },
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["url"], "http://example.com/new-page")
        self.assertIn("id", data)

    def test_create_page_appears_in_items(self):
        """Created page shows up in /api/items."""
        self.client.post(
            "/api/pages",
            json={
                "url": "http://example.com/visible-page",
                "thumbnail": "http://img/vis.webp",
            },
        )
        response = self.client.get("/api/items?limit=100")
        data = response.json()
        urls = [item["url"] for item in data]
        self.assertIn("http://example.com/visible-page", urls)

    def test_create_duplicate_url_returns_409(self):
        """Duplicate URL returns 409."""
        response = self.client.post(
            "/api/pages",
            json={
                "url": "http://example.com/collection1",
                "thumbnail": "http://img/dup.webp",
            },
        )
        self.assertEqual(response.status_code, 409)

    def test_update_page(self):
        """PUT /api/pages/{id} updates fields."""
        response = self.client.put(
            "/api/pages/3",
            json={"tags": ["updated-tag"]},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        tag_texts = [s["text"] for s in data["searches"]]
        self.assertIn("updated-tag", tag_texts)

    def test_update_nonexistent_returns_404(self):
        """PUT to nonexistent page returns 404."""
        response = self.client.put(
            "/api/pages/999999",
            json={"url": "http://nope"},
        )
        self.assertEqual(response.status_code, 404)

    def test_delete_page(self):
        """DELETE /api/pages/{id} removes page."""
        response = self.client.delete("/api/pages/3")
        self.assertEqual(response.status_code, 204)

        # Verify it's gone
        response2 = self.client.get("/api/items?limit=100")
        ids = [item["id"] for item in response2.json()]
        self.assertNotIn(3, ids)

    def test_delete_nonexistent_returns_404(self):
        """DELETE nonexistent page returns 404."""
        response = self.client.delete("/api/pages/999999")
        self.assertEqual(response.status_code, 404)


class TestInteractions(DBTestCase):
    """Test interaction tracking endpoints"""

    def test_create_select_interaction(self):
        """POST /api/interactions records a select interaction."""
        response = self.client.post(
            "/api/interactions",
            json={
                "page_id": 1,
                "interaction_type": "select",
                "session_id": "sess-1",
            },
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["interaction_type"], "select")
        self.assertEqual(data["session_id"], "sess-1")

    def test_create_print_interaction(self):
        """POST /api/interactions records a print interaction."""
        response = self.client.post(
            "/api/interactions",
            json={"page_id": 3, "interaction_type": "print"},
        )
        self.assertEqual(response.status_code, 201)

    def test_invalid_interaction_type(self):
        """Invalid interaction_type returns 400."""
        response = self.client.post(
            "/api/interactions",
            json={"page_id": 1, "interaction_type": "invalid"},
        )
        self.assertEqual(response.status_code, 400)

    def test_nonexistent_page_returns_400(self):
        """Interaction with nonexistent page_id returns 400."""
        response = self.client.post(
            "/api/interactions",
            json={"page_id": 999999, "interaction_type": "select"},
        )
        self.assertEqual(response.status_code, 400)

    def test_get_interactions_filtered(self):
        """GET /api/interactions supports filtering."""
        # Create interactions
        self.client.post(
            "/api/interactions",
            json={"page_id": 1, "interaction_type": "select", "session_id": "s1"},
        )
        self.client.post(
            "/api/interactions",
            json={"page_id": 3, "interaction_type": "print", "session_id": "s1"},
        )

        # Filter by session
        response = self.client.get("/api/interactions?session_id=s1")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 2)

        # Filter by type
        response2 = self.client.get("/api/interactions?interaction_type=select")
        data2 = response2.json()
        self.assertTrue(all(i["interaction_type"] == "select" for i in data2))


class TestAPIPrintImage(DBTestCase):
    """Test /api/print-image endpoint"""

    @patch("main.fetch_krokotak_page")
    @patch("main.printer_service")
    @patch("main.convert_to_png")
    def test_print_image_success(self, mock_convert, mock_printer, mock_fetch):
        """Print request succeeds and returns status."""
        mock_fetch.return_value = "data:image/webp;base64,UklGRhhFAQBXRUJQVlA4IAxFAQCwWQWdASraBNsGPm02l0kkIqIhIhIJ"
        mock_convert.return_value = b"\x89PNG\r\n\x1a\nfake_png"
        mock_printer.print_image = AsyncMock(
            return_value=PrintResult(status="sent_to_printer", message="Image sent to printer")
        )

        response = self.client.get("/api/print-image?url=https://example.com/print?id=test")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "sent_to_printer")
        mock_printer.print_image.assert_called_once_with(b"\x89PNG\r\n\x1a\nfake_png")

    @patch("main.fetch_krokotak_page")
    @patch("main.printer_service")
    @patch("main.convert_to_png")
    def test_print_image_error(self, mock_convert, mock_printer, mock_fetch):
        """Printer error returns 500."""
        mock_fetch.return_value = "data:image/webp;base64,UklGRhhFAQBXRUJQVlA4IAxFAQCwWQWdASraBNsGPm02l0kkIqIhIhIJ"
        mock_convert.return_value = b"\x89PNG\r\n\x1a\nfake_png"
        mock_printer.print_image = AsyncMock(side_effect=PrinterError("Connection refused"))

        response = self.client.get("/api/print-image?url=https://example.com/print?id=test")
        self.assertEqual(response.status_code, 500)


if __name__ == "__main__":
    unittest.main()
