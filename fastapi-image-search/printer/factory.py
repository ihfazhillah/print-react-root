import os

from printer.base import PrinterService
from printer.cups import CupsPrinter
from printer.remote_http import RemoteHttpPrinter

DEFAULT_PRINT_SERVER_URL = "http://192.168.68.254:1234/print"


def get_printer_service() -> PrinterService:
    """Create a PrinterService based on environment variables.

    Reads:
        PRINTER_SERVICE: "http" (default) or "cups"
        PRINT_SERVER_URL: Remote server URL (for http)
        PRINT_PASSWORD: Remote server password (for http, validated at print time)
        CUPS_PRINTER_NAME: Target printer name (for cups, optional)

    Returns:
        Configured PrinterService instance.

    Raises:
        ValueError: If PRINTER_SERVICE is unrecognized.
    """
    service_type = os.getenv("PRINTER_SERVICE", "http").lower()

    if service_type == "http":
        server_url = os.getenv("PRINT_SERVER_URL", DEFAULT_PRINT_SERVER_URL)
        password = os.getenv("PRINT_PASSWORD")
        return RemoteHttpPrinter(server_url=server_url, password=password)

    if service_type == "cups":
        printer_name = os.getenv("CUPS_PRINTER_NAME") or None
        return CupsPrinter(printer_name=printer_name)

    raise ValueError(
        f"Unknown PRINTER_SERVICE: '{service_type}'. Supported: http, cups"
    )
