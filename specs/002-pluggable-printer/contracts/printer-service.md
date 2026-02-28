# Contract: PrinterService Interface

**Feature**: 002-pluggable-printer
**Date**: 2026-02-28

## Interface Definition

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class PrintResult:
    status: str    # "sent_to_printer"
    message: str   # Human-readable confirmation


class PrinterError(Exception):
    """Raised when a print operation fails."""
    def __init__(self, message: str, cause: Exception | None = None):
        super().__init__(message)
        self.cause = cause


class PrinterService(ABC):
    """Abstract base class for printer implementations."""

    @abstractmethod
    async def print_image(self, image_bytes: bytes) -> PrintResult:
        """Submit image bytes for printing.

        Args:
            image_bytes: PNG image data to print.

        Returns:
            PrintResult with status and message.

        Raises:
            PrinterError: If the print operation fails.
        """
        ...
```

## Implementation Contracts

### RemoteHttpPrinter

- Constructor: `RemoteHttpPrinter(server_url: str, password: str)`
- `print_image(image_bytes)`:
  - POSTs to `server_url` with multipart file `("print.png", image_bytes, "image/png")`
  - Sets header `x-pass: {password}`
  - Returns `PrintResult(status="sent_to_printer", message="Image sent to printer")`
  - Raises `PrinterError` on httpx errors (network, HTTP 4xx/5xx)

### CupsPrinter

- Constructor: `CupsPrinter(printer_name: str | None = None)`
- `print_image(image_bytes)`:
  - Runs `lp [-d printer_name] -` with image_bytes piped to stdin via `asyncio.create_subprocess_exec`
  - Returns `PrintResult(status="sent_to_printer", message="Image sent to printer")`
  - Raises `PrinterError` if `lp` exits with non-zero return code

### Factory Function

```python
def get_printer_service() -> PrinterService:
    """Create a PrinterService based on environment variables.

    Reads:
        PRINTER_SERVICE: "http" (default) or "cups"
        PRINT_SERVER_URL: Remote server URL (for http)
        PRINT_PASSWORD: Remote server password (for http)
        CUPS_PRINTER_NAME: Target printer name (for cups, optional)

    Returns:
        Configured PrinterService instance.

    Raises:
        ValueError: If PRINTER_SERVICE is unrecognized.
        ValueError: If required env vars are missing for the selected service.
    """
```

## Endpoint Integration

The `/api/print-image` endpoint calls `printer_service.print_image(png_bytes)` instead of the old `send_to_printer(png_bytes, password)`. The response format is unchanged:

```json
{"status": "sent_to_printer", "message": "Image sent to printer"}
```

Error responses remain HTTP 500 with `{"detail": "<error message>"}`.

## Extensibility

To add a new printer implementation:
1. Create a new class extending `PrinterService`
2. Implement `async print_image(self, image_bytes: bytes) -> PrintResult`
3. Add a new case in the factory function for the new `PRINTER_SERVICE` value
