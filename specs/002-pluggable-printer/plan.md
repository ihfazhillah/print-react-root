# Implementation Plan: Pluggable Printer Service

**Branch**: `002-pluggable-printer` | **Date**: 2026-02-28 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-pluggable-printer/spec.md`

## Summary

Extract the hardcoded `send_to_printer()` function in `fastapi-image-search/main.py` into a pluggable printer service architecture. Define an abstract `PrinterService` interface with a `print(image)` method, refactor the existing HTTP-based printing as `RemoteHttpPrinter`, add a new `CupsPrinter` implementation using `lp` via async subprocess, and wire service selection through environment variables. No changes to the mobile app or API endpoint contract.

## Technical Context

**Language/Version**: Python 3.10+
**Primary Dependencies**: FastAPI, httpx, BeautifulSoup4, Jinja2, uvicorn (existing); no new pip dependencies needed
**Storage**: N/A (file-based `data.json`, configuration via environment variables)
**Testing**: unittest with FastAPI TestClient (existing pattern in `test_main.py`)
**Target Platform**: Linux server (CUPS available for local printing)
**Project Type**: Web service (backend API + admin dashboard)
**Performance Goals**: N/A (printing is user-initiated, not high-throughput)
**Constraints**: Must preserve `/api/print-image` endpoint behavior exactly; no mobile app changes
**Scale/Scope**: Single server deployment, 1 file to refactor (`main.py`), 2 new modules (printer service + CUPS implementation)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Extracting interface follows single-responsibility. Magic URL/port moved to env vars. Type hints on interface. |
| II. Testing Standards | PASS | Both implementations will have unit tests with mocked externals. Existing tests must pass. |
| III. Bullet-Tracing | PASS | Tracer bullet: extract interface + refactor existing HTTP impl first, then add CUPS. |
| IV. User Experience First | PASS | No UX change. Admin configures via env vars with clear error messages. Mobile app unaffected. |
| V. Performance | PASS | No performance optimization involved. Async subprocess for CUPS avoids blocking event loop. |

No violations. No complexity tracking needed.

## Project Structure

### Documentation (this feature)

```text
specs/002-pluggable-printer/
├── plan.md              # This file
├── research.md          # Phase 0: CUPS integration research
├── data-model.md        # Phase 1: Entity/interface model
├── quickstart.md        # Phase 1: Dev setup guide
├── contracts/           # Phase 1: Interface contracts
│   └── printer-service.md
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
fastapi-image-search/
├── main.py                          # Existing: endpoint wiring, imports printer service
├── test_main.py                     # Existing: endpoint tests (updated)
├── printer/                         # NEW: printer service package
│   ├── __init__.py                  # Re-exports: get_printer_service, PrinterService
│   ├── base.py                      # PrinterService ABC (interface)
│   ├── remote_http.py               # RemoteHttpPrinter implementation
│   ├── cups.py                      # CupsPrinter implementation
│   └── factory.py                   # Factory: env var → service instance
├── tests/                           # NEW: printer-specific tests
│   ├── __init__.py
│   ├── test_remote_http_printer.py  # Unit tests for remote HTTP impl
│   ├── test_cups_printer.py         # Unit tests for CUPS impl
│   └── test_factory.py              # Unit tests for factory/config
└── pyproject.toml                   # Unchanged (no new dependencies)
```

**Structure Decision**: New `printer/` package inside `fastapi-image-search/` keeps the service layer isolated from the monolithic `main.py`. Tests in `tests/` subdirectory for printer-specific logic; existing `test_main.py` continues to test endpoint integration.
