import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from main import app
from printer.base import PrinterError, PrintResult


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
    """Test /api/print-image endpoint — E2E behavior tests"""

    def setUp(self):
        self.client = TestClient(app)

    @patch("main.fetch_krokotak_page")
    @patch("main.printer_service")
    @patch("main.convert_to_png")
    def test_print_image_success(self, mock_convert, mock_printer, mock_fetch):
        """AS-1: Given configured HTTP printer, when print request arrives, then image is sent and success returned"""
        # Mock fetch to return base64 image
        mock_fetch.return_value = "data:image/webp;base64,UklGRhhFAQBXRUJQVlA4IAxFAQCwWQWdASraBNsGPm02l0kkIqIhIhIJ"

        # Mock convert_to_png to return dummy PNG bytes
        mock_convert.return_value = b"\x89PNG\r\n\x1a\nfake_png"

        # Mock printer service to return success
        mock_printer.print_image = AsyncMock(
            return_value=PrintResult(
                status="sent_to_printer", message="Image sent to printer"
            )
        )

        response = self.client.get(
            "/api/print-image?url=https://example.com/print?id=test"
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "sent_to_printer")
        self.assertEqual(data["message"], "Image sent to printer")

        # Verify printer service was called with the converted PNG bytes
        mock_printer.print_image.assert_called_once_with(b"\x89PNG\r\n\x1a\nfake_png")

    @patch("main.fetch_krokotak_page")
    @patch("main.printer_service")
    @patch("main.convert_to_png")
    def test_print_image_no_password(self, mock_convert, mock_printer, mock_fetch):
        """AS-2: Given missing password, when print request arrives, then 500 error returned"""
        mock_fetch.return_value = "data:image/webp;base64,UklGRhhFAQBXRUJQVlA4IAxFAQCwWQWdASraBNsGPm02l0kkIqIhIhIJ"
        mock_convert.return_value = b"\x89PNG\r\n\x1a\nfake_png"

        # Printer service raises error for missing password
        mock_printer.print_image = AsyncMock(
            side_effect=PrinterError("PRINT_PASSWORD environment variable not set")
        )

        response = self.client.get(
            "/api/print-image?url=https://example.com/print?id=test"
        )
        self.assertEqual(response.status_code, 500)

    @patch("main.fetch_krokotak_page")
    @patch("main.printer_service")
    @patch("main.convert_to_png")
    def test_print_image_printer_unreachable(self, mock_convert, mock_printer, mock_fetch):
        """AS-2: Given remote print server unreachable, when print request arrives, then error returned"""
        mock_fetch.return_value = "data:image/webp;base64,UklGRhhFAQBXRUJQVlA4IAxFAQCwWQWdASraBNsGPm02l0kkIqIhIhIJ"
        mock_convert.return_value = b"\x89PNG\r\n\x1a\nfake_png"

        mock_printer.print_image = AsyncMock(
            side_effect=PrinterError("Connection refused")
        )

        response = self.client.get(
            "/api/print-image?url=https://example.com/print?id=test"
        )
        self.assertEqual(response.status_code, 500)
        data = response.json()
        self.assertIn("Connection refused", data["detail"])


if __name__ == "__main__":
    unittest.main()
