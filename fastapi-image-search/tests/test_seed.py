"""Tests for seed.py: idempotent seeding, malformed entry handling, parent_id relationships."""

import json
import os
import sqlite3
import tempfile
import unittest

from seed import seed


class TestSeed(unittest.TestCase):
    """Test seed script behavior."""

    def setUp(self):
        # Create temp DB
        fd, self.db_path = tempfile.mkstemp(suffix=".db")
        os.close(fd)

        # Create temp data file with known entries
        self.data = [
            {
                "url": "http://example.com/col1",
                "thumbnail": "http://img/col1.webp",
                "type": "collection",
                "searches": [
                    {"text": "animals", "link": "http://search/animals"},
                    {"text": "crafts"},
                ],
                "prints": [
                    {
                        "url": "http://example.com/print1",
                        "thumbnail": "http://img/p1.webp",
                        "type": "print",
                        "searches": [{"text": "animals"}],
                    },
                    {
                        "url": "http://example.com/print2",
                        "thumbnail": "http://img/p2.webp",
                        "type": "print",
                        "searches": [{"text": "crafts"}],
                    },
                ],
            },
            {
                "url": "http://example.com/standalone",
                "thumbnail": "http://img/standalone.webp",
                "type": "print",
                "searches": [{"text": "fun"}],
            },
        ]

        fd, self.data_path = tempfile.mkstemp(suffix=".json")
        os.close(fd)
        with open(self.data_path, "w") as f:
            json.dump(self.data, f)

    def tearDown(self):
        os.unlink(self.db_path)
        os.unlink(self.data_path)

    def test_seed_imports_all_entries(self):
        """Seed imports all pages (collections + nested prints + standalone)."""
        stats = seed(self.data_path, self.db_path)
        # 1 collection + 2 child prints + 1 standalone = 4 total imported
        self.assertEqual(stats["imported"], 4)
        self.assertEqual(stats["collections"], 1)
        self.assertEqual(stats["prints"], 3)
        self.assertEqual(stats["skipped"], 0)

    def test_seed_creates_tags(self):
        """Seed creates unique tags from searches."""
        stats = seed(self.data_path, self.db_path)
        self.assertEqual(stats["tags_created"], 3)  # animals, crafts, fun

        conn = sqlite3.connect(self.db_path)
        tags = [r[0] for r in conn.execute("SELECT name FROM tags ORDER BY name").fetchall()]
        conn.close()
        self.assertEqual(tags, ["animals", "crafts", "fun"])

    def test_seed_is_idempotent(self):
        """Running seed twice doesn't create duplicates."""
        stats1 = seed(self.data_path, self.db_path)

        conn = sqlite3.connect(self.db_path)
        count_after_first = conn.execute("SELECT COUNT(*) FROM printable_pages").fetchone()[0]
        conn.close()

        stats2 = seed(self.data_path, self.db_path)

        self.assertEqual(stats2["tags_created"], 0)

        # Verify total count unchanged — no duplicates created
        conn = sqlite3.connect(self.db_path)
        count_after_second = conn.execute("SELECT COUNT(*) FROM printable_pages").fetchone()[0]
        conn.close()
        self.assertEqual(count_after_first, count_after_second)

    def test_seed_parent_id_relationships(self):
        """Collection prints have correct parent_id."""
        seed(self.data_path, self.db_path)

        conn = sqlite3.connect(self.db_path)
        # Get collection id
        col = conn.execute(
            "SELECT id FROM printable_pages WHERE url = 'http://example.com/col1'"
        ).fetchone()
        col_id = col[0]

        # Check children have correct parent_id
        children = conn.execute(
            "SELECT url FROM printable_pages WHERE parent_id = ? ORDER BY url",
            (col_id,),
        ).fetchall()
        conn.close()

        self.assertEqual(len(children), 2)
        self.assertEqual(children[0][0], "http://example.com/print1")
        self.assertEqual(children[1][0], "http://example.com/print2")

    def test_seed_skips_malformed_entries(self):
        """Entries missing url or thumbnail are skipped."""
        malformed_data = [
            {"thumbnail": "http://img/no-url.webp", "searches": []},
            {"url": "http://example.com/no-thumb", "searches": []},
            {
                "url": "http://example.com/good",
                "thumbnail": "http://img/good.webp",
                "searches": [],
            },
        ]

        fd, malformed_path = tempfile.mkstemp(suffix=".json")
        os.close(fd)
        with open(malformed_path, "w") as f:
            json.dump(malformed_data, f)

        stats = seed(malformed_path, self.db_path)
        os.unlink(malformed_path)

        self.assertEqual(stats["imported"], 1)
        self.assertEqual(stats["skipped"], 2)

    def test_seed_preserves_search_links(self):
        """Tag associations preserve the original search link."""
        seed(self.data_path, self.db_path)

        conn = sqlite3.connect(self.db_path)
        # Find the collection's page_tags entry for 'animals' which has a link
        row = conn.execute(
            """
            SELECT pt.link FROM page_tags pt
            JOIN tags t ON t.id = pt.tag_id
            JOIN printable_pages p ON p.id = pt.page_id
            WHERE t.name = 'animals' AND p.url = 'http://example.com/col1'
            """,
        ).fetchone()
        conn.close()

        self.assertEqual(row[0], "http://search/animals")

    def test_seed_with_real_data(self):
        """Seed works with the actual data.json file."""
        real_data = os.path.join(os.path.dirname(__file__), "..", "data.json")
        if not os.path.exists(real_data):
            self.skipTest("data.json not found")

        stats = seed(real_data, self.db_path)
        self.assertGreater(stats["imported"], 0)
        self.assertGreater(stats["tags_created"], 0)
        self.assertEqual(stats["skipped"], 0)


if __name__ == "__main__":
    unittest.main()
