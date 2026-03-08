"""Tests for personalized feed: tag affinity, personalized items, and recommendations."""

import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import asyncio

from fastapi.testclient import TestClient

import db as db_module


def _make_test_app(db_path: str):
    db_module.DB_PATH = db_path
    asyncio.run(db_module.init_db(db_path))
    import importlib
    import main as main_module
    importlib.reload(main_module)
    return main_module.app


def _seed_data(db_path: str):
    """Seed test data: pages, tags, devices, events."""
    import sqlite3
    conn = sqlite3.connect(db_path)
    # Pages
    for i in range(1, 31):
        conn.execute(
            "INSERT INTO printable_pages (id, url, thumbnail, type, source) VALUES (?, ?, ?, 'print', 'test')",
            (i, f"http://test/{i}", f"http://thumb/{i}"),
        )
    # Tags
    conn.execute("INSERT INTO tags (id, name) VALUES (1, 'animals')")
    conn.execute("INSERT INTO tags (id, name) VALUES (2, 'coloring')")
    conn.execute("INSERT INTO tags (id, name) VALUES (3, 'dinosaurs')")
    conn.execute("INSERT INTO tags (id, name) VALUES (4, 'blocked_tag')")
    conn.execute("UPDATE tags SET blocked = 1 WHERE id = 4")
    # Tag pages: pages 1-10 = animals, 11-20 = coloring, 21-30 = dinosaurs
    for i in range(1, 11):
        conn.execute("INSERT INTO page_tags (page_id, tag_id) VALUES (?, 1)", (i,))
    for i in range(11, 21):
        conn.execute("INSERT INTO page_tags (page_id, tag_id) VALUES (?, 2)", (i,))
    for i in range(21, 31):
        conn.execute("INSERT INTO page_tags (page_id, tag_id) VALUES (?, 3)", (i,))
    # Device A: interacted with animals pages
    conn.execute(
        "INSERT INTO devices (id, device_name, device_token, registered_at) "
        "VALUES ('dev-a', 'Child A', 'tok-a', '2026-01-01')"
    )
    for i in range(1, 6):
        conn.execute(
            "INSERT INTO activity_events (id, device_id, event_type, image_id, event_timestamp) "
            "VALUES (?, 'dev-a', 'print', ?, '2026-01-01')",
            (f"ev-a-{i}", str(i)),
        )
    for i in range(1, 11):
        conn.execute(
            "INSERT INTO activity_events (id, device_id, event_type, image_id, event_timestamp) "
            "VALUES (?, 'dev-a', 'view', ?, '2026-01-01')",
            (f"ev-av-{i}", str(i)),
        )
    # Device B: interacted with dinosaurs pages
    conn.execute(
        "INSERT INTO devices (id, device_name, device_token, registered_at) "
        "VALUES ('dev-b', 'Child B', 'tok-b', '2026-01-01')"
    )
    for i in range(21, 26):
        conn.execute(
            "INSERT INTO activity_events (id, device_id, event_type, image_id, event_timestamp) "
            "VALUES (?, 'dev-b', 'detail', ?, '2026-01-01')",
            (f"ev-b-{i}", str(i)),
        )
    conn.commit()
    conn.close()


class TestPersonalizedFeed(unittest.TestCase):

    def setUp(self):
        fd, self.db_path = tempfile.mkstemp(suffix=".db")
        os.close(fd)
        app = _make_test_app(self.db_path)
        _seed_data(self.db_path)
        self.client = TestClient(app, raise_server_exceptions=True)

    def tearDown(self):
        os.unlink(self.db_path)

    # -- T006: backward compatible --
    def test_items_without_device_id(self):
        resp = self.client.get("/api/items?limit=10")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertGreater(len(data), 0)
        self.assertIn("url", data[0])

    # -- T007: personalized ordering differs --
    def test_personalized_differs_from_default(self):
        default = self.client.get("/api/items?limit=20").json()
        personalized = self.client.get("/api/items?limit=20&device_id=dev-a").json()
        default_ids = [i["id"] for i in default]
        pers_ids = [i["id"] for i in personalized]
        self.assertNotEqual(default_ids, pers_ids)

    # -- T008: two devices get different results --
    def test_two_devices_different_top20(self):
        items_a = self.client.get("/api/items?limit=20&device_id=dev-a").json()
        items_b = self.client.get("/api/items?limit=20&device_id=dev-b").json()
        ids_a = [i["id"] for i in items_a]
        ids_b = [i["id"] for i in items_b]
        self.assertNotEqual(ids_a, ids_b)

    # -- T009: unauthenticated returns valid --
    def test_no_device_id_returns_items(self):
        resp = self.client.get("/api/items?limit=5")
        self.assertEqual(resp.status_code, 200)
        self.assertGreater(len(resp.json()), 0)

    # -- T021: recommendations with history --
    def test_recommendations_with_history(self):
        resp = self.client.get(
            "/api/devices/dev-a/recommendations?limit=10",
            headers={"Authorization": "Bearer tok-a"},
        )
        self.assertEqual(resp.status_code, 200)
        recs = resp.json()
        self.assertGreater(len(recs), 0)

    # -- T022: recommendations exclude interacted --
    def test_recommendations_exclude_interacted(self):
        resp = self.client.get(
            "/api/devices/dev-a/recommendations?limit=20",
            headers={"Authorization": "Bearer tok-a"},
        )
        recs = resp.json()
        rec_ids = {r["id"] for r in recs}
        # Pages 1-5 were printed by dev-a, should not appear
        for pid in range(1, 6):
            self.assertNotIn(pid, rec_ids, f"Printed page {pid} should not be recommended")

    # -- T023: no history gets popular fallback --
    def test_recommendations_no_history_popular_fallback(self):
        # Create a device with no history
        reg = self.client.post("/api/devices/register", json={"initial_name": "New"})
        data = reg.json()
        resp = self.client.get(
            f"/api/devices/{data['device_id']}/recommendations?limit=5",
            headers={"Authorization": f"Bearer {data['device_token']}"},
        )
        self.assertEqual(resp.status_code, 200)
        recs = resp.json()
        # Should get popular items (from dev-a and dev-b activity)
        self.assertGreater(len(recs), 0)


if __name__ == "__main__":
    unittest.main()
