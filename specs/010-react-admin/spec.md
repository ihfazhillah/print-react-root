# Feature Specification: React Admin Dashboard

**Feature Branch**: `010-react-admin`
**Created**: 2026-03-08
**Status**: Implemented
**Input**: User description: "Change frontend to React. We need to make it more maintainable as we will add more and more features on top of it."

## Clarifications

### Session 2026-03-08

- Q: How is the React dashboard served/deployed? → A: Built to static files, served by the same FastAPI server.
- Q: Which parts of the current UI are in scope? → A: All 3 tabs (search, admin, insights) migrated; search treated as admin content lookup tool.
- Q: Migration cutover strategy? → A: Coexist during development — old at `/`, new at `/admin`; remove old after validated.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse and Search Content (Priority: P1)

An administrator opens the admin dashboard and sees the content library. They can browse paginated pages, search by keyword, and filter by tag. They can view thumbnails and metadata (URL, type, source, tags) for each page.

**Why this priority**: This is the foundational view — every admin session starts with browsing or searching content. If only this story is implemented, the admin can already use the new dashboard for daily content review.

**Independent Test**: Can be tested by opening the admin dashboard, verifying pages load in a paginated table, searching for a keyword, and filtering by tag.

**Acceptance Scenarios**:

1. **Given** the admin opens the dashboard, **When** the page loads, **Then** they see a paginated list of printable pages with thumbnails, URLs, types, sources, and tags.
2. **Given** the admin types a search term, **When** results update, **Then** only matching pages are shown.
3. **Given** the admin types a tag name in the search box and submits, **When** the list refreshes, **Then** only pages matching that tag are shown.
4. **Given** there are more than 20 pages, **When** the admin navigates to the next page, **Then** the next batch loads without full page reload.
5. **Given** the admin selects a source from the source dropdown, **When** the list refreshes, **Then** only pages from that source are shown.

---

### User Story 2 - Manage Pages (CRUD) (Priority: P2)

An administrator can add new printable pages, edit existing page details (URL, thumbnail, type, source, tags), and delete pages. All changes persist immediately and the page list updates without navigating away.

**Why this priority**: Content management is the primary admin workflow — adding new scraped content, correcting metadata, and removing broken entries.

**Independent Test**: Can be tested by creating a new page, editing its tags, and deleting it, verifying each action updates the list.

**Acceptance Scenarios**:

1. **Given** the admin clicks "Add Page", **When** they fill in the form and submit, **Then** the new page appears in the list.
2. **Given** the admin clicks "Edit" on a page, **When** they change the tags and save, **Then** the updated tags are reflected in the list.
3. **Given** the admin clicks "Delete" on a page, **When** they confirm, **Then** the page is removed from the list.
4. **Given** the admin submits a form with invalid data (e.g., empty URL), **When** validation runs, **Then** an error message is shown and submission is blocked.

---

### User Story 3 - Manage Tags (Priority: P3)

An administrator can view all tags with their Indonesian translations, add new tags, edit tag names/translations, delete tags, toggle blocked status, and trigger bulk translation of untranslated tags.

**Why this priority**: Tag management supports content organization but is less frequent than page management.

**Independent Test**: Can be tested by adding a new tag, editing its translation, toggling blocked, deleting it, and running bulk translation.

**Acceptance Scenarios**:

1. **Given** the admin opens the Tags section, **When** it loads, **Then** they see a paginated list of tags with name and Indonesian translation.
2. **Given** the admin adds a new tag, **When** they submit, **Then** the tag appears in the list.
3. **Given** the admin clicks "Translate All", **When** translation completes, **Then** previously untranslated tags now show Indonesian translations.
4. **Given** the admin toggles a tag's blocked status, **When** they save, **Then** the tag is marked as blocked and pages with only that tag are hidden from children.
5. **Given** the admin types a search term in the tag search box, **When** they submit, **Then** only matching tags are shown.
6. **Given** the admin clicks "View" on a tag, **When** they are redirected, **Then** the Pages view opens pre-filtered with that tag's name as the search query.

---

### User Story 4 - Manage Devices (Priority: P4)

An administrator can view all registered devices, rename them, toggle admin status, deactivate devices, and merge duplicate devices. The device list shows name, registration date, active/inactive status, and admin flag.

**Why this priority**: Device management is needed but is an infrequent administrative task.

