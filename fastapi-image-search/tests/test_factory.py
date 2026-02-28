import os
import unittest
from unittest.mock import patch

from printer.cups import CupsPrinter
from printer.factory import get_printer_service
from printer.remote_http import RemoteHttpPrinter


class TestPrinterServiceSwap(unittest.TestCase):
    """E2E behavior tests for printer service configuration swap.
    These tests verify that changing PRINTER_SERVICE env var routes
    to the correct implementation — they only change when the swap
    use case changes."""

    @patch.dict(os.environ, {"PRINTER_SERVICE": "http", "PRINT_PASSWORD": "pass"})
    def test_http_config_returns_remote_http_printer(self):
        """AS-1: Given config specifies http, when server starts, then remote HTTP printer active"""
        service = get_printer_service()
        self.assertIsInstance(service, RemoteHttpPrinter)

    @patch.dict(os.environ, {"PRINTER_SERVICE": "cups"}, clear=False)
    def test_cups_config_returns_cups_printer(self):
        """AS-2: Given config specifies cups, when server starts, then CUPS printer active"""
        service = get_printer_service()
        self.assertIsInstance(service, CupsPrinter)

    @patch.dict(os.environ, {"PRINTER_SERVICE": "cups", "CUPS_PRINTER_NAME": "MyPrinter"}, clear=False)
    def test_cups_config_with_printer_name_passes_name(self):
        """AS-2: Given cups config with printer name, then CupsPrinter uses that name"""
        service = get_printer_service()
        self.assertIsInstance(service, CupsPrinter)
        self.assertEqual(service.printer_name, "MyPrinter")

    @patch.dict(os.environ, {"PRINTER_SERVICE": "cups"}, clear=False)
    def test_cups_config_without_printer_name_uses_default(self):
        """AS-2: Given cups config without printer name, then CupsPrinter uses system default"""
        # Remove CUPS_PRINTER_NAME if present
        os.environ.pop("CUPS_PRINTER_NAME", None)
        service = get_printer_service()
        self.assertIsInstance(service, CupsPrinter)
        self.assertIsNone(service.printer_name)

    @patch.dict(os.environ, {"PRINTER_SERVICE": "invalid"}, clear=False)
    def test_invalid_config_fails_fast(self):
        """AS-3: Given invalid service specified, when server starts, then fails with clear error"""
        with self.assertRaises(ValueError) as ctx:
            get_printer_service()
        self.assertIn("invalid", str(ctx.exception))
        self.assertIn("Supported", str(ctx.exception))

    @patch.dict(os.environ, {}, clear=False)
    def test_no_config_defaults_to_http(self):
        """Edge case: No PRINTER_SERVICE set defaults to remote HTTP for backward compatibility"""
        os.environ.pop("PRINTER_SERVICE", None)
        service = get_printer_service()
        self.assertIsInstance(service, RemoteHttpPrinter)


if __name__ == "__main__":
    unittest.main()
