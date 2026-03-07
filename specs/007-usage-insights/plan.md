# Implementation Plan: Usage Insights & Personalized Feed

**Branch**: `007-usage-insights` | **Date**: 2026-03-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/007-usage-insights/spec.md`

## Summary

Add admin usage analytics dashboard and personalized "Kamu mungkin suka" feed to the kids mobile app. Backend: new analytics SQL queries on existing `activity_events` + `page_tags` tables, served via FastAPI endpoints and Jinja2-rendered insights pages. Mobile: horizontal scroll row at top of home screen showing recommendations from the kid's top 5 tags, weighted by interaction type (print=3, detail=1). Admin devices excluded from all analytics via `is_admin` flag.

## Technical Context

**Language/Version**: Python 3.10+ (backend), TypeScript 5.x / React Native 0.81 / Expo SDK 54 (mobile)
**Primary Dependencies**: FastAPI, aiosqlite, Jinja2 (backend); @tanstack/react-query, expo-router (mobile)
**Storage**: SQLite via aiosqlite (existing `printable_pages.db`)
**Testing**: unittest (backend), jest-expo + @testing-library/react-native (mobile)
**Target Platform**: Linux server (backend), Android (mobile, side-loaded APK)
**Project Type**: Web service + mobile app
**Performance Goals**: Insights page < 2s load; recommendations endpoint < 500ms
**Constraints**: Offline-capable mobile app (graceful degradation); no new pip/npm dependencies
**Scale/Scope**: 3-4 kids, ~50 prints, single-family use

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Single-responsibility functions for each analytics query; constants for SQL; type hints |
| II. Testing Standards | PASS | E2E tests for mobile US (us8-personalized-feed.test.tsx); unittest for backend endpoints |
| III. Bullet-Tracing | PASS | Tracer: admin insights page with summary. Then: top tags, interests, recommendations, timeline |
| IV. UX First (Children) | PASS | "Kamu mungkin suka" row: large thumbnails, horizontal scroll, hidden when irrelevant |
| V. Performance | PASS | Pure SQL aggregation at tiny scale; no optimization needed beyond standard queries |

**Post-Phase 1 re-check**: All gates still pass. Weighted recommendation query (print=3, detail=1) adds minor complexity to one SQL query — justified by better personalization quality.

## Project Structure

### Documentation (this feature)

```text
specs/007-usage-insights/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── analytics-api.md
└── tasks.md
```

### Source Code (repository root)

```text
fastapi-image-search/
├── main.py                    # New admin insights + recommendations endpoints
├── db.py                      # New analytics query functions
├── templates/
│   ├── insights.html          # Admin insights overview page
│   └── insights_detail.html   # Per-kid activity timeline page (P2)
├── static/
│   └── insights.css           # Insights page styles
└── tests/
    └── test_insights.py       # Backend tests for analytics endpoints

kids-app/
├── app/
│   └── index.tsx              # Add RecommendationRow to home screen
├── src/
│   ├── components/
│   │   └── RecommendationRow.tsx    # Horizontal scroll recommendation row
│   ├── hooks/
│   │   └── useRecommendations.ts    # React Query hook for recommendations API
│   └── api/
│       └── devices.ts               # Add getRecommendations to device API client
└── __tests__/
    └── e2e/
        └── us8-personalized-feed.test.tsx  # E2E tests for recommendation row
```

**Structure Decision**: Extends existing backend (`fastapi-image-search/`) and mobile (`kids-app/`) structure. Admin pages follow existing Jinja2 pattern. Mobile component follows established hook+component+type pattern.

## Key Design Decisions

1. **Weighted recommendations** (clarification 2026-03-07): Tag ranking uses `print * 3 + detail * 1` weighting instead of print-only count. This gives more nuanced recommendations reflecting both intentional (print) and exploratory (detail view) interests.

2. **Silent failure for recommendations** (clarification 2026-03-07): If the recommendations API fails, the mobile app silently hides the "Kamu mungkin suka" row. No error shown — the main grid still works independently.

3. **Top 5 tags** (clarification 2026-03-07): Recommendations draw from top 5 tags (not 3) for more variety.

4. **Server-side rendering** for admin: Jinja2 templates consistent with existing admin dashboard pattern. No frontend framework.

5. **On-the-fly computation**: No pre-computed recommendations. SQL queries run at request time — trivially fast at current scale.

6. **Stable device identity via ANDROID_ID** (session 2026-03-07): AsyncStorage is wiped on APK reinstall (side-load). Solution: use `ANDROID_ID` (from `expo-application`) as stable identifier. Server stores `android_id` on device record and looks up by it during registration. Migration: existing devices link their android_id via `PATCH /api/devices/{id}/android-id` on first launch with new code.

7. **Admin device merge** (session 2026-03-07): For duplicate device records created before the android_id fix, admin can merge them via `POST /api/admin/devices/merge`. All activity_events are moved from source to target device, source is deactivated.
