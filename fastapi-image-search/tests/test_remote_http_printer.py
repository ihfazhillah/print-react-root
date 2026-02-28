import unittest
from unittest.mock import AsyncMock, MagicMock, patch

import httpx

from printer.base import PrinterError, PrintResult
from printer.remote_http import RemoteHttpPrinter


class TestRemoteHttpPrinter(unittest.IsolatedAsyncioTestCase):
    """Test RemoteHttpPrinter implementation."""

    def setUp(self):
        self.printer = RemoteHttpPrinter(
            server_url="http://192.168.68.254:1234/print",
            password="test_pass",
        )
        self.image_bytes = b"\x89PNG\r\n\x1a\nfake_png_data"

    @patch("printer.remote_http.httpx.AsyncClient")
    async def test_print_image_success_returns_print_result(self, mock_client_cls):
        """Test happy-path POST returns PrintResult with correct status."""
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()

        mock_client = AsyncMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client_cls.return_value = mock_client

        result = await self.printer.print_image(self.image_bytes)

        self.assertIsInstance(result, PrintResult)
        self.assertEqual(result.status, "sent_to_printer")
        self.assertEqual(result.message, "Image sent to printer")

    @patch("printer.remote_http.httpx.AsyncClient")
    async def test_print_image_sends_correct_multipart_and_headers(self, mock_client_cls):
        """Test POST sends multipart file with x-pass header."""
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()

        mock_client = AsyncMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client_cls.return_value = mock_client

        await self.printer.print_image(self.image_bytes)

        mock_client.post.assert_called_once()
        call_args = mock_client.post.call_args
        self.assertEqual(call_args[0][0], "http://192.168.68.254:1234/print")
        self.assertIn("files", call_args[1])
        self.assertIn("headers", call_args[1])
        self.assertEqual(call_args[1]["headers"]["x-pass"], "test_pass")

    @patch("printer.remote_http.httpx.AsyncClient")
    async def test_print_image_network_error_raises_printer_error(self, mock_client_cls):
        """Test network error raises PrinterError."""
        mock_client = AsyncMock()
        mock_client.post = AsyncMock(side_effect=httpx.ConnectError("Connection refused"))
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client_cls.return_value = mock_client

        with self.assertRaises(PrinterError) as ctx:
            await self.printer.print_image(self.image_bytes)

        self.assertIn("Connection refused", str(ctx.exception))
        self.assertIsInstance(ctx.exception.cause, httpx.ConnectError)

    @patch("printer.remote_http.httpx.AsyncClient")
    async def test_print_image_http_error_raises_printer_error(self, mock_client_cls):
        """Test HTTP 4xx/5xx raises PrinterError."""
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock(
            side_effect=httpx.HTTPStatusError(
                "Server Error",
                request=MagicMock(),
                response=MagicMock(status_code=500),
            )
        )

        mock_client = AsyncMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client_cls.return_value = mock_client

        with self.assertRaises(PrinterError) as ctx:
            await self.printer.print_image(self.image_bytes)

        self.assertIsInstance(ctx.exception.cause, httpx.HTTPStatusError)


if __name__ == "__main__":
    unittest.main()
