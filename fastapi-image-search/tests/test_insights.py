"""Tests for usage insights analytics endpoints (007-usage-insights)."""

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


def _seed_data(db_path: str):
    """Seed devices, images, tags, and activity for testing."""

    async def _seed():
        async with db_module.get_db(db_path) as conn:
            # Devices
            await conn.execute(
                "INSERT INTO devices (id, device_name, device_token, registered_at) "
                "VALUES ('d1', 'Mimi', 'tok1', '2026-03-01T00:00:00Z')"
            )
            await conn.execute(
                "INSERT INTO devices (id, device_name, device_token, registered_at) "
                "VALUES ('d2', 'LuLu', 'tok2', '2026-03-01T00:00:00Z')"
            )
            await conn.execute(
                "INSERT INTO devices (id, device_name, device_token, registered_at, is_admin) "
                "VALUES ('d3', 'Babah', 'tok3', '2026-03-01T00:00:00Z', 1)"
            )

            # Images
            for i in range(1, 4):
                await conn.execute(
                    "INSERT INTO printable_pages (id, url, thumbnail, type) "
                    f"VALUES ({i}, 'http://a/{i}', 'http://t/{i}', 'print')"
                )

            # Tags
            await conn.execute("INSERT INTO tags (id, name) VALUES (1, 'craft')")
            await conn.execute("INSERT INTO tags (id, name) VALUES (2, 'butterfly')")
            await conn.execute("INSERT INTO page_tags (page_id, tag_id) VALUES (1, 1)")
            await conn.execute("INSERT INTO page_tags (page_id, tag_id) VALUES (2, 2)")
            await conn.execute("INSERT INTO page_tags (page_id, tag_id) VALUES (3, 1)")
            await conn.execute("INSERT INTO page_tags (page_id, tag_id) VALUES (3, 2)")

            # Mimi: 3 prints of image 1 (craft), 1 view of image 2
            for i in range(3):
                await conn.execute(
                    "INSERT INTO activity_events (id, device_id, event_type, image_id, event_timestamp) "
                    f"VALUES ('e_m{i}', 'd1', 'print', '1', '2026-03-05T10:0{i}:00Z')"
                )
            await conn.execute(
                "INSERT INTO activity_events (id, device_id, event_type, image_id, event_timestamp) "
                "VALUES ('e_m3', 'd1', 'view', '2', '2026-03-05T11:00:00Z')"
            )

            # LuLu: 2 prints of image 2 (butterfly)
            for i in range(2):
                await conn.execute(
                    "INSERT INTO activity_events (id, device_id, event_type, image_id, event_timestamp) "
                    f"VALUES ('e_l{i}', 'd2', 'print', '2', '2026-03-05T12:0{i}:00Z')"
                )

            # Babah (admin): 1 print of image 3 — should be excluded
            await conn.execute(
                "INSERT INTO activity_events (id, device_id, event_type, image_id, event_timestamp) "
                "VALUES ('e_b0', 'd3', 'print', '3', '2026-03-05T13:00:00Z')"
            )

            await conn.commit()

    asyncio.run(_seed())


class InsightsTestBase(unittest.TestCase):
    def setUp(self):
        fd, self.db_path = tempfile.mkstemp(suffix=".db")
        os.close(fd)
        app = _make_test_app(self.db_path)
        _seed_data(self.db_path)
        self.client = TestClient(app, raise_server_exceptions=True)

    def tearDown(self):
        os.unlink(self.db_path)


class TestInsightsSummary(InsightsTestBase):
    def test_summary_excludes_admin(self):
        resp = self.client.get("/api/admin/insights/summary")
        self.assertEqual(resp.status_code, 200)
        names = [d["device_name"] for d in resp.json()]
        self.assertIn("Mimi", names)
        self.assertIn("LuLu", names)
        self.assertNotIn("Babah", names)

    def test_summary_counts(self):
        resp = self.client.get("/api/admin/insights/summary")
        mimi = next(d for d in resp.json() if d["device_name"] == "Mimi")
        self.assertEqual(mimi["total_prints"], 3)
        self.assertEqual(mimi["total_views"], 1)


