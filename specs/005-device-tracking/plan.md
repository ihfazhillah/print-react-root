# Implementation Plan: Device Tracking System with User Management

**Branch**: `005-device-tracking` | **Date**: 2026-03-01 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/005-device-tracking/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Implement a simple device tracking system for local network child device management. Children's devices auto-register with a randomly generated name on first successful backend connection (using `.env` defaults with current machine's IP). Parents can rename devices via mobile settings interface; device names sync to backend. Backend provides token-based device authentication and data isolation by family/account. Parent/admin accesses all device management through separate web dashboard (out of scope for this feature). No external data sharing, no cloud storage, no regulatory compliance requirements (local network family use only).

## Technical Context

**Backend**:
- **Language/Version**: Python 3.10+
- **Primary Dependencies**: FastAPI, aiosqlite (existing SQLite DB from 003-database-layer)
- **Storage**: SQLite (file-based `printable_pages.db`, co-located with backend)
- **Testing**: unittest (stdlib, existing pattern from CLAUDE.md)
- **Target Platform**: Linux/local network server

**Mobile App**:
- **Language/Version**: TypeScript 5.x on React Native 0.81 (Expo SDK 54)
- **Primary Dependencies**: expo ~54.0.33, expo-router ~6.0.23, @tanstack/react-query ^5.90.x, @react-native-async-storage/async-storage ~2.2.0
- **Storage**: AsyncStorage (local device storage for device token, config)
- **Testing**: Jest + @testing-library/react-native; E2E tests required per Constitution
- **Target Platform**: Android (Expo managed app)

**Shared**:
- **Project Type**: Backend (web service) + Mobile app
- **Performance Goals**: Device registration <5s; name sync <5s; tracking requests 95% success rate
- **Constraints**: Local network only; no cloud/external APIs; intermittent connectivity expected on child devices
- **Scale/Scope**: No device limit; no concurrent edit handling; MVP scope only

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Alignment Assessment** (Constitution v1.3.0):

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Code Quality** | ✅ PASS | Python: PEP 8, type hints required. Mobile: React Native idiomatic style. No new dependencies beyond existing approved stack. |
| **II. Testing Standards** | ✅ PASS | E2E tests required for 4 user stories (auto-register, backend auth, tracking integration, branding). Unit tests for token handling, name validation. Coverage guard for acceptance scenarios. |
| **III. Bullet-Tracing** | ✅ PASS | MVP scope: auto-registration + name persistence + basic auth. Device unregistration deferred to admin dashboard (out of scope). Tracking data handling deferred to Phase 2. |
| **IV. User Experience First** | ✅ PASS | Children persona: settings UI for device name, host/port config (simple, no parent account complexity). Admin persona: dashboard CRUD handled separately (out of scope). |
| **V. Performance** | ✅ PASS | No speculative optimizations. Baselines: <5s registration, <5s name sync. No FlatList usage in this feature (device name/settings are simple forms). |

**Gate Result**: ✅ **PASS** - Feature aligns with all constitution principles. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

**Selected**: Option 3 - Mobile + API (Backend + Mobile App)

```text
fastapi-image-search/                         # Existing backend
├── app/
│   ├── routers/
│   │   └── devices.py                        # NEW: Device registration, auth, name update endpoints
│   ├── models/
│   │   └── device.py                         # NEW: Device, DeviceToken, User-Device mapping models
│   ├── schemas/
│   │   └── device.py                         # NEW: Device registration, name update request/response schemas
│   └── db.py                                 # MODIFIED: Add device tables to initialization
├── tests/
│   └── test_devices.py                       # NEW: Device registration, auth, name sync tests

kids-app/                                      # Existing mobile app (Expo)
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx                         # Home screen (existing)
│   │   └── settings.tsx                      # MODIFIED: Add device name, host/port settings
│   └── _layout.tsx                           # (existing)
├── src/
│   ├── api/
│   │   └── devices.ts                        # NEW: Device registration, name update, tracking API calls
│   ├── hooks/
│   │   ├── useDeviceRegistration.ts          # NEW: Auto-register on first connection
│   │   └── useDeviceSettings.ts              # NEW: Persist/reload device name, host/port
│   ├── types/
│   │   └── device.ts                         # NEW: Device, DeviceToken, DeviceSettings types
│   └── storage/
│       └── deviceStorage.ts                  # NEW: AsyncStorage for device token, config
├── __tests__/
│   ├── e2e/
│   │   └── device-tracking.e2e.ts            # NEW: E2E tests for 4 user stories
│   └── unit/
│       ├── useDeviceRegistration.test.ts     # NEW: Auto-registration logic
│       └── deviceStorage.test.ts             # NEW: AsyncStorage persistence
└── app.json                                  # MODIFIED: Update app name to "KM Kraft"

specs/005-device-tracking/                    # Feature documentation (this plan)
├── spec.md
├── plan.md                                   # This file
├── research.md                               # Phase 0 output
├── data-model.md                             # Phase 1 output
├── quickstart.md                             # Phase 1 output
└── contracts/
    ├── device-api.md                         # Phase 1 output: Backend API contracts
    └── device-mobile.md                      # Phase 1 output: Mobile API contracts
```

**Structure Decision**: Backend (FastAPI) and Mobile (Expo/React Native) are separate projects within the same monorepo. This feature touches both:
- **Backend**: New device management routes, models, auth middleware
- **Mobile**: New settings UI, device registration logic, storage layer
- Both use existing patterns from prior features (003-database-layer, 001-kids-mobile-app)

## Complexity Tracking

**No violations** — Constitution Check passed without exceptions. No complexity justifications needed.
