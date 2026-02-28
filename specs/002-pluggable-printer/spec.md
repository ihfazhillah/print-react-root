# Feature Specification: Pluggable Printer Service

**Feature Branch**: `002-pluggable-printer`
**Created**: 2026-02-28
**Status**: Draft
**Input**: User description: "Make printer service pluggable. Current printer service uses an HTTP endpoint with send_to_printer (byte + password). Extract as service with interface called `print(image)`, add a local CUPS printing service, and allow swapping between the two."

## Clarifications

### Session 2026-02-28

- Q: How does the CUPS printer service get invoked - mobile app change, new backend endpoint, or server-side config? → A: Server-side configuration only. No changes to mobile app, no changes to API endpoint. The printer service is selected per server configuration (not user-configurable via web). Architecture should be extensible to future implementations (Windows printing, shared printers, etc.).
- Q: Which CUPS printer should the CUPS service target? → A: System default CUPS printer, with optional override via server configuration.
- Q: How should the server configuration for selecting the printer service be provided? → A: Environment variables (e.g., `PRINTER_SERVICE=cups`, `CUPS_PRINTER_NAME=myprinter`).
- Q: When the active printer service becomes unavailable at runtime, how should the system behave? → A: Return error per print request; server stays running and other endpoints remain unaffected. No automatic fallback to another printer service.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Print via Remote HTTP Service (Priority: P1)

As a server operator, I want the existing remote HTTP-based printing to continue working as the default so that current deployments experience no disruption after the refactoring.

**Why this priority**: This is the existing behavior. Preserving backward compatibility ensures zero regression while the architecture is refactored.

**Independent Test**: Can be fully tested by running the server with remote HTTP printer configured, calling the print endpoint, and verifying the image is forwarded to the remote print server.

**Acceptance Scenarios**:

1. **Given** the server is configured to use the remote HTTP printer, **When** a print request arrives at `/api/print-image`, **Then** the image is forwarded to the remote print server and a success response is returned.
2. **Given** the server is configured to use the remote HTTP printer, **When** the remote print server is unreachable, **Then** the API returns an appropriate error response.
3. **Given** no explicit printer service is configured, **When** a print request arrives, **Then** the system defaults to the remote HTTP printer (backward-compatible).

---

### User Story 2 - Print via Local CUPS (Priority: P1)

As a server operator, I want to configure the server to print directly via local CUPS so that I can print without depending on a remote print server.

**Why this priority**: This is the primary new capability requested. Local CUPS printing provides a direct alternative that eliminates the remote server dependency.

**Independent Test**: Can be fully tested by configuring the server to use CUPS, calling the print endpoint, and verifying the image is submitted to the local CUPS print queue.

**Acceptance Scenarios**:

1. **Given** the server is configured to use the local CUPS printer, **When** a print request arrives at `/api/print-image`, **Then** the image is submitted to the CUPS print queue and a success response is returned.
2. **Given** the server is configured to use CUPS, **When** CUPS is unavailable or no printer is configured in CUPS, **Then** the API returns an appropriate error response.
3. **Given** the server is configured to use CUPS, **When** the print job submission fails, **Then** the API returns an appropriate error response.

---

### User Story 3 - Swap Printer Service via Server Configuration (Priority: P2)

As a server operator, I want to swap the active printer service by changing a server configuration value so that I can choose the appropriate printing method for my deployment environment.

**Why this priority**: This is the configuration mechanism that ties the two implementations together. It builds on top of both working printer services.

**Independent Test**: Can be fully tested by changing the server configuration value and restarting (or reloading) the server, then verifying print requests route to the newly selected service.

**Acceptance Scenarios**:

1. **Given** the server configuration specifies the remote HTTP printer, **When** the server starts, **Then** all print requests are routed through the remote HTTP printer service.
2. **Given** the server configuration specifies the local CUPS printer, **When** the server starts, **Then** all print requests are routed through the CUPS printer service.
3. **Given** an invalid or unknown printer service is specified in configuration, **When** the server starts, **Then** the server fails fast with a clear error message indicating the misconfiguration.

---

### Edge Cases

- If the configured printer service becomes unavailable after server startup (e.g., CUPS daemon stops), each print request returns an error. The server continues running and other endpoints remain unaffected. No automatic fallback to another service.
- If the remote HTTP print server credentials (password) are missing or invalid, the print request returns an authentication error.
- If CUPS has no printers configured and no printer name override is set, the print request returns an error indicating no printer is available.
- If the server configuration value is missing entirely, the system defaults to the remote HTTP printer for backward compatibility.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST define a common printer service interface with a `print(image)` operation that all printer implementations conform to.
- **FR-002**: System MUST provide a remote HTTP printer implementation that sends image bytes to the remote print server with password authentication (preserving current `send_to_printer` behavior).
- **FR-003**: System MUST provide a local CUPS printer implementation that submits image bytes to the local CUPS print queue, using the system default printer unless a specific printer name is provided via server configuration.
- **FR-004**: System MUST select the active printer service based on environment variables (not user-facing).
- **FR-005**: System MUST default to the remote HTTP printer when no printer service is explicitly configured (backward compatibility).
- **FR-006**: Both printer implementations MUST return consistent success and error responses through the common interface.
- **FR-007**: The `/api/print-image` endpoint behavior MUST remain unchanged from the caller's perspective (same request format, same response format) regardless of which printer service is active.
- **FR-008**: System MUST handle errors gracefully for both printer services, including service unavailability, authentication failures, and configuration errors.
- **FR-009**: The printer service interface MUST be extensible so that new printer implementations can be added in the future without modifying existing code or the API endpoint.

### Key Entities

- **PrinterService**: The abstraction defining the `print(image)` contract that all implementations must fulfill.
- **RemoteHttpPrinter**: Implementation that forwards image bytes to a remote HTTP print server (current behavior extracted).
- **LocalCupsPrinter**: Implementation that submits image bytes to a local CUPS print queue.
- **PrinterConfiguration**: Environment variables that determine which printer service implementation is active and its settings (e.g., printer name, remote server URL, credentials).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The existing print workflow continues to work identically when configured with the remote HTTP printer (zero regression).
- **SC-002**: Images can be printed via local CUPS when the server is configured to use CUPS.
- **SC-003**: Swapping between printer services requires only a configuration change and server restart — no code changes.
- **SC-004**: All existing print-related tests continue to pass after the refactoring.
- **SC-005**: Adding a new printer implementation in the future requires only creating a new class conforming to the interface and registering it — no modifications to the endpoint or existing implementations.

## Assumptions

- The backend server (FastAPI Python application) is the sole location of this refactoring. No mobile app or API endpoint changes are needed.
- The current `send_to_printer()` function in `main.py` is the code to be extracted behind the new interface.
- CUPS is available on the server where the backend runs (installed and configured separately from this application).
- The remote HTTP printer remains the default when no explicit configuration is provided.
- The CUPS service targets the system default printer by default. A specific printer name can be overridden via server configuration.
- The server operator is responsible for ensuring the selected printer service's dependencies are available (e.g., CUPS daemon running for CUPS, network access for remote HTTP).
