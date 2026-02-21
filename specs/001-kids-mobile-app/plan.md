# Implementation Plan: Kids Mobile App

**Branch**: `001-kids-mobile-app` | **Date**: 2026-02-21 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-kids-mobile-app/spec.md`

## Summary

Build a React Native (Expo managed workflow) Android tablet app for
children to browse, search, and print images from the existing
FastAPI backend. The app uses TypeScript, Expo Router for file-based
navigation, TanStack React Query for server state, and expo-image
for cached image display. Development follows the tracer-bullet
approach: a thin end-to-end slice (home screen + image grid + API
fetch) first, then iterative widening through detail/collection
pages, printing, search, and settings.

## Technical Context

**Language/Version**: TypeScript 5.x on React Native 0.81 (Expo SDK 54)
**Primary Dependencies**: expo ~54.0.33, expo-router ~6.0.23, expo-image ~3.0.11, @tanstack/react-query ^5.90.x, @react-native-async-storage/async-storage ~2.2.0, expo-network ~8.0.8
**Storage**: AsyncStorage for endpoint persistence; React Query in-memory cache for API data
**Testing**: jest-expo ~54.0.17, @testing-library/react-native ^13.3.x
**Target Platform**: Android tablets (7-12 inch), API level 24+
**Project Type**: mobile-app
**Performance Goals**: First page load <3s on local network (SC-002); smooth 60fps scrolling (SC-003); find-and-print flow <60s (SC-001)
**Constraints**: Local network only; no authentication; single concurrent user; build-time default endpoint via Expo env var
**Scale/Scope**: ~2,140 items (93 collections + 2,047 prints); 4 screens (home, detail, collection, settings); 333 unique tags

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Code Quality | PASS | TypeScript with strict mode; ESLint (eslint-config-expo) + Prettier enforced; magic values (endpoint, port, debounce delay) extracted to constants/env vars |
| II. Testing Standards | PASS | jest-expo + @testing-library/react-native; tests mirror source structure; API calls mocked via React Query test utilities; happy + error path coverage planned per screen |
| III. Bullet-Tracing Development | PASS | Tracer bullet = Expo project scaffold + home screen + FlatList + /api/items fetch. Deployable on device after first task group. Iterative widening: detail page, print, search, collections, settings |
| IV. User Experience First (User B — Children) | PASS | Large touch targets, visual-first grid, search-as-you-type (no submit), on-screen back arrow, child-friendly error messages, loading indicators per 200ms rule |
| Development Workflow | PASS | ESLint + Prettier must pass; manual device/emulator testing for all UI changes; descriptive commit messages |

**Gate result: PASS** — No violations. Proceeding to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/001-kids-mobile-app/
├── plan.md              # This file
├── research.md          # Phase 0: technology decisions
├── data-model.md        # Phase 1: entities and TypeScript types
├── quickstart.md        # Phase 1: developer onboarding
├── contracts/           # Phase 1: API client interface contracts
│   └── api-client.md    # Backend API contract for mobile client
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
kids-app/                          # Expo project root (new folder)
├── app/                           # Expo Router file-based routes
│   ├── _layout.tsx                # Root Stack layout + QueryClientProvider
│   ├── index.tsx                  # Home screen (search + image grid)
│   ├── detail/
│   │   └── [id].tsx               # Individual image detail + print
│   ├── collection/
│   │   └── [id].tsx               # Collection detail page
│   └── settings.tsx               # Server endpoint configuration
├── src/
│   ├── api/
│   │   └── client.ts              # API client (fetch wrapper with base URL)
│   ├── hooks/
│   │   ├── useItems.ts            # useInfiniteQuery for /api/items
│   │   ├── useSearch.ts           # useInfiniteQuery for /api/search (debounced)
│   │   ├── useRelated.ts          # useQuery for /api/related/{id}
│   │   ├── useTags.ts             # useQuery for /api/tags
│   │   ├── usePrintImage.ts       # useMutation for /api/print-image
│   │   ├── useDebounce.ts         # Debounce hook (value-based)
│   │   └── useServerConfig.ts     # AsyncStorage read/write for endpoint
│   ├── types/
│   │   └── api.ts                 # TypeScript types matching API shapes
│   └── components/
│       ├── ImageGrid.tsx           # FlatList grid with infinite scroll
│       ├── ImageCard.tsx           # Single thumbnail card
│       ├── SearchBar.tsx           # Search input with debounce
│       ├── TagList.tsx             # Tag chips display
│       ├── RelatedSection.tsx      # Related images horizontal/grid
│       ├── PrintButton.tsx         # Print with loading/success/error states
│       ├── BackHeader.tsx          # Header with back arrow
│       └── EmptyState.tsx          # Empty/error state message
├── __tests__/
│   ├── api/
│   │   └── client.test.ts
│   ├── hooks/
│   │   ├── useItems.test.ts
│   │   ├── useSearch.test.ts
│   │   └── usePrintImage.test.ts
│   ├── components/
│   │   ├── ImageGrid.test.tsx
│   │   ├── SearchBar.test.tsx
│   │   └── PrintButton.test.tsx
│   └── screens/
│       ├── home.test.tsx
│       ├── detail.test.tsx
│       └── settings.test.tsx
├── app.json                       # Expo config (Android only)
├── tsconfig.json
├── eslint.config.mjs
├── .prettierrc
├── babel.config.js
└── package.json
```

**Structure Decision**: New `kids-app/` folder at repository root,
parallel to the existing `fastapi-image-search/` folder. This matches
the constitution's multi-folder architecture (`<mobile-app>/` slot).
The mobile app is a standalone Expo project with its own dependencies,
build tooling, and test suite. It communicates with the backend
exclusively via HTTP API calls.

## Complexity Tracking

> No constitution violations detected. Table left empty.
