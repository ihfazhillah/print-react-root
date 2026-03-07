# Implementation Plan: In-App Self-Update

**Branch**: `006-in-app-update` | **Date**: 2026-03-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/006-in-app-update/spec.md`

## Summary

Add Telegram-style in-app self-update to the kids mobile app. The app checks the GitHub tags page (`ihfazhillah/print-react-root`) on launch, compares versions via simple string parsing (no extra libraries), and shows a persistent bottom button when an update is available. Tapping downloads the APK with progress displayed inline, then triggers the Android system installer. Uses `expo-file-system` for download, `expo-intent-launcher` for install intent, and `expo-application` for version info.

## Technical Context

**Language/Version**: TypeScript 5.x on React Native 0.81 (Expo SDK 54)
**Primary Dependencies**: expo-file-system (existing), expo-intent-launcher (new), expo-application (new)
**Storage**: N/A (ephemeral state only, APK cached in `FileSystem.cacheDirectory`)
**Testing**: jest-expo, @testing-library/react-native
**Target Platform**: Android (side-loaded APK, not Google Play)
**Project Type**: Mobile app (Expo managed workflow)
**Performance Goals**: Version check < 5s, download progress updates at least every 500ms
**Constraints**: Offline-capable (graceful degradation), no extra npm dependencies for version comparison
**Scale/Scope**: Single-family use, 1-2 devices

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Single-responsibility hooks/components, type hints, constants for URLs |
| II. Testing Standards | PASS | E2E tests for each user story, mocked HTTP calls, no network dependency |
| III. Bullet-Tracing | PASS | Tracer: version check → bottom button. Then: download → install |
| IV. UX First (Children) | PASS | Large bottom button, visual progress, minimal text, graceful offline |
| V. Performance | PASS | No list rendering involved; simple fetch + state updates |

**Post-Phase 1 re-check**: All gates still pass. No new abstractions or unnecessary complexity introduced.

## Project Structure

### Documentation (this feature)

```text
specs/006-in-app-update/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── update-service.md
└── tasks.md             # Created by /speckit.tasks
```

### Source Code (repository root)

```text
kids-app/
├── app/
│   ├── _layout.tsx          # Add UpdateBar to root layout
│   └── settings.tsx         # Add "Check for Updates" button
├── src/
│   ├── hooks/
│   │   └── useUpdateCheck.ts    # Version check, download, install logic
│   ├── components/
│   │   └── UpdateBar.tsx        # Persistent bottom button component
│   └── types/
│       └── update.ts            # UpdateInfo, DownloadState types
├── plugins/
│   └── withInstallPermission.js # Config plugin for REQUEST_INSTALL_PACKAGES
└── __tests__/
    └── e2e/
        └── update.test.tsx      # E2E tests for update user stories
```

**Structure Decision**: Extends existing `kids-app/` structure. New files follow established patterns: hook in `src/hooks/`, component in `src/components/`, types in `src/types/`. Config plugin goes in existing `plugins/` directory alongside `withNetworkSecurityConfig`.
