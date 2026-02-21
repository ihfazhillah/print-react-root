import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from main import app, fetch_krokotak_page, send_to_printer, subprocess


class TestAPIItems(unittest.TestCase):
    """Test /api/items endpoint"""

    def setUp(self):
        self.client = TestClient(app)

    def test_get_items_default(self):
        """Test getting items with default pagination"""
        response = self.client.get("/api/items")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertLessEqual(len(data), 21)  # Default limit is 20

    def test_get_items_with_skip(self):
        """Test getting items with skip parameter"""
        response = self.client.get("/api/items?skip=5&limit=10")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertLessEqual(len(data), 11)

    def test_get_items_with_limit(self):
        """Test getting items with custom limit"""
        response = self.client.get("/api/items?limit=5")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertLessEqual(len(data), 6)


class TestAPISearch(unittest.TestCase):
    """Test /api/search endpoint"""

    def setUp(self):
        self.client = TestClient(app)

    def test_search_empty_query(self):
        """Test search with empty query returns items"""
        response = self.client.get("/api/search?q=")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)

    def test_search_with_query(self):
        """Test search with query"""
        response = self.client.get("/api/search?q=craft")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)

    def test_search_not_found(self):
        """Test search with non-matching query"""
        response = self.client.get("/api/search?q=nonexistent")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)


class TestAPIRelated(unittest.TestCase):
    """Test /api/related/{item_index} endpoint"""

    def setUp(self):
        self.client = TestClient(app)

    def test_related_valid_index(self):
        """Test getting related items with valid index"""
        response = self.client.get("/api/related/0")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)

    def test_related_invalid_index(self):
        """Test getting related items with invalid index"""
        response = self.client.get("/api/related/999999")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data, [])


class TestAPITags(unittest.TestCase):
    """Test /api/tags endpoint"""

    def setUp(self):
        self.client = TestClient(app)

    def test_get_tags_default(self):
        """Test getting tags with default limit"""
        response = self.client.get("/api/tags")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertLessEqual(len(data), 11)  # Default limit is 10

    def test_get_tags_with_limit(self):
        """Test getting tags with custom limit"""
        response = self.client.get("/api/tags?limit=5")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertLessEqual(len(data), 6)


class TestAPIPrintImage(unittest.TestCase):
    """Test /api/print-image endpoint"""

    def setUp(self):
        self.client = TestClient(app)

    @patch("main.fetch_krokotak_page")
    @patch("main.send_to_printer")
    @patch("main.convert_to_png")
    def test_print_image_success(self, mock_convert, mock_send, mock_fetch):
        """Test print image with mocked external calls"""
        import os

        # Set PRINT_PASSWORD for test
        os.environ["PRINT_PASSWORD"] = "test_password"

        # Mock fetch to return base64 image
        mock_fetch.return_value = "data:image/webp;base64,UklGRhhFAQBXRUJQVlA4IAxFAQCwWQWdASraBNsGPm02l0kkIqIhIhIJ"
        # Mock send to printer
        mock_send.return_value = {
            "status": "sent_to_printer",
            "message": "Image sent to printer",
        }

        # Mock convert_to_png to return dummy PNG bytes
        mock_convert.return_value = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\rPNG\x00\x00\x00\x00IEND\xaeB\x06\xcb"

        response = self.client.get(
            "/api/print-image?url=https://example.com/print?id=test"
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "sent_to_printer")

        # Clean up
        del os.environ["PRINT_PASSWORD"]

    @patch("main.os.getenv")
    @patch("main.fetch_krokotak_page")
    @patch("main.convert_to_png")
    def test_print_image_no_password(self, mock_convert, mock_fetch, mock_getenv):
        """Test print image without PRINT_PASSWORD"""
        # Mock os.getenv to return None
        mock_getenv.return_value = None

        mock_fetch.return_value = "data:image/webp;base64,UklGRhhFAQBXRUJQVlA4IAxFAQCwWQWdASraBNsGPm02l0kkIqIhIhIJ"

        response = self.client.get(
            "/api/print-image?url=https://example.com/print?id=test"
        )
        self.assertEqual(
            response.status_code, 500
        )  # Server error due to missing password


if __name__ == "__main__":
    unittest.main()
