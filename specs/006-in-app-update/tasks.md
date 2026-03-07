# Tasks: In-App Self-Update

**Input**: Design documents from `/specs/006-in-app-update/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Not explicitly requested — test tasks omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies, create config plugin, define shared types

- [x] T001 Install expo-intent-launcher and expo-application in kids-app/ (`npx expo install expo-intent-launcher expo-application`)
- [x] T002 [P] Create Expo config plugin for REQUEST_INSTALL_PACKAGES permission in kids-app/plugins/withInstallPermission.js
- [x] T003 [P] Register withInstallPermission plugin in kids-app/app.json plugins array
- [x] T004 [P] Define UpdateInfo and DownloadState types in kids-app/src/types/update.ts (per data-model.md)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core update logic that all user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Implement version checking function in kids-app/src/hooks/useUpdateCheck.ts — fetch `https://github.com/ihfazhillah/print-react-root/tags`, parse HTML for tag names matching `vX.Y.Z`, extract latest version, compare with `Application.nativeApplicationVersion` using split-and-compare, return UpdateInfo. Handle offline/errors gracefully (return null, no crashes). Extract GitHub URL as named constant.
- [x] T006 Implement hand-rolled version comparison utility (compareVersions) inline in kids-app/src/hooks/useUpdateCheck.ts — split on '.', compare each segment numerically, return whether remote > local.

**Checkpoint**: Version check logic ready — user story implementation can now begin

---

## Phase 3: User Story 1 - Check for Updates Automatically (Priority: P1) MVP

**Goal**: On app launch, check GitHub for newer version and show persistent bottom button if update available.

**Independent Test**: Publish a GitHub release with a higher version, open the app, verify the bottom button appears with "Update Available (vX.Y.Z)".

### Implementation for User Story 1

- [x] T007 [US1] Create UpdateBar component in kids-app/src/components/UpdateBar.tsx — persistent bottom button that shows "Update Available (vX.Y.Z)" when `downloadState.status === 'available'`. Hidden when `status === 'idle'`. Large touch target, minimal text, child-friendly. Use absolute positioning at bottom of screen.
- [x] T008 [US1] Wire useUpdateCheck hook to call checkForUpdate on app mount in kids-app/src/hooks/useUpdateCheck.ts — useEffect that runs once on mount, fetches tags page, sets UpdateInfo and DownloadState (`idle` → `available` if update found, stays `idle` otherwise).
- [x] T009 [US1] Add UpdateBar to root layout in kids-app/app/_layout.tsx — render UpdateBar at root level so it persists across all screens. Pass no props (component consumes hook internally via context or direct hook usage).

**Checkpoint**: App shows bottom button on launch when update is available. No download yet.

---

## Phase 4: User Story 2 - Download and Install Update (Priority: P1)

**Goal**: Tapping the bottom button downloads APK with inline progress, then triggers Android installer.

**Independent Test**: Tap the update button, verify progress bar appears inline, APK downloads, system install dialog opens on completion.

### Implementation for User Story 2

- [x] T010 [US2] Add download logic to useUpdateCheck hook in kids-app/src/hooks/useUpdateCheck.ts — implement `startDownload()` using `FileSystem.createDownloadResumable()` with progress callback updating `DownloadState.progress`. Download to `FileSystem.cacheDirectory`. Implement `cancelDownload()` to pause/abort the resumable and reset state to `available`.
- [x] T011 [US2] Add install logic to useUpdateCheck hook in kids-app/src/hooks/useUpdateCheck.ts — implement `installUpdate()` using `FileSystem.getContentUriAsync()` to convert file path to content URI, then `IntentLauncher.startActivityAsync` with action `android.intent.action.INSTALL_PACKAGE`, data set to content URI, type `application/vnd.android.package-archive`, and FLAG_GRANT_READ_URI_PERMISSION.
- [x] T012 [US2] Update UpdateBar component in kids-app/src/components/UpdateBar.tsx to handle all download states: `downloading` shows progress bar with percentage and Cancel button; `error` shows error message with Retry button; `ready` triggers installUpdate automatically. State transitions per data-model.md.
- [x] T013 [US2] Add "Install from unknown sources" handling in kids-app/src/hooks/useUpdateCheck.ts — if install intent fails, use `IntentLauncher.startActivityAsync` to open `android.settings.MANAGE_UNKNOWN_APP_SOURCES` with `data: "package:com.kmkraft.printreact"`.

**Checkpoint**: Full update flow works: check → show button → tap → download with progress → install prompt.

---

## Phase 5: User Story 3 - Manual Update Check (Priority: P2)

**Goal**: "Check for Updates" button in settings triggers a version check on demand.

**Independent Test**: Navigate to settings, tap "Check for Updates", verify it shows correct result (up-to-date or triggers bottom button).

### Implementation for User Story 3

- [x] T014 [US3] Add "Check for Updates" button to settings screen in kids-app/app/settings.tsx — button calls `checkForUpdate()` from the update hook/context. Show loading state while checking. Show "You're up to date" toast/message if no update, or trigger the bottom button if update found. Show "Could not check" message if offline.

**Checkpoint**: All user stories complete and independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases and cleanup

- [x] T015 Clean up downloaded APK from cache after successful install trigger in kids-app/src/hooks/useUpdateCheck.ts
- [x] T016 Handle edge case: GitHub rate limiting / malformed tags — ensure no crashes, silent skip in kids-app/src/hooks/useUpdateCheck.ts

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on T004 (types) from Setup
- **User Story 1 (Phase 3)**: Depends on Phase 2 (version check logic)
- **User Story 2 (Phase 4)**: Depends on Phase 3 (UpdateBar + hook exist)
- **User Story 3 (Phase 5)**: Depends on Phase 2 (checkForUpdate function exists); can run in parallel with US2
- **Polish (Phase 6)**: Depends on US1 + US2

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Foundational only — MVP deliverable
- **User Story 2 (P1)**: Depends on US1 (needs UpdateBar and hook)
- **User Story 3 (P2)**: Depends on Foundational only — can parallelize with US2

### Parallel Opportunities

- T002, T003, T004 can run in parallel (Setup phase)
- US2 and US3 can run in parallel after US1 is complete
- T010 and T011 can be developed in parallel within US2 (different functions, same file but independent logic)

---

## Parallel Example: Setup Phase

```bash
# Launch all setup tasks together:
Task: "Create config plugin in kids-app/plugins/withInstallPermission.js"
Task: "Register plugin in kids-app/app.json"
Task: "Define types in kids-app/src/types/update.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (install deps, config plugin, types)
2. Complete Phase 2: Foundational (version check + compare logic)
3. Complete Phase 3: User Story 1 (UpdateBar + auto-check on launch)
4. **STOP and VALIDATE**: Open app, verify bottom button appears when update exists
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Core logic ready
2. Add US1 → Version check + bottom button (MVP!)
3. Add US2 → Download + install flow (full feature)
4. Add US3 → Manual check from settings (convenience)
5. Polish → Edge case handling

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No `semver` package — hand-rolled comparison for X.Y.Z format
- GitHub tags page scraped directly (no API, no rate limit concerns)
- Only 2 new Expo packages: expo-intent-launcher, expo-application
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
