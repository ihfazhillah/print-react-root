# Implementation Plan: Personalized Feed

**Branch**: `009-personalized-feed` | **Date**: 2026-03-08 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/009-personalized-feed/spec.md`

## Summary

Enhance the browsing list endpoint to accept an optional `device_id` parameter and return personalized results: items the child has already seen/printed are deprioritized, items matching their tag interests are boosted. Add a separate "Kamu Mungkin Suka" recommendation section. On the mobile side, pass the device ID when fetching the list and display the recommendation section on the home screen.

## Technical Context

**Language/Version**: Python 3.10+ (backend), TypeScript 5.x / React Native 0.81 / Expo SDK 54 (mobile)
**Primary Dependencies**: FastAPI, aiosqlite (backend); @tanstack/react-query, expo-router (mobile)
**Storage**: SQLite via aiosqlite (existing `printable_pages.db`)
**Testing**: unittest (backend), jest + @testing-library/react-native (mobile)
**Target Platform**: Linux server (backend), Android (mobile)
**Project Type**: Web service + mobile app
**Performance Goals**: Personalized list response < 1 second for ~95k pages
**Constraints**: No new pip/npm dependencies; SQLite single-file DB
**Scale/Scope**: ~94k pages, ~4k tags, 5 devices, ~500 activity events

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Single-responsibility functions, type hints, constants |
| II. Testing Standards | PASS | E2E tests for each user story, backend endpoint tests |
| III. Bullet-Tracing | PASS | Tracer: personalized list with device_id → visible different order |
| IV. UX First | PASS | Children see fresh content; unauthenticated fallback preserved |
| V. Performance | PASS | SQL-level personalization; no FlatList changes needed; recommend before implementing complex scoring |

## Project Structure

### Documentation (this feature)

```text
specs/009-personalized-feed/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── personalized-list.md
│   └── recommendations.md
└── tasks.md
```

### Source Code (repository root)

```text
fastapi-image-search/
├── db.py                    # Enhanced get_items() + get_recommendations()
├── main.py                  # Updated /api/items endpoint signature
└── tests/
    └── test_personalized.py # Backend tests for personalization logic

kids-app/
├── src/api/client.ts        # Add device_id to getItems()
├── src/hooks/useItems.ts    # Pass device_id from storage
├── src/components/
│   └── RecommendationSection.tsx  # "Kamu Mungkin Suka" horizontal list
├── app/(tabs)/index.tsx     # Integrate RecommendationSection
└── __tests__/
    └── e2e/
        ├── personalized-list.test.tsx
        ├── recommendations.test.tsx
        └── coverage-guard.test.ts  # Updated
```

**Structure Decision**: Extends existing files. New files only for the recommendation UI component and tests.
