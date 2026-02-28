# Tasks: Pluggable Printer Service

**Input**: Design documents from `/specs/002-pluggable-printer/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/printer-service.md

**Tests**: Included per constitution (II. Testing Standards: "Every user-facing behavior MUST be covered by automated tests. External service calls MUST be mocked.")

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

All paths relative to `fastapi-image-search/`:

- `printer/` — new printer service package
- `tests/` — new printer-specific test directory
- `main.py` — existing endpoint file (modified)
- `test_main.py` — existing endpoint tests (modified)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create package structure for the new printer service module

- [ ] T001 Create printer package directory structure: `fastapi-image-search/printer/__init__.py`, `fastapi-image-search/printer/base.py`, `fastapi-image-search/printer/remote_http.py`, `fastapi-image-search/printer/cups.py`, `fastapi-image-search/printer/factory.py`
- [ ] T002 [P] Create test directory structure: `fastapi-image-search/tests/__init__.py`, `fastapi-image-search/tests/test_remote_http_printer.py`, `fastapi-image-search/tests/test_cups_printer.py`, `fastapi-image-search/tests/test_factory.py`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define the printer service interface contract that all implementations depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 Implement `PrintResult` dataclass, `PrinterError` exception, and `PrinterService` ABC with abstract `async print_image(self, image_bytes: bytes) -> PrintResult` in `fastapi-image-search/printer/base.py` per contracts/printer-service.md

**Checkpoint**: Interface contract defined — implementation work can now begin

---

## Phase 3: User Story 1 — Print via Remote HTTP Service (Priority: P1) MVP

**Goal**: Extract the existing `send_to_printer()` into `RemoteHttpPrinter` behind the `PrinterService` interface and wire it into the endpoint via factory, preserving identical behavior.

**Independent Test**: Run server with `PRINTER_SERVICE=http` (or unset), call `/api/print-image`, verify image is forwarded to remote print server with same multipart + `x-pass` header behavior.

### Tests for User Story 1

- [ ] T004 [P] [US1] Write unit tests for `RemoteHttpPrinter` in `fastapi-image-search/tests/test_remote_http_printer.py`: test happy-path POST with mocked httpx (verify multipart file, x-pass header, returns PrintResult), test network error raises PrinterError, test HTTP 4xx/5xx raises PrinterError
- [ ] T005 [P] [US1] Write unit tests for factory (http path only) in `fastapi-image-search/tests/test_factory.py`: test `PRINTER_SERVICE=http` returns RemoteHttpPrinter, test unset `PRINTER_SERVICE` defaults to RemoteHttpPrinter, test missing `PRINT_PASSWORD` for http raises ValueError

### Implementation for User Story 1

- [ ] T006 [US1] Implement `RemoteHttpPrinter` class in `fastapi-image-search/printer/remote_http.py`: constructor takes `server_url` and `password`, `print_image()` POSTs multipart file with `x-pass` header using httpx.AsyncClient, wraps errors in PrinterError
- [ ] T007 [US1] Implement factory function `get_printer_service()` in `fastapi-image-search/printer/factory.py`: reads `PRINTER_SERVICE` env var (default `"http"`), reads `PRINT_SERVER_URL` (default `http://192.168.68.254:1234/print`), reads `PRINT_PASSWORD`, returns `RemoteHttpPrinter` instance. Raises ValueError on missing required env vars.
- [ ] T008 [US1] Update `fastapi-image-search/printer/__init__.py` to re-export `PrinterService`, `PrintResult`, `PrinterError`, `get_printer_service`
- [ ] T009 [US1] Refactor `fastapi-image-search/main.py`: import `get_printer_service` from `printer`, instantiate printer service at module level, replace `send_to_printer(png_bytes, print_password)` call in `get_print_image()` with `printer_service.print_image(png_bytes)`, remove old `send_to_printer()` function and `PRINT_PASSWORD` reading from the endpoint
- [ ] T010 [US1] Update `fastapi-image-search/test_main.py`: update mocks to patch `printer.remote_http.RemoteHttpPrinter.print_image` (or the module-level printer service) instead of `main.send_to_printer`, verify existing test_print_image_success and test_print_image_no_password still pass with equivalent behavior

**Checkpoint**: Server works identically to before through the new interface. All existing tests pass. `send_to_printer()` is removed from main.py.

---

## Phase 4: User Story 2 — Print via Local CUPS (Priority: P1)

**Goal**: Add a `CupsPrinter` implementation that submits image bytes to local CUPS via async `lp` subprocess.

**Independent Test**: Set `PRINTER_SERVICE=cups`, call `/api/print-image`, verify image bytes are piped to `lp` command.

### Tests for User Story 2

- [ ] T011 [P] [US2] Write unit tests for `CupsPrinter` in `fastapi-image-search/tests/test_cups_printer.py`: test happy-path with mocked `asyncio.create_subprocess_exec` (verify `lp -` command, stdin receives image bytes, returns PrintResult), test with specific printer name (verify `-d printer_name` flag), test `lp` non-zero exit raises PrinterError, test `lp` not found raises PrinterError