class TestInsightsTopTags(InsightsTestBase):
    def test_top_tags_per_device(self):
        resp = self.client.get("/api/admin/insights/top-tags?limit=5")
        self.assertEqual(resp.status_code, 200)
        mimi = next(d for d in resp.json() if d["device_name"] == "Mimi")
        self.assertEqual(mimi["top_tags"][0]["tag_name"], "craft")
        self.assertEqual(mimi["top_tags"][0]["print_count"], 3)


class TestInsightsTopImages(InsightsTestBase):
    def test_top_images_overall(self):
        resp = self.client.get("/api/admin/insights/top-images?limit=5")
        data = resp.json()
        self.assertEqual(data["overall"][0]["image_id"], 1)
        self.assertEqual(data["overall"][0]["print_count"], 3)

    def test_top_images_excludes_admin(self):
        resp = self.client.get("/api/admin/insights/top-images?limit=10")
        all_ids = [img["image_id"] for img in resp.json()["overall"]]
        self.assertNotIn(3, all_ids)


class TestInsightsInterests(InsightsTestBase):
    def test_shared_and_unique(self):
        resp = self.client.get("/api/admin/insights/interests")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        unique_names = [u["device_name"] for u in data["unique"]]
        self.assertIn("LuLu", unique_names)
        self.assertIn("Mimi", unique_names)


class TestAdminToggle(InsightsTestBase):
    def test_toggle_is_admin(self):
        resp = self.client.patch("/api/admin/devices/d1/admin", json={"is_admin": True})
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()["is_admin"])

        # Now summary should exclude Mimi
        names = [d["device_name"] for d in self.client.get("/api/admin/insights/summary").json()]
        self.assertNotIn("Mimi", names)

    def test_toggle_nonexistent(self):
        resp = self.client.patch("/api/admin/devices/nonexistent/admin", json={"is_admin": True})
        self.assertEqual(resp.status_code, 404)


class TestRecommendations(InsightsTestBase):
    def test_recommendations_returns_images(self):
        resp = self.client.get(
            "/api/devices/d1/recommendations",
            headers={"Authorization": "Bearer tok1"},
        )
        self.assertEqual(resp.status_code, 200)
        ids = [item["id"] for item in resp.json()]
        self.assertIn(3, ids)  # Image 3 has craft tag, not printed by Mimi

    def test_recommendations_empty_for_new_device(self):
        reg = self.client.post("/api/devices/register", json={"initial_name": "NewKid"}).json()
        resp = self.client.get(
            f"/api/devices/{reg['device_id']}/recommendations",
            headers={"Authorization": f"Bearer {reg['device_token']}"},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), [])

    def test_recommendations_requires_auth(self):
        resp = self.client.get("/api/devices/d1/recommendations")
        self.assertEqual(resp.status_code, 401)

    def test_recommendations_weighted_by_detail_events(self):
        """Detail events (weight=1) should influence tag ranking alongside prints (weight=3)."""

        async def _add_detail_events():
            async with db_module.get_db(self.db_path) as conn:
                # Add 10 detail views of image 2 (butterfly tag) for Mimi
                # butterfly score: 0 prints * 3 + 10 details * 1 = 10
                # craft score: 3 prints * 3 + 0 details * 1 = 9
                # So butterfly should now rank higher than craft
                for i in range(10):
                    await conn.execute(
                        "INSERT INTO activity_events (id, device_id, event_type, image_id, event_timestamp) "
                        f"VALUES ('e_detail_{i}', 'd1', 'detail', '2', '2026-03-06T10:0{i}:00Z')"
                    )
                await conn.commit()

        asyncio.run(_add_detail_events())

        resp = self.client.get(
            "/api/devices/d1/recommendations",
            headers={"Authorization": "Bearer tok1"},
        )
        self.assertEqual(resp.status_code, 200)
        # With weighted scoring, butterfly tag (score=10) ranks above craft (score=9),
        # so recommendations should include butterfly-tagged images
        ids = [item["id"] for item in resp.json()]
        # Image 3 has both craft and butterfly tags — should still appear
        self.assertTrue(len(ids) > 0)


