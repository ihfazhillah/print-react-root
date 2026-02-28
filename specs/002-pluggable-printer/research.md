# Research: Pluggable Printer Service

**Feature**: 002-pluggable-printer
**Date**: 2026-02-28

## R1: CUPS Integration Approach

**Decision**: Use `lp` command via `asyncio.create_subprocess_exec`

**Rationale**: This approach is natively async (does not block the FastAPI event loop), requires no additional Python dependencies or C compilation, provides process isolation (a hung CUPS call won't crash the server), and can pipe image bytes directly via stdin (`lp -`).

**Alternatives considered**:

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **pycups** (C extension) | Rich API, printer discovery | Blocking (not async), requires libcups2-dev + C compiler, potential segfaults | Rejected: blocking C ext in async server |
| **pyipp** (pure Python, async) | Natively async, no CUPS install needed | Requires knowing printer URI upfront, adds dependency | Rejected: adds dependency, overkill for local CUPS |
| **subprocess `lp`** | Async via create_subprocess_exec, zero deps, stdin pipe, process isolation | Less rich API than pycups | **Selected** |
| **Raw IPP over httpx** | No deps | Must hand-encode IPP binary format | Rejected: too complex |

## R2: Plugin/Strategy Pattern in Python

**Decision**: Use `abc.ABC` with `abstractmethod` for the `PrinterService` interface

**Rationale**: ABCs provide clear contract enforcement at instantiation time (TypeError if `print_image` not implemented). Python's `Protocol` (structural typing) would also work but ABCs are more explicit and self-documenting for a small codebase with few implementations.

**Alternatives considered**:

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **abc.ABC** | Explicit contract, runtime enforcement, self-documenting | Requires inheritance | **Selected** |
| **typing.Protocol** | Structural typing, no inheritance needed | No runtime enforcement unless using `runtime_checkable`, less discoverable | Rejected: overkill for 2-3 implementations |
| **Duck typing** | No boilerplate | No contract enforcement, easy to miss methods | Rejected: too loose |

## R3: Service Factory / Configuration

**Decision**: Simple factory function reading environment variables at startup

**Rationale**: The server is configured once at startup. A factory function called during FastAPI lifespan reads `PRINTER_SERVICE` env var and instantiates the appropriate implementation. This matches the existing pattern in `main.py` where `PRINT_PASSWORD` is already read from env vars.

**Environment variables**:

| Variable | Values | Default | Description |
|----------|--------|---------|-------------|
| `PRINTER_SERVICE` | `http`, `cups` | `http` | Selects active printer implementation |
| `PRINT_SERVER_URL` | URL string | `http://192.168.68.254:1234/print` | Remote print server URL (http only) |
| `PRINT_PASSWORD` | string | *(required for http)* | Password for remote print server (http only) |
| `CUPS_PRINTER_NAME` | string | *(system default)* | CUPS printer name override (cups only) |

**Alternatives considered**:

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Env vars + factory function** | Simple, standard, matches existing pattern | Requires restart to change | **Selected** |
| **Config file (YAML/TOML)** | Structured, supports complex config | Adds dependency or complexity, overkill | Rejected |
| **FastAPI dependency injection** | Testable, Pythonic | Over-engineered for 1 consumer | Rejected for factory; DI used only in tests |

## R4: Async Compatibility

**Decision**: Make `PrinterService.print_image()` an `async` method

**Rationale**: Both implementations are inherently async — the HTTP implementation uses `httpx.AsyncClient` and the CUPS implementation uses `asyncio.create_subprocess_exec`. Making the interface async ensures the event loop is never blocked.

## R5: Error Handling Strategy

**Decision**: Raise `PrinterError` (custom exception) from implementations; endpoint catches and returns HTTP 500

**Rationale**: A custom exception type allows the endpoint to distinguish printer errors from other failures. Each implementation wraps its specific error (httpx errors, subprocess non-zero exit) into a `PrinterError` with a human-readable message. The existing error handling pattern in `get_print_image()` already catches exceptions and returns HTTP 500.
