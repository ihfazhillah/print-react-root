# Implementation Plan: Usage Insights & Personalized Feed

**Branch**: `007-usage-insights` | **Date**: 2026-03-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/007-usage-insights/spec.md`

## Summary

Add admin analytics dashboard showing per-kid usage patterns (prints, tag preferences, shared interests) and a personalized "Kamu mungkin suka" horizontal scroll row on the mobile home screen. Admin devices excluded via `is_admin` flag on the device record.

## Technical Context

**Language/Version**: Python 3.10+ (backend), TypeScript 5.x / React Native 0.81 / Expo SDK 54 (mobile)
**Primary Dependencies**: FastAPI, aiosqlite, Jinja2 (backend); @tanstack/react-query, expo-router (mobile)
**Storage**: SQLite via aiosqlite (existing `printable_pages.db`)
**Testing**: unittest (backend), jest + @testing-library/react-native (mobile)
**Target Platform**: Linux server (backend), Android (mobile, side-loaded APK)
**Project Type**: Web service + mobile app
**Performance Goals**: Insights page loads within 2 seconds; recommendations endpoint < 500ms
**Constraints**: No new backend dependencies; no new mobile dependencies
**Scale/Scope**: 3 kids, ~50 prints, ~2700 images, 414 activity events

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Single-responsibility functions, type hints, named constants |
| II. Testing Standards | PASS | E2E tests per user story, backend endpoint tests |
| III. Bullet-Tracing | PASS | US1 (admin dashboard) first as tracer, then US2 (mobile feed), then US3 (timeline) |
| IV. User Experience First | PASS | Admin: actionable analytics; Kids: visual recommendation row |
| V. Performance | PASS | FlatList for horizontal scroll, batch rendering, React.memo on items |

No violations. No complexity tracking needed.

## Project Structure

### Documentation (this feature)

```text
specs/007-usage-insights/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── analytics-api.md # API contracts
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
fastapi-image-search/
├── db.py                    # Extended: is_admin migration, analytics queries
├── main.py                  # Extended: analytics endpoints, admin toggle, recommendations
├── templates/
│   ├── index.html           # Existing admin dashboard
│   ├── insights.html        # NEW: Usage insights page
│   └── insights_detail.html # NEW: Per-kid timeline (P2)
├── static/
│   └── insights.css         # NEW: Insights page styles
└── tests/
    └── test_insights.py     # NEW: Analytics endpoint tests

kids-app/
├── app/
│   └── index.tsx            # Modified: add "Kamu mungkin suka" row above grid
├── src/
│   ├── api/
│   │   └── devices.ts       # Extended: recommendations endpoint
│   ├── hooks/
│   │   └── useRecommendations.ts  # NEW: fetch recommendations for current device
│   ├── components/
│   │   └── RecommendationRow.tsx  # NEW: horizontal scroll row
│   └── types/
│       └── api.ts           # Extended: recommendation types
└── __tests__/
    └── e2e/
        ├── us7-insights-feed.test.tsx  # NEW: E2E for personalized feed
        └── coverage-guard.test.ts      # Updated: add US7 coverage
```

**Structure Decision**: Extends existing backend + mobile app structure. No new projects or directories beyond what's needed.
