# Quickstart: Device Tracking System

**Feature**: Device Tracking System with User Management
**Date**: 2026-03-01
**Status**: Ready for Phase 2 (Task Decomposition)

## What This Feature Does

Enables local network device tracking for children using a simple auto-registration system:

1. **Mobile App** (child's device): Auto-registers on first successful connection to backend. Child can rename their device in settings. App sends activity events (view, detail, print) to backend.
2. **Backend** (parent's server): Manages device registration, provides token-based authentication, stores activity events indefinitely.
3. **Parent/Admin** (separate dashboard): Manages devices and views activity history via admin dashboard (out of scope for this feature).

**What "Tracking" Means**:
- Track 3 actions only: **view** (browsing list), **detail** (opening image), **print** (sending to printer)
- NOT: location, time spent, session duration (child may open a page and leave it)
- Activity events stored indefinitely (no retention policy)
- Fire-and-forget from mobile — never blocks UI

**Key Architecture**:
- Children-only mobile app (no parent account complexity)
- Local network only (no cloud, no external APIs)
- Simple token-based device authentication
- Device data isolated by family/account
- `.env` configured defaults for seamless first-launch experience

---

## File Structure

```
specs/005-device-tracking/
├── spec.md                      # Feature specification (clarified requirements)
├── plan.md                      # This plan (architecture & design)
├── research.md                  # Phase 0 research (verification complete)
├── data-model.md                # Phase 1 data model (entities, storage, schema)
├── quickstart.md                # This file (overview & next steps)
├── contracts/
│   ├── backend-api.md           # Phase 1 Backend REST API contract
│   └── mobile-api.md            # Phase 1 Mobile TypeScript API contract
└── tasks.md                     # Phase 2 (NOT YET CREATED - run /speckit.tasks)
```

**Source Code** (to be created):

```
fastapi-image-search/           # Backend
├── app/routers/devices.py       # Device registration, auth, name endpoints
├── app/models/device.py         # Device, DeviceToken models
├── app/schemas/device.py        # API request/response schemas
└── tests/test_devices.py        # Unit + integration tests

kids-app/                        # Mobile app
├── src/api/devices.ts           # API client (register, update name, heartbeat)
├── src/hooks/                   # Custom hooks
│   ├── useDeviceRegistration.ts # Auto-register on first connection
│   └── useDeviceSettings.ts     # Persist/reload device settings
├── src/storage/deviceStorage.ts # AsyncStorage layer
├── app/(tabs)/settings.tsx      # Settings screen (device name, host, port)
└── __tests__/e2e/device-tracking.e2e.ts  # E2E tests for all user stories
```

---

## Implementation Order (Recommended)

Follow **bullet-tracing**: build thin end-to-end slices first, then expand.

### Slice 1: Device Auto-Registration (P1)

**What**: Device installs app → loads `.env` defaults → connects to backend → auto-registers → displays random name in settings

**Files**:
- Backend: `routers/devices.py` (POST /devices/register endpoint)
- Backend: `models/device.py` (Device, DeviceToken entities)
- Backend: `tests/test_devices.py` (registration tests)
- Mobile: `api/devices.ts` (register function)
- Mobile: `hooks/useDeviceRegistration.ts` (auto-register on first connection)
- Mobile: `storage/deviceStorage.ts` (persist token, name)
- Mobile: `settings.tsx` (display device name)
- Mobile: `__tests__/e2e/device-tracking.e2e.ts` (AS-1: auto-register test)

**Test**: E2E test verifies device registers and shows name in settings after first launch

**Success**: Device can register, token is stored, app doesn't crash on unregistered device

---

### Slice 2: Device Name Persistence (P1)

**What**: User can view and edit device name in settings. Changes persist locally and sync to backend.

**Files**:
- Backend: `routers/devices.py` (PATCH /devices/{id}/name endpoint)
- Backend: `tests/test_devices.py` (name update tests)
- Mobile: `api/devices.ts` (updateName function)
- Mobile: `hooks/useDeviceSettings.ts` (persist/reload settings)
- Mobile: `settings.tsx` (editable name input, save button)
- Mobile: `__tests__/e2e/device-tracking.e2e.ts` (AS-2, AS-3: name persistence tests)

**Test**: E2E test verifies name persists after app restart, backend is updated

**Success**: Device name can be changed, persists locally, and syncs to backend

---

### Slice 3: Backend Authentication & Data Isolation (P1)

**What**: Backend validates device tokens, enforces data isolation by family

**Files**:
- Backend: `app/main.py` (add device auth middleware)
- Backend: `routers/devices.py` (update endpoints to require auth)
- Backend: `tests/test_devices.py` (auth validation tests)
- Mobile: `api/devices.ts` (include token in request headers)
- Mobile: `__tests__/e2e/device-tracking.e2e.ts` (AS-4: invalid token test)

**Test**: E2E test verifies invalid tokens are rejected; backend only returns own device's data

**Success**: Invalid tokens rejected, devices cannot access other families' data

---

### Slice 4: Host/Port Configuration (P1)

**What**: User can customize backend host/port in settings (override `.env` defaults)

**Files**:
- Mobile: `api/devices.ts` (use configured host/port)
- Mobile: `settings.tsx` (host/port input fields)
- Mobile: `hooks/useDeviceSettings.ts` (persist host/port)
- Mobile: `__tests__/e2e/device-tracking.e2e.ts` (AS-5: endpoint unreachable test)

**Test**: E2E test verifies error message when endpoint is unreachable; user can update endpoint

**Success**: Host/port can be changed, requests use new values, graceful error on unreachable endpoint

---

### Slice 5: App Branding (P2)

**What**: Rebrand app to "KM Kraft" with leather-themed icon

**Files**:
- Mobile: `app.json` (update displayName, icon)
- Mobile: `__tests__/e2e/device-tracking.e2e.ts` (AS-6: branding test)

**Test**: E2E test verifies app name and icon display correctly

**Success**: App displays as "KM Kraft" with leather icon across UI

---

## Constitution Compliance Checklist

Before implementing each slice, verify:

- [ ] **Code Quality**: Types defined, PEP 8/idiomatic styles
- [ ] **Testing**: E2E test written first, matches acceptance scenario from spec
- [ ] **Bullet-Tracing**: Can deploy & demonstrate this slice without later slices
- [ ] **UX First**: Mobile UI is child-friendly (large touch targets, simple)
- [ ] **Performance**: No speculative optimizations, baseline measurements in place

---

## Key Design Decisions

### 1. `.env` Configuration for Defaults

**Decision**: Backend host/port loaded from `.env` at app build time

**Why**: Seamless local network setup without manual configuration. Parent rebuilds app with Expo, gets current machine's IP automatically.

**Alternative Rejected**: Auto-discovery via mDNS — too complex, requires additional permissions, adds failure modes.

### 2. Token-Based Device Authentication

**Decision**: Simple token-based auth (128-bit random string)

**Why**: Sufficient for local network, family use. No OAuth complexity needed.

**Alternative Rejected**: Device ID + secret — less secure, harder to revoke

### 3. Data Isolation by Family

**Decision**: Backend enforces via `user_id` FK + token validation

**Why**: Prevents one family from seeing another family's devices. Token validates ownership.

**Alternative Rejected**: No isolation (single-family use case) — doesn't scale, privacy risk

### 4. No Parent Mobile App

**Decision**: Parent manages devices via separate web dashboard (out of scope)

**Why**: Simplifies mobile app scope. Children don't need parent account authentication.

**Alternative Rejected**: Parent + child app in same codebase — added complexity, not needed for MVP

### 5. Periodic Polling (Not WebSockets)

**Decision**: Mobile app makes periodic heartbeat requests (30-60s interval)

**Why**: Simple, stateless, suitable for local network. No persistent connections needed.

**Alternative Rejected**: WebSockets — added complexity, not necessary for MVP

### 6. AsyncStorage for Device Settings

**Decision**: Local device-only storage, no sync to cloud

**Why**: Device token and config are device-specific. No sync needed.

**Alternative Rejected**: Sync to backend — unnecessary, adds complexity

---

## Testing Strategy

**Per Constitution II (Testing Standards)**:
- Every user story needs E2E test in `__tests__/e2e/device-tracking.e2e.ts`
- Each E2E test prefixed with `AS-N:` matching spec acceptance scenario
- Coverage guard verifies all scenarios are tested
- Unit tests for isolated logic (storage, API client, hooks)
- All tests deterministic, no flaky timers or network dependencies

**E2E Test Setup**:
```typescript
// Mock backend responses, avoid real network calls
jest.mock('../src/api/devices', () => ({
  DeviceAPI: jest.fn().mockImplementation(() => ({
    register: jest.fn().mockResolvedValue({...}),
    updateName: jest.fn().mockResolvedValue({...}),
  })),
}));

// Test user story flow: app install → register → rename → restart → verify persistence
describe('AS-1: Device auto-registers on first connection', () => {
  it('should register and display name', async () => {
    // Install app (fresh AsyncStorage)
    // Verify device is registered
    // Verify name is displayed
  });
});
```

---

## Deployment Checklist

Before shipping to production:

- [ ] All E2E tests pass
- [ ] All unit tests pass
- [ ] Linting passes (ruff for Python, ESLint for TypeScript)
- [ ] Formatting passes (black/ruff format for Python, prettier for TS)
- [ ] Manual browser testing of admin dashboard (if touched)
- [ ] Manual device testing on real Android device or emulator
- [ ] Code review from team member
- [ ] Commit message references feature spec (e.g., "Implement 005-device-tracking")

---

## Future Work (Out of Scope for MVP)

1. **Tracking Data Collection** (Phase 2+): Actual location/status data exchange during heartbeat
2. **Device Unregistration** (Phase 2+): Mobile UI to unregister device (currently admin-only)
3. **Token Expiration** (Phase 2+): Token rotation, expiry policies
4. **Historical Tracking Data** (Phase 2+): Retain and query tracking history
5. **Cloud Backup** (Phase 2+): Optional sync to cloud (if needed)
6. **Multi-Network Support** (Phase 2+): Switch between multiple backend servers

---

## Contact & Questions

- **Specification**: See `spec.md`
- **Data Model**: See `data-model.md`
- **Backend API**: See `contracts/backend-api.md`
- **Mobile API**: See `contracts/mobile-api.md`

Ready to begin implementation? Run `/speckit.tasks` to decompose this plan into actionable tasks.

