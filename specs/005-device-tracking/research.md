# Phase 0: Research & Design Validation

**Feature**: Device Tracking System with User Management
**Date**: 2026-03-01
**Status**: Complete - No blocking unknowns identified

## Research Summary

All major architectural decisions clarified in specification phase. No critical unknowns blocking implementation. Remaining items are implementation details suitable for planning phase.

## Open Questions Addressed

### 1. Random Device Name Format

**Decision**: Simple alphanumeric format (hexadecimal or sequential)
**Rationale**: Device names are auto-generated and user-editable. Format is purely for initial uniqueness and user recognition. Simple format is sufficient for MVP.
**Alternatives Considered**:
- UUID format (too long for user display)
- Descriptive names (child1, child2) — doesn't scale, assumes parent count
- Random words (Device-Happy-Tiger) — adds complexity, not needed for MVP

**Implementation Detail**: Defer to planning phase. Decision between:
- Hex format: "Device-5F7A" (4-6 random hex chars)
- Sequential format: "Device-001", "Device-002" (simple counter per family)
- Recommendation: Hex format for uniqueness without server-side state

### 2. What Does "Tracking" Mean?

**Decision**: Track 3 actions only: view, detail, print
**Rationale**: The goal is to know what the child did in the app (browsed images, opened details, printed). NOT location, time spent, or session duration. A child may open a page and leave it — only the action itself matters.
**Alternatives Considered**:
- Periodic heartbeat/polling (not needed — event-driven is simpler)
- Location tracking (not relevant — local network family use)
- Time-spent tracking (not useful — child may leave page open)

### 3. Historical Data Retention

**Decision**: Store indefinitely. No retention policy needed.
**Rationale**: Activity events are small records (event_type, image_id, timestamp). No need to delete or archive. Parent can review all historical activity via admin dashboard.
**Implementation**: activity_events table with no automated cleanup or TTL.

## Verification: Technical Feasibility

| Aspect | Status | Notes |
|--------|--------|-------|
| **Backend Database Schema** | ✅ Ready | Extends existing SQLite schema (003-database-layer). No migration complexity. |
| **Mobile Storage Layer** | ✅ Ready | AsyncStorage already used in project. Device token + config storage is straightforward. |
| **API Contract** | ✅ Ready | Simple REST endpoints: POST /devices (register), PATCH /devices/{id}/name (update), GET /devices (list). |
| **Auth Mechanism** | ✅ Ready | Simple token-based. No OAuth complexity needed (local network only). |
| **Local Network Discovery** | ✅ Ready | `.env` file approach is proven pattern in project. No new infrastructure. |
| **E2E Test Framework** | ✅ Ready | Jest + testing-library already established in kids-app. Device tracking E2E tests follow existing patterns. |

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| Device name sync race condition (local change while sync in flight) | Low | Low | Accept eventual consistency. Reload name after sync confirmation. UI shows "syncing..." state. |
| Token persistence after app reinstall | Low | Medium | Document that reinstall creates new device registration. Unregister old device via admin dashboard if needed. |
| Endpoint unreachable on first launch | Medium | Medium | Graceful error handling. Show settings screen with error. User can retry after fixing network/endpoint. |
| AsyncStorage quota exceeded | Very Low | Low | Device settings are minimal (<1KB). No risk of quota issues. |

## Dependency Verification

**Backend Dependencies** (all existing):
- FastAPI ✅
- aiosqlite ✅
- Python 3.10+ ✅

**Mobile Dependencies** (all existing):
- Expo SDK 54 ✅
- React Native 0.81 ✅
- @react-native-async-storage/async-storage ✅
- @tanstack/react-query ✅

**No new external dependencies required.**

## Conclusion

✅ **Phase 0 Complete**

All open questions addressed. No external research, no dependency conflicts, no architectural unknowns. Feature is ready for Phase 1 design (data model, contracts, quickstart).

**Proceed to**: Phase 1 (data-model.md, contracts, quickstart.md)
