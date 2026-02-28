# Data Model: Pluggable Printer Service

**Feature**: 002-pluggable-printer
**Date**: 2026-02-28

## Entities

### PrinterService (Abstract)

The base contract for all printer implementations.

| Attribute/Method | Type | Description |
|------------------|------|-------------|
| `print_image(image_bytes)` | `async (bytes) → PrintResult` | Submit image bytes for printing. Raises `PrinterError` on failure. |

### PrintResult (Value Object)

Returned by `print_image()` on success.

| Field | Type | Description |
|-------|------|-------------|
| `status` | `str` | Always `"sent_to_printer"` (preserves existing API response) |
| `message` | `str` | Human-readable confirmation message |

### PrinterError (Exception)

Raised by implementations when printing fails.

| Field | Type | Description |
|-------|------|-------------|
| `message` | `str` | Human-readable error description |
| `cause` | `Exception | None` | Original exception (for logging/debugging) |

### RemoteHttpPrinter (Implementation)

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `server_url` | `str` | `PRINT_SERVER_URL` env var | Remote print server URL |
| `password` | `str` | `PRINT_PASSWORD` env var | Authentication password |

**Behavior**: POSTs image bytes as multipart file to `server_url` with `x-pass` header. Returns `PrintResult` on HTTP 2xx. Raises `PrinterError` on network or HTTP errors.

### CupsPrinter (Implementation)

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `printer_name` | `str | None` | `CUPS_PRINTER_NAME` env var | Target printer (None = system default) |

**Behavior**: Pipes image bytes to `lp -d {printer_name} -` via async subprocess. Returns `PrintResult` on success. Raises `PrinterError` if `lp` exits non-zero.

### PrinterConfiguration (Factory)

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `PRINTER_SERVICE` | `str` | `"http"` | Selects implementation: `"http"` or `"cups"` |

**Behavior**: Reads env var at startup. Returns the appropriate `PrinterService` instance. Raises `ValueError` on unrecognized service name.

## Relationships

```text
PrinterService (ABC)
  ├── RemoteHttpPrinter
  └── CupsPrinter

Factory (get_printer_service)
  reads PRINTER_SERVICE env var
  └── returns → PrinterService instance

get_print_image endpoint
  └── calls → printer_service.print_image(png_bytes)
       └── returns → PrintResult → dict response
```

## State Transitions

No stateful entities. Each `print_image()` call is a standalone operation.
The printer service is instantiated once at server startup and reused for all requests.
