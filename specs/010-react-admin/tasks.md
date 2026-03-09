# Tasks: React Admin Dashboard

**Input**: Design documents from `/specs/010-react-admin/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included per constitution (E2E tests for each user story).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Initialize the React project with Vite, TypeScript, and core dependencies.

- [X] T001 Initialize Vite + React + TypeScript project in `admin-ui/` with `npm create vite@latest`
- [X] T002 Install dependencies: @tanstack/react-query, @tanstack/react-table, @tanstack/react-router in `admin-ui/package.json`
- [X] T003 [P] Configure Vite dev server proxy for `/api/*` to `http://localhost:8080` in `admin-ui/vite.config.ts`
- [X] T004 [P] Configure TypeScript strict mode in `admin-ui/tsconfig.json`
- [X] T005 [P] Configure ESLint for TypeScript + React in `admin-ui/`
- [X] T006 [P] Install and configure Vitest + @testing-library/react in `admin-ui/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: API client, types, context provider, shared components — needed by ALL user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T007 Define all API response TypeScript types (Page, Tag, Device, Insights types) in `admin-ui/src/types/api.ts` per data-model.md
- [X] T008 Implement `createAdminApiClient(baseUrl)` factory with native `fetch` in `admin-ui/src/api/client.ts` per contracts/admin-api-client.md — include all endpoint methods (items, pages, tags, devices, insights)
- [X] T009 Create `AdminApiClientContext` provider and `useAdminApiClient()` hook in `admin-ui/src/api/apiClientContext.tsx`
- [X] T010 [P] Implement reusable `DataTable` component wrapping TanStack Table (columns, data, pagination) in `admin-ui/src/components/DataTable.tsx`
- [X] T011 [P] Implement reusable `Modal` component (open, onClose, title, children) in `admin-ui/src/components/Modal.tsx`
- [X] T012 [P] Implement `Toast` notification system with `useToast()` hook in `admin-ui/src/components/Toast.tsx`
- [X] T013 [P] Implement `ConfirmDialog` component (open, onConfirm, onCancel, title, message) in `admin-ui/src/components/ConfirmDialog.tsx`
- [X] T014 Implement `Layout` component with sidebar navigation (Pages, Tags, Devices, Insights links) in `admin-ui/src/components/Layout.tsx`
- [X] T015 Configure TanStack Router with routes relative to basepath `/admin` (/, /tags, /devices, /insights, /insights/$deviceId) in `admin-ui/src/routeTree.tsx` and `admin-ui/src/App.tsx`
- [X] T016 Create `main.tsx` entry point with QueryClientProvider + ApiClientContext + Router in `admin-ui/src/main.tsx`
- [X] T017 Add FastAPI mount for static files at `/admin` with SPA catch-all in `fastapi-image-search/main.py`
- [X] T018 Add base CSS with color scheme (purple/teal from existing dashboard) in `admin-ui/src/index.css`

**Checkpoint**: Foundation ready — app shell renders at `/admin` with navigation, shared components available.

---

## Phase 3: User Story 1 - Browse and Search Content (Priority: P1) 🎯 MVP

**Goal**: Admin sees paginated content table with search and tag filtering at `/admin`.

**Independent Test**: Open `/admin`, verify pages load in table, search by keyword, filter by tag.

### Implementation for User Story 1

- [X] T019 [US1] Implement `usePages(skip, limit)` and `useSearch(q, skip, limit)` query hooks in `admin-ui/src/hooks/usePages.ts`
- [X] T020 [US1] Implement `PagesPage` with TanStack Table (columns: thumbnail, URL, type, source, tags), pagination, search input, and tag filter buttons in `admin-ui/src/pages/PagesPage.tsx`
- [X] T021 [US1] Add image proxy URL rendering for thumbnails using `client.proxyImageUrl()` in `admin-ui/src/pages/PagesPage.tsx`
- [X] T022 [US1] Wire PagesPage as default route (`/admin`) in `admin-ui/src/App.tsx`
- [X] T044 [US1] Add source filter dropdown to PagesPage; add `GET /api/sources` endpoint and `source=` query param to items/search in `fastapi-image-search/main.py`, `fastapi-image-search/db.py`, `admin-ui/src/api/client.ts`, `admin-ui/src/pages/PagesPage.tsx`

**Checkpoint**: Browse and search works end-to-end at `/admin`. Validate with quickstart.md US1 scenarios.

---

## Phase 4: User Story 2 - Manage Pages (CRUD) (Priority: P2)

**Goal**: Admin can add, edit, and delete pages from the content table.

**Independent Test**: Create a new page, edit its tags, delete it — all reflected in the table.

### Implementation for User Story 2

- [X] T023 [US2] Implement `useCreatePage()`, `useUpdatePage()`, `useDeletePage()` mutation hooks with query invalidation in `admin-ui/src/hooks/usePages.ts`
- [X] T024 [US2] Implement page create/edit form modal with validation (URL required, type selection, tag input) in `admin-ui/src/pages/PagesPage.tsx`
- [X] T025 [US2] Add delete button with ConfirmDialog to page rows in `admin-ui/src/pages/PagesPage.tsx`
- [X] T026 [US2] Add "Add Page" button to PagesPage toolbar triggering the create modal in `admin-ui/src/pages/PagesPage.tsx`

**Checkpoint**: Full page CRUD works. Validate with quickstart.md US2 scenarios.

---

## Phase 5: User Story 3 - Manage Tags (Priority: P3)

**Goal**: Admin can view, add, edit, delete, block tags and trigger bulk translation at `/admin/tags`.

**Independent Test**: Navigate to `/admin/tags`, add a tag, edit its translation, toggle blocked, run bulk translate.

### Implementation for User Story 3

- [X] T027 [US3] Implement `useTags(skip, limit)`, `useCreateTag()`, `useUpdateTag()`, `useDeleteTag()`, `useTranslateAll()`, `useToggleBlocked()` hooks in `admin-ui/src/hooks/useTags.ts`
- [X] T028 [US3] Implement `TagsPage` with TanStack Table (columns: name, translation, blocked status), pagination, and CRUD modals in `admin-ui/src/pages/TagsPage.tsx`
- [X] T029 [US3] Add "Translate All" button with loading state and success toast in `admin-ui/src/pages/TagsPage.tsx`
- [X] T030 [US3] Add blocked toggle per tag row with immediate update in `admin-ui/src/pages/TagsPage.tsx`
- [X] T045 [US3] Add tag name search input (server-side `q=` filter) and "View" button per row (navigates to `/?q=<tag>`) in `admin-ui/src/pages/TagsPage.tsx`; add `q=` param support to `GET /api/tags` in `fastapi-image-search/db.py` and `fastapi-image-search/main.py`

**Checkpoint**: Tag management works. Validate with quickstart.md US3 scenarios.

---

## Phase 6: User Story 4 - Manage Devices (Priority: P4)

**Goal**: Admin can view, rename, toggle admin, deactivate, and merge devices at `/admin/devices`.

**Independent Test**: Navigate to `/admin/devices`, rename a device, toggle admin, merge two devices.

### Implementation for User Story 4

- [X] T031 [US4] Implement `useDevices(includeInactive)`, `useRenameDevice()`, `useToggleAdmin()`, `useDeactivateDevice()`, `useMergeDevices()` hooks in `admin-ui/src/hooks/useDevices.ts`
- [X] T032 [US4] Implement `DevicesPage` with TanStack Table (columns: name, ID, registered_at, active, admin), "Show inactive" toggle in `admin-ui/src/pages/DevicesPage.tsx`
- [X] T033 [US4] Add rename modal, admin toggle checkbox, and deactivate button with ConfirmDialog in `admin-ui/src/pages/DevicesPage.tsx`
- [X] T034 [US4] Add merge devices dialog (source/target selection dropdowns, confirm) in `admin-ui/src/pages/DevicesPage.tsx`
- [X] T046 [US4] Add client-side device name filter input above the devices table in `admin-ui/src/pages/DevicesPage.tsx`

**Checkpoint**: Device management works. Validate with quickstart.md US4 scenarios.

---

## Phase 7: User Story 5 - View Usage Insights (Priority: P5)

**Goal**: Admin can view per-child summaries, top tags, top images, shared interests, and drill into activity timelines at `/admin/insights`.

**Independent Test**: Navigate to `/admin/insights`, verify summary cards, click a child to see timeline.

### Implementation for User Story 5

- [X] T035 [US5] Implement `useInsightsSummary()`, `useTopTags()`, `useTopImages()`, `useInterests()`, `useDeviceTimeline(deviceId)` hooks in `admin-ui/src/hooks/useInsights.ts`
- [X] T036 [US5] Implement `InsightsPage` with summary cards (per-child views/details/prints), top tags, top images grid, shared/unique interests in `admin-ui/src/pages/InsightsPage.tsx`
- [X] T037 [US5] Implement `DeviceTimelinePage` with chronological event list (type, thumbnail, timestamp) grouped by date in `admin-ui/src/pages/DeviceTimelinePage.tsx`
- [X] T038 [US5] Add click-through from child summary card to `/admin/insights/:deviceId` timeline in `admin-ui/src/pages/InsightsPage.tsx`

**Checkpoint**: Insights and timeline work. Validate with quickstart.md US5 scenarios.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T039 Build production output to `fastapi-image-search/static/admin/` via `npm run build` in `admin-ui/vite.config.ts`
- [ ] T040 Add error boundary with connection error + retry for backend unreachable in `admin-ui/src/App.tsx`
- [X] T041 Add loading skeletons/spinners for all data-fetching views in `admin-ui/src/components/`
- [X] T042 Validate all quickstart.md scenarios side-by-side with old dashboard
- [X] T043 Restart service `systemctl --user restart km-kraft.service` and verify `/admin` serves the React dashboard
- [X] T047 [US3] Add "View" button per tag row navigating to Pages filtered by tag name (`/?q=<tag>`) using URL search params via `validateSearch` in `admin-ui/src/routeTree.tsx`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Phase 1
- **US1 (Phase 3)**: Depends on Phase 2 (needs API client, DataTable, Layout)
- **US2 (Phase 4)**: Depends on US1 (extends PagesPage with CRUD)
- **US3 (Phase 5)**: Depends on Phase 2 only; can run parallel with US1
- **US4 (Phase 6)**: Depends on Phase 2 only; can run parallel with US1/US3
- **US5 (Phase 7)**: Depends on Phase 2 only; can run parallel with US1/US3/US4
- **Polish (Phase 8)**: Depends on all user stories

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational → standalone testable
- **US2 (P2)**: Depends on US1 (adds CRUD to PagesPage)
- **US3 (P3)**: Depends on Foundational only → can run parallel with US1
- **US4 (P4)**: Depends on Foundational only → can run parallel with US1/US3
- **US5 (P5)**: Depends on Foundational only → can run parallel with US1/US3/US4

### Parallel Opportunities

- T003 + T004 + T005 + T006 (setup config) can run in parallel
- T010 + T011 + T012 + T013 (shared components) can run in parallel
- US3, US4, US5 can run in parallel with each other (different pages/hooks/files)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 + Phase 2 (setup + foundational)
2. Complete Phase 3: Browse and search content
3. **STOP and VALIDATE**: Open `/admin` and compare with old dashboard
4. Deploy — old dashboard still at `/`, new at `/admin`

### Incremental Delivery

1. Setup + Foundational → App shell renders with navigation
2. US1: Browse/search → Content table works at `/admin`
3. US2: Page CRUD → Add/edit/delete pages from table
4. US3: Tags → Tag management at `/admin/tags`
5. US4: Devices → Device management at `/admin/devices`
6. US5: Insights → Analytics at `/admin/insights`
7. Polish: Production build, error handling, validation

---

## Notes

- No new database tables — React app consumes existing `/api/*` endpoints
- Backend change is minimal: one `StaticFiles` mount + SPA catch-all route
- Old dashboard coexists at `/` during migration; removed after validation
- API client mirrors `kids-app/src/api/client.ts` architecture (factory + context)
- TanStack Table handles pagination, sorting, filtering for all list views
- TanStack Query handles cache invalidation after mutations (NFR-003)
