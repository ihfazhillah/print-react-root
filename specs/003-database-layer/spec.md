# Feature Specification: Database Layer for Printable Pages

**Feature Branch**: `003-database-layer`
**Created**: 2026-02-28
**Status**: Draft
**Input**: User description: "Add database layer to the backend, use current data.json as initial seed data with a population script. Subsequent queries served from the database. Rationale: better maintainability of printable pages, tracking children interactions, training data for predictions."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Seed Database from Existing Data (Priority: P1)

An administrator runs a seed script that reads the existing data.json file (2,140 printable page entries from krokotak) and populates the database. After seeding, the backend serves all printable page data from the database instead of the JSON file. The mobile app and any other clients experience no change in behavior — they receive the same data as before.

**Why this priority**: This is the foundational story. Without the database and seed mechanism, no other stories (tracking, management, predictions) are possible. It also ensures zero regression for existing users.

**Independent Test**: Can be fully tested by running the seed script, then calling the existing API endpoints and verifying the responses match what data.json previously returned.

**Acceptance Scenarios**:

1. **Given** a fresh database with no data, **When** the administrator runs the seed script pointing at data.json, **Then** all 2,140 entries are imported with their thumbnails, URLs, tags, and type preserved.
2. **Given** the database has been seeded, **When** a client requests printable pages, **Then** the response data matches the previous data.json-based response (same structure, same content).
3. **Given** the seed script has already been run, **When** it is run again, **Then** existing data is not duplicated (idempotent operation).

---

### User Story 2 - Manage Printable Pages via Database (Priority: P2)

An administrator can add, update, or remove printable page entries directly in the database without editing a JSON file. New entries from additional sources (beyond krokotak) can be added over time. The system tracks which source each entry came from.

**Why this priority**: This unlocks the "add as much as we can" goal — the ability to grow the catalog from multiple sources is the primary business motivation for moving to a database.

**Independent Test**: Can be tested by adding a new printable page entry to the database and verifying it appears in API responses, then removing it and confirming it disappears.

**Acceptance Scenarios**:

1. **Given** a seeded database, **When** an administrator adds a new printable page entry, **Then** it appears in subsequent API queries.
2. **Given** a printable page exists in the database, **When** an administrator updates its tags, **Then** the updated tags are reflected in search results.
3. **Given** a printable page exists in the database, **When** an administrator removes it, **Then** it no longer appears in API responses.

---

### User Story 3 - Track Children's Interactions (Priority: P3)

The system records when a child views, selects, or prints a printable page. Each interaction is stored with a timestamp and the identifier of the child (or device/session). This interaction history is available for later analysis and prediction training.

**Why this priority**: Interaction tracking is essential for the prediction/recommendation goal, but it depends on having the database layer (US1) in place first. It delivers value independently by enabling usage analytics.

**Independent Test**: Can be tested by simulating a child selecting a printable page through the app, then querying the database to confirm the interaction was recorded with correct details.

**Acceptance Scenarios**:

1. **Given** a child is using the app, **When** they view a printable page, **Then** the system records the interaction (page identifier, timestamp, interaction type).
2. **Given** multiple children use the app over time, **When** an administrator queries interaction history, **Then** they can see all recorded interactions grouped by child/session.
3. ~~Offline queuing~~ — Deferred to a future mobile app feature. Backend accepts interactions when submitted; offline queuing is a client-side concern outside this feature's scope.

---

### Edge Cases

- ~~What happens when the seed script encounters malformed entries in data.json?~~ → Resolved: skip and log warning (FR-008).
- ~~How does the system handle a database connection failure?~~ → Resolved: return HTTP 503, no fallback to data.json.
- What happens when two seed script runs overlap (concurrent execution)?
- How does the system handle interaction tracking when the child/session identifier is not available?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a seed script that imports all entries from data.json into the database.
- **FR-002**: The seed script MUST be idempotent — running it multiple times produces the same result without duplicating data.
- **FR-003**: System MUST serve printable page data from the database for all existing API endpoints.
- **FR-004**: System MUST preserve the existing API response format so that current clients are not affected. An `id` field is added to item responses to enable database-backed operations; existing fields remain unchanged.
- **FR-005**: System MUST store the source origin for each printable page entry (e.g., "krokotak" for the initial seed data).
- **FR-006**: System MUST expose REST API endpoints for adding, updating, and removing printable page entries.
- **FR-007**: System MUST record user/child interactions (view, select, print) with timestamps and session/device identifiers. Views are inferred server-side from existing page-detail API calls (no mobile app changes required); select and print events are sent by the app to a new dedicated POST endpoint (e.g., `/interactions`).
- **FR-008**: System MUST validate seed data entries and skip or report entries that are missing required fields (thumbnail, URL).
- **FR-009**: System MUST return HTTP 503 (Service Unavailable) when the database is unreachable — no fallback to data.json.

### Key Entities

- **PrintablePage**: A single printable page with a thumbnail image URL, a print URL, a type (print or collection), and a source origin. Related to one or more Tags.
- **Tag**: A keyword/category label (e.g., "animals", "autumn", "craft-coloring") that can be associated with multiple PrintablePages. Tags are used for search and filtering.
- **Interaction**: A record of a child's engagement with a PrintablePage, including the interaction type (view, select, print), a timestamp, and a session/device identifier.

## Clarifications

### Session 2026-02-28

- Q: Which database engine should be used? → A: SQLite (file-based, zero config, co-located)
- Q: How should admins manage printable pages (US2)? → A: New REST API endpoints for CRUD (need actual page management, not just DB tooling)
- Q: Database connection failure strategy? → A: Return HTTP 503 error (no fallback to data.json)
- Q: How should interaction tracking events reach the backend? → A: Hybrid — infer views from existing API calls, new explicit POST endpoint for select/print. Must not break existing mobile app behavior.
- Q: Which database access library? → A: `aiosqlite` (async SQLite wrapper, fits FastAPI's async style)

### Session 2026-03-01

- Q: Should admin CRUD endpoints be auth-protected? → A: No auth — service runs locally/on local network, trust network-level restriction.

## Assumptions

- The existing data.json structure (thumbnail, url, searches, type) is stable and will not change before this feature is implemented.
- "Session/device identifier" for interaction tracking will use the device/session information already available from the mobile app — no new authentication system is required for this feature.
- The seed script is run manually by an administrator (not automatically on app startup).
- The database will be SQLite, co-located with the backend service as a single file (no separate database server required).
- Admin CRUD endpoints have no authentication — the service runs on a local/trusted network.
- Database access uses `aiosqlite` (installed via `uv add aiosqlite`) for async compatibility with FastAPI.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 2,140 existing printable page entries are available through the database-backed API with 100% data fidelity compared to the original data.json.
- **SC-002**: The seed script completes in under 30 seconds for the full data.json dataset.
- **SC-003**: API response times for listing and searching printable pages remain under 500ms after switching to the database.
- **SC-004**: New printable page entries added to the database appear in API responses within 1 second (no caching delay).
- **SC-005**: 100% of child interactions (view, select, print) are recorded when the device has network connectivity.
