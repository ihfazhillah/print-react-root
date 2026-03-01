# Tasks: Device Tracking System with User Management

**Input**: Design documents from `/specs/005-device-tracking/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Constitution II mandates E2E tests per user story and regression tests for bug fixes.

**Organization**: Bugs and branding first (user requested "before integration"), then tracking integration tasks grouped by user story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Prepare shared infrastructure for device tracking feature

- [ ] T001 Add device tables (devices, device_tokens, activity_events) to database schema in fastapi-image-search/db.py
- [ ] T002 [P] Create TypeScript device types (DeviceSettings, ActivityEventRequest, etc.) in kids-app/src/types/device.ts
- [ ] T003 [P] Create device storage module (AsyncStorage for token, name, registered state) in kids-app/src/storage/deviceStorage.ts

**Checkpoint**: Database schema extended, shared types and storage layer ready

---

## Phase 2: Bug Fixes (Before Integration)

**Purpose**: Fix settings persistence and endpoint caching bugs — user requested these before tracking integration

**⚠️ Constitution II**: Bug fixes MUST include a regression test that reproduces the bug before the fix.

### Bug 1: Settings host/port not persisting when navigating away and back

- [ ] T004 Write regression test reproducing settings persistence bug (change host/port, navigate away, return, verify new values shown) in kids-app/__tests__/e2e/us4-settings.test.tsx
- [ ] T005 Fix useServerConfig hook to properly invalidate cached config when settings are saved in kids-app/src/hooks/useServerConfig.ts
- [ ] T006 Fix settings.tsx to reload saved values from AsyncStorage on screen focus (not just mount) in kids-app/app/settings.tsx
- [ ] T007 Run regression test T004 and verify it passes

### Bug 2: Image list not updating when endpoint changes (still uses old endpoint, but search works)

- [ ] T008 Write regression test reproducing list endpoint caching bug (change host/port, verify list uses new endpoint, not old one) in kids-app/__tests__/e2e/us4-settings.test.tsx
- [ ] T009 Fix ApiClientProvider to rebuild API client when server config changes (invalidate React Query cache on config change) in kids-app/src/api/ApiClientProvider.tsx
- [ ] T010 Fix useItems hook to refetch when base URL changes (ensure query key includes server config) in kids-app/src/hooks/useItems.ts
- [ ] T011 Run regression test T008 and verify it passes

**Checkpoint**: Both settings bugs fixed and regression tests green

---

## Phase 3: App Branding (US4 - Priority: P2) 🎯 Pre-Integration

**Goal**: Rebrand app to "KM Kraft" with leather-themed icon — user requested this before tracking integration

**Independent Test**: Verify app name and icon display on home screen, settings, and system app list

### E2E Tests for Branding

- [ ] T012 [P] [US4] Write E2E test verifying app name displays as "KM Kraft" in kids-app/__tests__/e2e/us5-branding.test.tsx

### Implementation for Branding

- [ ] T013 [P] [US4] Update app name to "KM Kraft" in kids-app/app.json (name, slug, scheme fields)
- [ ] T014 [P] [US4] Create simple leather-themed app icon (SVG or PNG) in kids-app/assets/images/icon.png
- [ ] T015 [US4] Update app.json to reference new icon and verify branding displays correctly in kids-app/app.json
- [ ] T016 [US4] Update header title in _layout.tsx to display "KM Kraft" in kids-app/app/_layout.tsx
- [ ] T017 [US4] Run E2E test T012 and verify it passes

**Checkpoint**: App rebranded to "KM Kraft" with leather icon, bugs fixed — ready for tracking integration

---

## Phase 4: Foundational (Blocking Prerequisites for Tracking)

**Purpose**: Core device auth infrastructure that MUST be complete before tracking user stories

**⚠️ CRITICAL**: No tracking user story work can begin until this phase is complete

- [ ] T018 Implement device registration endpoint (POST /api/devices/register) accepting initial_name, returning device_id + device_token in fastapi-image-search/main.py
- [ ] T019 Implement device token validation dependency (validate Authorization: Bearer header against device_tokens table) in fastapi-image-search/main.py
- [ ] T020 [P] Implement device name update endpoint (PATCH /api/devices/{device_id}/name) with token auth in fastapi-image-search/main.py
- [ ] T021 [P] Implement activity event recording endpoint (POST /api/devices/{device_id}/events) with token auth in fastapi-image-search/main.py
- [ ] T022 Write backend unit tests for device registration, token validation, name update, and event recording in fastapi-image-search/test_main.py
- [ ] T023 [P] Create mobile API client module with register(), updateName(), trackEvent() methods in kids-app/src/api/devices.ts

**Checkpoint**: Backend device endpoints ready, mobile API client ready — user story implementation can begin

---

## Phase 5: User Story 1 — Child Device Auto-Registers on First Connection and Can Be Renamed (Priority: P1) 🎯 MVP

**Goal**: Device auto-registers with random name on first successful backend connection; user can rename device in settings; name persists locally and syncs to backend.

**Independent Test**: Install app → loads .env defaults → connects to backend → auto-registers → displays random name → user changes name → restart → name persists

### E2E Tests for User Story 1

- [ ] T024 [US1] Write E2E tests for device auto-registration and name persistence (AS-1 through AS-5 from spec) in kids-app/__tests__/e2e/us5-device-tracking.test.tsx

### Implementation for User Story 1

- [ ] T025 [US1] Implement useDeviceRegistration hook (check if registered on mount, auto-register on first successful connection, persist token) in kids-app/src/hooks/useDeviceRegistration.ts
- [ ] T026 [US1] Implement useDeviceSettings hook (load/save device name from storage, sync name changes to backend) in kids-app/src/hooks/useDeviceSettings.ts
- [ ] T027 [US1] Add device name field to settings screen (display current name, editable, save button, sync indicator) in kids-app/app/settings.tsx
- [ ] T028 [US1] Integrate useDeviceRegistration into app root layout (auto-register when ApiClient connects successfully) in kids-app/app/_layout.tsx
- [ ] T029 [US1] Run E2E tests T024 and verify all pass

**Checkpoint**: Device auto-registers on first connection, name is editable and persists — US1 fully functional

---

## Phase 6: User Story 2 — Backend Authenticates Device Requests and Manages Device Organization (Priority: P1)

**Goal**: Backend validates device tokens on all requests, rejects unauthorized tokens, enforces data isolation by family/device

**Independent Test**: Register device → make authenticated request (success) → make request with invalid token (401) → verify data isolation

### E2E Tests for User Story 2

- [ ] T030 [US2] Write backend integration tests for device token auth (valid token accepted, invalid token rejected, inactive device rejected) in fastapi-image-search/test_main.py

### Implementation for User Story 2

- [ ] T031 [US2] Add token validation to existing endpoints that should require device auth (if applicable) in fastapi-image-search/main.py
- [ ] T032 [US2] Add admin device list endpoint (GET /api/admin/devices) for dashboard use in fastapi-image-search/main.py
- [ ] T033 [US2] Add admin device deactivation endpoint (DELETE /api/admin/devices/{device_id}) for dashboard use in fastapi-image-search/main.py
- [ ] T034 [US2] Write backend tests for admin device management endpoints in fastapi-image-search/test_main.py
- [ ] T035 [US2] Run all backend tests and verify they pass

**Checkpoint**: Backend authenticates all device requests, admin can manage devices — US2 fully functional

---

## Phase 7: User Story 3 — Mobile App Sends Activity Events to Backend (Priority: P2)

**Goal**: Mobile app sends view/detail/print events to backend when child performs actions; fire-and-forget (never blocks UI); events stored indefinitely

**Independent Test**: Perform view/detail/print actions → verify events recorded on backend → verify fire-and-forget (UI not blocked when backend unreachable)

### E2E Tests for User Story 3

- [ ] T036 [US3] Write E2E tests for activity event tracking (AS-1 through AS-5: view, detail, print events sent; fire-and-forget on failure; new endpoint used after config change) in kids-app/__tests__/e2e/us5-device-tracking.test.tsx

### Implementation for User Story 3

- [ ] T037 [US3] Implement useActivityTracking hook (trackView, trackDetail, trackPrint — fire-and-forget POST to backend) in kids-app/src/hooks/useActivityTracking.ts
- [ ] T038 [US3] Integrate trackView into home screen (send event when image list is displayed) in kids-app/app/index.tsx
- [ ] T039 [US3] Integrate trackDetail into detail screen (send event when image detail page is opened) in kids-app/app/detail/[id].tsx
- [ ] T040 [US3] Integrate trackPrint into print flow (send event when print button is tapped) in kids-app/app/detail/[id].tsx
- [ ] T041 [US3] Run E2E tests T036 and verify all pass

**Checkpoint**: Activity events (view/detail/print) tracked and sent to backend — US3 fully functional

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, cleanup, and cross-story integration

- [ ] T042 Update E2E coverage guard to include new user stories (US5 device-tracking, US5 branding) in kids-app/__tests__/e2e/coverage-guard.test.ts
- [ ] T043 Run full test suite (backend + mobile) and verify all tests pass
- [ ] T044 Manual device testing: install app on real Android device, verify auto-registration, name change, activity tracking, branding
- [ ] T045 Code cleanup: remove dead code, verify linting passes (ruff for Python, ESLint for TypeScript)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Bug Fixes (Phase 2)**: No dependencies on Phase 1 — can run in parallel with Setup
- **Branding (Phase 3)**: No dependencies on Phase 1 or 2 — can run in parallel
- **Foundational (Phase 4)**: Depends on Phase 1 (database schema) — BLOCKS all tracking user stories
- **US1 (Phase 5)**: Depends on Phase 4 (Foundational)
- **US2 (Phase 6)**: Depends on Phase 4 (Foundational) — can run in parallel with US1
- **US3 (Phase 7)**: Depends on Phase 5 (US1, needs device registration) and Phase 4
- **Polish (Phase 8)**: Depends on all previous phases

### User Story Dependencies

- **US4 Branding (Phase 3)**: Independent — no dependencies on tracking features
- **US1 Auto-Registration (Phase 5)**: Depends on Foundational (Phase 4) — no dependency on other stories
- **US2 Backend Auth (Phase 6)**: Depends on Foundational (Phase 4) — can run in parallel with US1
- **US3 Activity Events (Phase 7)**: Depends on US1 (needs registered device with token)

### Within Each User Story

- E2E tests MUST be written first (Constitution II)
- Backend endpoints before mobile integration
- Core implementation before UI integration
- Story complete and tested before moving to next priority

### Parallel Opportunities

**Phase 1 parallelism**:
```
T001 (db schema) runs independently
T002 (TS types) + T003 (storage module) run in parallel
```

**Phase 2 parallelism**:
```
Bug 1 (T004-T007) and Bug 2 (T008-T011) can run in parallel (different files)
```

**Phase 3 parallelism**:
```
T013 (app.json) + T014 (icon) run in parallel
```

**Phase 4 parallelism**:
```
T020 (name update endpoint) + T021 (event endpoint) + T023 (mobile API client) run in parallel
```

**Cross-phase parallelism**:
```
Phase 2 (Bug Fixes) + Phase 3 (Branding) can run in parallel
Phase 5 (US1) + Phase 6 (US2) can run in parallel after Phase 4
```

---

## Implementation Strategy

### MVP First (Bug Fixes + Branding + US1)

1. Complete Phase 1: Setup (database schema, types, storage)
2. Complete Phase 2: Bug Fixes (settings persistence, list caching)
3. Complete Phase 3: Branding (KM Kraft name + leather icon)
4. Complete Phase 4: Foundational (device endpoints, auth)
5. Complete Phase 5: US1 (auto-registration + rename)
6. **STOP and VALIDATE**: Test US1 independently on real device
7. Deploy/demo if ready — this is the MVP

### Incremental Delivery

1. Bug Fixes + Branding → Immediate quality improvement (no tracking yet)
2. Add US1 (Auto-Registration) → Device registers and can be renamed (MVP!)
3. Add US2 (Backend Auth) → Token validation and admin management
4. Add US3 (Activity Events) → Full tracking (view/detail/print)
5. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Backend follows existing pattern: all endpoints in main.py, queries in db.py
- Mobile follows existing pattern: hooks for logic, screens for UI, ApiClientProvider for config
- Backend already has `interactions` table — activity_events is a separate device-scoped table
- Constitution III (Bullet-Tracing): Each phase delivers a working, deployable increment
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