### Implementation for User Story 2

- [ ] T012 [US2] Implement `CupsPrinter` class in `fastapi-image-search/printer/cups.py`: constructor takes optional `printer_name`, `print_image()` runs `lp [-d printer_name] -` via `asyncio.create_subprocess_exec`, pipes image_bytes to stdin, returns PrintResult on success, raises PrinterError on non-zero exit

**Checkpoint**: CupsPrinter is implemented and unit-tested in isolation. Not yet wired into the factory.

---

## Phase 5: User Story 3 — Swap Printer Service via Configuration (Priority: P2)

**Goal**: Extend factory to support CUPS selection via `PRINTER_SERVICE=cups` env var, validate swap behavior, and handle invalid configuration.

**Independent Test**: Change `PRINTER_SERVICE` env var between `http` and `cups`, restart server, verify print requests route to the correct service.

### Tests for User Story 3

- [ ] T013 [P] [US3] Extend factory tests in `fastapi-image-search/tests/test_factory.py`: test `PRINTER_SERVICE=cups` returns CupsPrinter, test `PRINTER_SERVICE=cups` with `CUPS_PRINTER_NAME=myprinter` passes printer name to CupsPrinter, test `PRINTER_SERVICE=cups` without `CUPS_PRINTER_NAME` creates CupsPrinter with None (system default), test `PRINTER_SERVICE=invalid` raises ValueError with clear message

### Implementation for User Story 3

- [ ] T014 [US3] Extend `get_printer_service()` in `fastapi-image-search/printer/factory.py`: add `"cups"` case that reads `CUPS_PRINTER_NAME` env var (optional) and returns `CupsPrinter` instance, add `else` clause that raises ValueError for unrecognized service names
- [ ] T015 [US3] Update `fastapi-image-search/printer/__init__.py` to also export `RemoteHttpPrinter` and `CupsPrinter` for direct instantiation in tests

**Checkpoint**: Full swap functionality works. `PRINTER_SERVICE=http|cups` controls which implementation is active. Invalid values fail fast.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [ ] T016 Run all tests (`python -m unittest discover -s fastapi-image-search -p "test_*.py" -v`) and verify zero failures
- [ ] T017 Verify backward compatibility: run server with no `PRINTER_SERVICE` set, confirm it defaults to remote HTTP printer and existing behavior is identical
- [ ] T018 Validate quickstart.md instructions work end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational (Phase 2) — the tracer bullet
- **US2 (Phase 4)**: Depends on Foundational (Phase 2) — can run in parallel with US1
- **US3 (Phase 5)**: Depends on US1 (Phase 3) and US2 (Phase 4) — extends the factory
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Depends only on Foundational — can start immediately after Phase 2
- **US2 (P1)**: Depends only on Foundational — can start in parallel with US1
- **US3 (P2)**: Depends on US1 + US2 — factory must know about both implementations

### Within Each User Story

- Tests written FIRST, verified to FAIL before implementation
- Interface/model before service
- Service before endpoint integration
- Story complete before checkpoint

### Parallel Opportunities

- T001 and T002 can run in parallel (different directories)
- T004 and T005 can run in parallel (different test files)
- T011 can run in parallel with all US1 implementation tasks (different files)
- US1 and US2 can be worked on in parallel after Foundational completes
- T013 can run in parallel with T014 (test file vs implementation file)

---

## Parallel Example: User Story 1

```text
# After Phase 2 completes, launch tests in parallel:
Task T004: "Unit tests for RemoteHttpPrinter in tests/test_remote_http_printer.py"
Task T005: "Unit tests for factory (http path) in tests/test_factory.py"

# Then implement sequentially:
Task T006: "RemoteHttpPrinter in printer/remote_http.py"
Task T007: "Factory function in printer/factory.py"
Task T008: "Package exports in printer/__init__.py"
Task T009: "Refactor main.py to use printer service"
Task T010: "Update test_main.py mocks"
```

## Parallel Example: US1 + US2 in Parallel

```text
# After Phase 2 completes, both stories can start simultaneously:
# Developer A works on US1:
Task T004-T010: Full US1 implementation

# Developer B works on US2 (or sequentially after US1):
Task T011: "Unit tests for CupsPrinter"
Task T012: "CupsPrinter implementation"

# Once both complete, US3 can begin
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Foundational (T003)
3. Complete Phase 3: US1 (T004-T010)
4. **STOP and VALIDATE**: Server works identically through new interface, all existing tests pass
5. This is a safe, deployable state — the refactoring is complete with zero behavioral change

### Incremental Delivery

1. Setup + Foundational → Package structure + interface ready
2. Add US1 → Existing behavior extracted behind interface → Deploy (MVP!)
3. Add US2 → CUPS implementation ready and tested in isolation
4. Add US3 → Factory supports both services, swap via env var → Deploy (feature complete!)
5. Polish → Final validation, backward compatibility check

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- No new pip dependencies needed — CUPS integration uses `lp` via subprocess
- The tracer bullet (US1) proves the interface works end-to-end before adding CUPS
- Commit after each task or logical group
- Stop at any checkpoint to validate independently
