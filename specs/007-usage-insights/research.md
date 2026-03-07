# Research: Usage Insights & Personalized Feed

**Feature**: 007-usage-insights | **Date**: 2026-03-06

## R1: Analytics Query Strategy

**Decision**: Pure SQL aggregation queries on existing `activity_events` + `page_tags` tables.

**Rationale**: At current scale (414 events, 53 prints, 3 kids), complex aggregation is trivially fast in SQLite. No need for materialized views, caches, or pre-computed tables.

**Alternatives considered**:
- Pre-computed summary tables (overkill at this scale)
- In-memory aggregation in Python (SQL is cleaner and more efficient)

## R2: Admin Device Exclusion

**Decision**: Add `is_admin` boolean column to `devices` table (default 0). All analytics queries include `WHERE device_id NOT IN (SELECT id FROM devices WHERE is_admin = 1)`.

**Rationale**: Simple, explicit, toggleable from admin UI. No name-matching heuristics.

**Alternatives considered**:
- Match by device name "Babah" (fragile, violates spec clarification)
- Separate admin_devices table (over-engineering for a flag)

## R3: Personalized Recommendations Algorithm

**Decision**: Query device's top 5 tags by weighted score (print=3, detail=1) from `activity_events` JOIN `page_tags`. Then fetch images matching those tags that the device hasn't printed yet, randomized. Computed on-the-fly per request.

**Rationale**: At 3 kids and ~50 prints, real-time computation is instant. Weighting print events 3x higher than detail views ensures strong preference signals dominate while still incorporating exploratory browsing. No recommendation engine needed.

**Alternatives considered**:
- Collaborative filtering (way overkill)
- Pre-computed recommendations table (unnecessary complexity)

## R4: Admin Dashboard Rendering

**Decision**: Server-side rendered HTML via Jinja2 templates (consistent with existing admin dashboard pattern). New `/insights` route on the FastAPI backend.

**Rationale**: Existing admin UI uses Jinja2 templates. No frontend framework needed for admin pages.

**Alternatives considered**:
- Separate React admin SPA (over-engineering)
- JSON API + vanilla JS (more work than Jinja2 for tabular data)

## R5: Mobile "Kamu mungkin suka" Row

**Decision**: New API endpoint `GET /api/devices/{device_id}/recommendations` returning a list of image objects. Mobile app renders as horizontal `FlatList` at top of home screen, only when >= 2 items returned.

**Rationale**: Keeps recommendation logic server-side (single source of truth). Mobile just renders what it receives.

**Alternatives considered**:
- Client-side tag analysis (duplicates logic, harder to maintain)
- WebSocket push (overkill for static recommendations)

## R6: Activity Timeline

**Decision**: `GET /api/admin/devices/{device_id}/timeline` endpoint returning events in reverse chronological order grouped by date. Rendered in admin dashboard Jinja2 template.

**Rationale**: Simple extension of existing activity_events queries. P2 priority — straightforward addition after core analytics.

## R7: Stable Device Identity

**Decision**: Use `ANDROID_ID` (via `expo-application`) as stable device identifier. Store as `android_id` column on `devices` table (nullable, unique). Registration checks for existing device by android_id before creating new one.

**Rationale**: AsyncStorage is wiped on APK reinstall (side-load on Android). `ANDROID_ID` persists across reinstalls and is unique per device+signing key combination. No additional permissions required.

**Alternatives considered**:
- `expo-secure-store` (persists across reinstalls, but adds dependency and complexity)
- Firebase Installation ID (requires Google Play Services)
- Custom file in external storage (requires permissions)

## R8: Device Record Merge

**Decision**: Admin `POST /api/admin/devices/merge` endpoint. Moves all `activity_events` from source to target device, deactivates source. Simple SQL UPDATE + deactivation.

**Rationale**: Duplicate device records are expected from pre-fix installs. Admin needs a way to consolidate without losing activity data.

**Alternatives considered**:
- Auto-merge on android_id collision (risky — could merge wrong devices)
- Delete duplicates (loses activity data)
