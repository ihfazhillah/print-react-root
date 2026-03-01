"""Tests for device management endpoints (T022)."""

import os
import sys
import tempfile
import unittest

# Ensure project root is on path so main/db imports resolve
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import asyncio

from fastapi.testclient import TestClient

import db as db_module


def _make_test_app(db_path: str):
    """Create a fresh app instance wired to a temp DB."""
    # Override DB_PATH before importing main so all get_db() calls use it
    db_module.DB_PATH = db_path

    # Re-init schema synchronously
    asyncio.run(db_module.init_db(db_path))

    import importlib
    import main as main_module
    importlib.reload(main_module)

    return main_module.app


class TestDeviceEndpoints(unittest.TestCase):
    def setUp(self):
        fd, self.db_path = tempfile.mkstemp(suffix=".db")
        os.close(fd)
        app = _make_test_app(self.db_path)
        self.client = TestClient(app, raise_server_exceptions=True)

    def tearDown(self):
        os.unlink(self.db_path)

    # ------------------------------------------------------------------
    # Registration
    # ------------------------------------------------------------------

    def test_register_device_returns_token_and_id(self):
        """POST /api/devices/register returns device_id, device_token, device_name."""
        resp = self.client.post("/api/devices/register", json={"initial_name": "Alice"})
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertIn("device_id", data)
        self.assertIn("device_token", data)
        self.assertEqual(data["device_name"], "Alice")
        self.assertIn("registered_at", data)

    def test_register_device_empty_name_rejected(self):
        """POST /api/devices/register with empty name returns 422."""
        resp = self.client.post("/api/devices/register", json={"initial_name": "   "})
        self.assertEqual(resp.status_code, 422)

    def test_register_device_name_too_long_rejected(self):
        """POST /api/devices/register with name > 50 chars returns 422."""
        resp = self.client.post("/api/devices/register", json={"initial_name": "A" * 51})
        self.assertEqual(resp.status_code, 422)

    def test_register_two_devices_get_different_tokens(self):
        """Two registrations produce unique device_ids and tokens."""
        r1 = self.client.post("/api/devices/register", json={"initial_name": "Alice"}).json()
        r2 = self.client.post("/api/devices/register", json={"initial_name": "Bob"}).json()
        self.assertNotEqual(r1["device_id"], r2["device_id"])
        self.assertNotEqual(r1["device_token"], r2["device_token"])

    # ------------------------------------------------------------------
    # Name update
    # ------------------------------------------------------------------

    def _register(self, name="TestDevice"):
        return self.client.post("/api/devices/register", json={"initial_name": name}).json()

    def test_update_device_name_success(self):
        """PATCH /api/devices/{id}/name with correct token updates name."""
        reg = self._register("OldName")
        headers = {"Authorization": f"Bearer {reg['device_token']}"}
        resp = self.client.patch(
            f"/api/devices/{reg['device_id']}/name",
            json={"name": "NewName"},
            headers=headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["device_name"], "NewName")
        self.assertEqual(data["device_id"], reg["device_id"])

    def test_update_device_name_no_token_rejected(self):
        """PATCH without Authorization returns 401."""
        reg = self._register()
        resp = self.client.patch(
            f"/api/devices/{reg['device_id']}/name", json={"name": "X"}
        )
        self.assertEqual(resp.status_code, 401)

    def test_update_device_name_wrong_token_rejected(self):
        """PATCH with wrong token returns 401."""
        reg = self._register()
        resp = self.client.patch(
            f"/api/devices/{reg['device_id']}/name",
            json={"name": "X"},
            headers={"Authorization": "Bearer wrongtoken"},
        )
        self.assertEqual(resp.status_code, 401)

    def test_update_device_name_mismatched_device_id_rejected(self):
        """PATCH where token belongs to different device returns 403."""
        r1 = self._register("Device1")
        r2 = self._register("Device2")
        resp = self.client.patch(
            f"/api/devices/{r1['device_id']}/name",
            json={"name": "Hacked"},
            headers={"Authorization": f"Bearer {r2['device_token']}"},
        )
        self.assertEqual(resp.status_code, 403)

    # ------------------------------------------------------------------
    # Activity events
    # ------------------------------------------------------------------

    def test_record_activity_event_success(self):
        """POST /api/devices/{id}/events records event and returns event_id."""
        reg = self._register()
        headers = {"Authorization": f"Bearer {reg['device_token']}"}
        resp = self.client.post(
            f"/api/devices/{reg['device_id']}/events",
            json={"event_type": "view", "image_id": "img123"},
            headers=headers,
        )
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertIn("event_id", data)
        self.assertEqual(data["status"], "recorded")

    def test_record_event_no_token_rejected(self):
        """POST events without auth returns 401."""
        reg = self._register()
        resp = self.client.post(
            f"/api/devices/{reg['device_id']}/events",
            json={"event_type": "print"},
        )
        self.assertEqual(resp.status_code, 401)

    # ------------------------------------------------------------------
    # Admin endpoints
    # ------------------------------------------------------------------

    def test_admin_list_devices(self):
        """GET /api/admin/devices returns registered devices."""
        self._register("Alice")
        self._register("Bob")
        resp = self.client.get("/api/admin/devices")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(len(data), 2)
        names = {d["device_name"] for d in data}
        self.assertIn("Alice", names)
        self.assertIn("Bob", names)

    def test_admin_deactivate_device(self):
        """DELETE /api/admin/devices/{id} deactivates device; not listed afterwards."""
        reg = self._register("ToDelete")
        resp = self.client.delete(f"/api/admin/devices/{reg['device_id']}")
        self.assertEqual(resp.status_code, 204)
        # Should not appear in active device list
        active = self.client.get("/api/admin/devices").json()
        ids = [d["device_id"] for d in active]
        self.assertNotIn(reg["device_id"], ids)

    def test_admin_deactivate_nonexistent_returns_404(self):
        """DELETE /api/admin/devices/{unknown} returns 404."""
        resp = self.client.delete("/api/admin/devices/does-not-exist")
        self.assertEqual(resp.status_code, 404)

    def test_admin_list_includes_inactive_when_requested(self):
        """GET /api/admin/devices?include_inactive=true shows deactivated devices."""
        reg = self._register("Ghost")
        self.client.delete(f"/api/admin/devices/{reg['device_id']}")
        all_devices = self.client.get("/api/admin/devices?include_inactive=true").json()
        ids = [d["device_id"] for d in all_devices]
        self.assertIn(reg["device_id"], ids)