**Independent Test**: Can be tested by renaming a device, toggling its admin flag, and merging two devices.

**Acceptance Scenarios**:

1. **Given** the admin opens the Devices section, **When** it loads, **Then** they see a list of devices with name, registration date, status, and admin flag.
2. **Given** the admin renames a device, **When** they save, **Then** the new name is shown in the list.
3. **Given** the admin selects two devices to merge, **When** they confirm, **Then** all activity from the source device is transferred to the target device.
4. **Given** the admin toggles "Show inactive", **When** the list refreshes, **Then** deactivated devices appear in the list.
5. **Given** the admin types a name in the filter input, **When** they type, **Then** the device list is instantly narrowed to matching names.

---

### User Story 5 - View Usage Insights (Priority: P5)

An administrator can view analytics: per-child activity summaries (views, details, prints), top tags per child, most-printed images, shared and unique interests across children. They can drill into a specific child's activity timeline.

**Why this priority**: Insights are a read-only reporting feature — valuable but not blocking core admin workflows.

**Independent Test**: Can be tested by opening the insights view, verifying summary cards for each child, and clicking through to a child's timeline.

**Acceptance Scenarios**:

1. **Given** the admin opens Insights, **When** the page loads, **Then** they see per-child summary cards with view/detail/print counts.
2. **Given** the admin clicks on a child's card, **When** the detail view opens, **Then** they see a chronological activity timeline with thumbnails and timestamps.
3. **Given** the admin views "Most Printed", **When** the section loads, **Then** the top 10 most-printed images are shown with print counts and tags.
4. **Given** there are multiple children, **When** the admin views "Shared Interests", **Then** tags that multiple children have printed are highlighted.

---

### Edge Cases

- What happens when the backend is unreachable? The dashboard shows a clear connection error with retry option.
- What happens when an admin deletes a page that has activity events? The page is removed but historical events remain intact.
- What happens when merging devices fails midway? The merge is atomic — either all events transfer or none do.
- What happens with concurrent admin edits? Last-write-wins; lists refresh after mutations to reflect current state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Dashboard MUST display all existing admin functionality: page CRUD, tag management, device management, and usage insights.
- **FR-002**: Dashboard is built to static files and served by the same FastAPI server. Minor backend additions were made during implementation: `GET /api/sources` endpoint, `source=` query filter on items/search, and `q=` search filter on tags.
- **FR-003**: All list views MUST support pagination without full page reloads.
- **FR-004**: All create/edit operations MUST validate input before submission and show clear error messages.
- **FR-005**: Dashboard MUST provide visual feedback during loading states and after successful/failed operations.
- **FR-006**: Dashboard MUST be navigable via URL-based routing (e.g., bookmarkable pages for Insights, Devices, Tags).
- **FR-007**: Dashboard MUST display the same data and support the same actions as the current Jinja2-based admin interface.
- **FR-008**: Search and filter operations MUST update results without full page reload.
- **FR-009**: Dashboard MUST work on desktop browsers (Chrome, Firefox) at standard screen sizes (1024px+).

### Non-Functional Requirements

- **NFR-001**: Adding a new admin feature (e.g., a new CRUD section) MUST require changes in at most 3 files.
- **NFR-002**: Shared UI patterns (tables, modals, forms) MUST be reusable across sections.
- **NFR-003**: Dashboard state management MUST prevent stale data after mutations (create/update/delete).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 5 admin workflows (pages, tags, devices, insights, search) function identically to the current interface.
- **SC-002**: Adding a new simple CRUD section (e.g., managing a new entity) takes less than 1 hour of development time.
- **SC-003**: Dashboard loads initial content within 2 seconds on local network.
- **SC-004**: No admin workflow requires more than 3 clicks to reach from the main navigation.
- **SC-005**: Zero regressions — every action available in the current admin interface is available in the new one.

## Assumptions

- The existing backend API endpoints were sufficient for the core migration. Additional endpoints (`/api/sources`, `source=` and `q=` filters) were added to support new search/filter capabilities.
- The admin dashboard is used by a single administrator on a local network — no multi-user concurrency concerns.
- Migration is complete: the React dashboard is served at `/admin`. Old Jinja2 templates and static JS files have been removed.
- The admin dashboard is desktop-only (no mobile responsive design required).
- Authentication is handled at the network level (no login screen needed).