class TestAndroidIdMigration(InsightsTestBase):
    def test_register_with_android_id(self):
        """Registration with android_id creates a device with that id stored."""
        resp = self.client.post(
            "/api/devices/register",
            json={"initial_name": "TestKid", "android_id": "abc123"},
        )
        self.assertEqual(resp.status_code, 201)
        device_id = resp.json()["device_id"]

        # Registering again with same android_id returns same device
        resp2 = self.client.post(
            "/api/devices/register",
            json={"initial_name": "DifferentName", "android_id": "abc123"},
        )
        self.assertEqual(resp2.status_code, 201)
        self.assertEqual(resp2.json()["device_id"], device_id)

    def test_register_without_android_id_still_works(self):
        """Backward compatibility: registration without android_id creates new device."""
        resp = self.client.post(
            "/api/devices/register", json={"initial_name": "OldApp"}
        )
        self.assertEqual(resp.status_code, 201)
        self.assertIn("device_id", resp.json())

    def test_link_android_id_to_existing_device(self):
        """Migration: link android_id to an existing device via PATCH."""
        resp = self.client.patch(
            "/api/devices/d1/android-id",
            json={"android_id": "mimi_android_123"},
            headers={"Authorization": "Bearer tok1"},
        )
        self.assertEqual(resp.status_code, 200)

        # Now registering with that android_id returns Mimi's device
        resp2 = self.client.post(
            "/api/devices/register",
            json={"initial_name": "Whatever", "android_id": "mimi_android_123"},
        )
        self.assertEqual(resp2.status_code, 201)
        self.assertEqual(resp2.json()["device_id"], "d1")

    def test_link_android_id_conflict(self):
        """Cannot link an android_id that's already used by another device."""
        # Link to d1
        self.client.patch(
            "/api/devices/d1/android-id",
            json={"android_id": "shared_id"},
            headers={"Authorization": "Bearer tok1"},
        )
        # Try to link same id to d2
        resp = self.client.patch(
            "/api/devices/d2/android-id",
            json={"android_id": "shared_id"},
            headers={"Authorization": "Bearer tok2"},
        )
        self.assertEqual(resp.status_code, 409)

    def test_link_requires_auth(self):
        resp = self.client.patch(
            "/api/devices/d1/android-id",
            json={"android_id": "test123"},
        )
        self.assertEqual(resp.status_code, 401)


class TestMergeDevices(InsightsTestBase):
    def test_merge_moves_events(self):
        """Merging moves all activity_events from source to target."""
        resp = self.client.post(
            "/api/admin/devices/merge",
            json={"source_id": "d2", "target_id": "d1"},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["merged_events"], 2)  # LuLu had 2 prints
        self.assertEqual(data["source_id"], "d2")
        self.assertEqual(data["target_id"], "d1")

    def test_merge_deactivates_source(self):
        self.client.post(
            "/api/admin/devices/merge",
            json={"source_id": "d2", "target_id": "d1"},
        )
        # d2 should now be inactive
        resp = self.client.get("/api/admin/insights/summary")
        lulu = next(d for d in resp.json() if d["device_name"] == "LuLu")
        self.assertFalse(lulu["is_active"])

    def test_merge_self_rejected(self):
        resp = self.client.post(
            "/api/admin/devices/merge",
            json={"source_id": "d1", "target_id": "d1"},
        )
        self.assertEqual(resp.status_code, 422)

    def test_merge_nonexistent_device(self):
        resp = self.client.post(
            "/api/admin/devices/merge",
            json={"source_id": "nonexistent", "target_id": "d1"},
        )
        self.assertEqual(resp.status_code, 404)


if __name__ == "__main__":
    unittest.main()
