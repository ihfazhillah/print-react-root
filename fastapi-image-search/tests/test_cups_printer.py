import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from printer.base import PrinterError, PrintResult
from printer.cups import CupsPrinter


class TestCupsPrinterBehavior(unittest.IsolatedAsyncioTestCase):
    """E2E behavior tests for CUPS printing — tests the public interface
    with mocked subprocess boundary. These tests only change when the
    use case changes, not when internal implementation changes."""

    IMAGE_BYTES = b"\x89PNG\r\n\x1a\nfake_png_data"

    @patch("printer.cups.asyncio.create_subprocess_exec")
    async def test_print_to_default_printer_succeeds(self, mock_exec):
        """AS-1: Given CUPS configured, when print request arrives, then image sent to CUPS queue"""
        mock_proc = AsyncMock()
        mock_proc.communicate.return_value = (b"request id is Printer-42 (0 file(s))\n", b"")
        mock_proc.returncode = 0
        mock_exec.return_value = mock_proc

        printer = CupsPrinter()
        result = await printer.print_image(self.IMAGE_BYTES)

        self.assertIsInstance(result, PrintResult)
        self.assertEqual(result.status, "sent_to_printer")
        # Verify lp was called with stdin pipe, reading from stdin (-)
        mock_exec.assert_called_once()
        args = mock_exec.call_args[0]
        self.assertEqual(args[0], "lp")
        self.assertIn("-", args)
        # Verify image bytes were sent to stdin
        mock_proc.communicate.assert_called_once_with(input=self.IMAGE_BYTES)

    @patch("printer.cups.asyncio.create_subprocess_exec")
    async def test_print_to_named_printer_uses_d_flag(self, mock_exec):
        """AS-1: Given specific printer name, when print request arrives, then lp uses -d flag"""
        mock_proc = AsyncMock()
        mock_proc.communicate.return_value = (b"request id is MyPrinter-1\n", b"")
        mock_proc.returncode = 0
        mock_exec.return_value = mock_proc

        printer = CupsPrinter(printer_name="MyPrinter")
        await printer.print_image(self.IMAGE_BYTES)

        args = mock_exec.call_args[0]
        self.assertIn("-d", args)
        d_index = list(args).index("-d")
        self.assertEqual(args[d_index + 1], "MyPrinter")

    @patch("printer.cups.asyncio.create_subprocess_exec")
    async def test_cups_unavailable_raises_error(self, mock_exec):
        """AS-2: Given CUPS unavailable, when print request arrives, then error raised"""
        mock_proc = AsyncMock()
        mock_proc.communicate.return_value = (b"", b"lp: Error - no default destination.\n")
        mock_proc.returncode = 1
        mock_exec.return_value = mock_proc

        printer = CupsPrinter()
        with self.assertRaises(PrinterError) as ctx:
            await printer.print_image(self.IMAGE_BYTES)

        self.assertIn("no default destination", str(ctx.exception))

    @patch("printer.cups.asyncio.create_subprocess_exec")
    async def test_print_job_fails_raises_error(self, mock_exec):
        """AS-3: Given print job fails, when print request arrives, then error raised"""
        mock_proc = AsyncMock()
        mock_proc.communicate.return_value = (b"", b"lp: unable to print file\n")
        mock_proc.returncode = 1
        mock_exec.return_value = mock_proc

        printer = CupsPrinter()
        with self.assertRaises(PrinterError):
            await printer.print_image(self.IMAGE_BYTES)

    @patch("printer.cups.asyncio.create_subprocess_exec", side_effect=FileNotFoundError("lp"))
    async def test_lp_not_found_raises_error(self, mock_exec):
        """Edge case: lp command not installed raises clear error"""
        printer = CupsPrinter()
        with self.assertRaises(PrinterError) as ctx:
            await printer.print_image(self.IMAGE_BYTES)

        self.assertIn("lp command not found", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
