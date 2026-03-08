# Implementation Plan: React Admin Dashboard

**Branch**: `010-react-admin` | **Date**: 2026-03-08 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/010-react-admin/spec.md`

## Summary

Migrate the admin dashboard from Jinja2 templates + vanilla JS (`app.js`) to a React SPA using TanStack libraries (Query, Table, Router). The React app lives in a separate `admin-ui/` directory, builds to static files served by FastAPI at `/admin`. Uses native `fetch` and mirrors the `kids-app/` architecture (factory API client, context provider, typed hooks).

## Technical Context

**Language/Version**: TypeScript 5.x, React 19
**Primary Dependencies**: @tanstack/react-query, @tanstack/react-table, @tanstack/react-router, Vite
**Storage**: N/A (consumes existing backend API)
**Testing**: Vitest + @testing-library/react
**Target Platform**: Desktop browsers (Chrome, Firefox), 1024px+
**Project Type**: Web SPA (admin dashboard)
**Performance Goals**: Initial load < 2s on local network
**Constraints**: No backend changes; coexist with old dashboard during migration
**Scale/Scope**: Single admin user, ~5 pages/routes, ~30 API endpoints consumed

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | TypeScript with strict mode, ESLint, single-responsibility components |
| II. Testing Standards | PASS | E2E tests per user story, coverage guard, Vitest + Testing Library |
| III. Bullet-Tracing | PASS | US1 (browse/search) is the tracer bullet — thin end-to-end slice |
| IV. UX First (Admin) | PASS | Dashboard targets Admin persona; actionable feedback, clear errors |
| V. Performance | PASS | No premature optimization; measure-first approach maintained |

**Post-design re-check**: All gates still PASS. No new dependencies beyond what's documented.

## Project Structure

### Documentation (this feature)

```text
specs/010-react-admin/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── admin-api-client.md
│   └── ui-components.md
└── tasks.md
```

### Source Code (repository root)

```text
admin-ui/                          # React SPA (Vite + TypeScript)
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.tsx                   # Entry point
│   ├── App.tsx                    # Router + providers
│   ├── api/
│   │   ├── client.ts             # createAdminApiClient() factory (fetch-based)
│   │   └── apiClientContext.tsx   # React context provider
│   ├── types/
│   │   └── api.ts                # TypeScript types for API responses
│   ├── hooks/
│   │   ├── usePages.ts           # TanStack Query hooks for pages
│   │   ├── useTags.ts            # TanStack Query hooks for tags
│   │   ├── useDevices.ts         # TanStack Query hooks for devices
│   │   └── useInsights.ts        # TanStack Query hooks for insights
│   ├── components/
│   │   ├── DataTable.tsx         # Generic TanStack Table wrapper
│   │   ├── Modal.tsx             # Reusable modal
│   │   ├── Toast.tsx             # Toast notifications
│   │   ├── ConfirmDialog.tsx     # Delete/merge confirmation
│   │   └── Layout.tsx            # Nav sidebar + content area
│   └── pages/
│       ├── PagesPage.tsx         # Browse, search, CRUD pages
│       ├── TagsPage.tsx          # Tag management
│       ├── DevicesPage.tsx       # Device management
│       ├── InsightsPage.tsx      # Insights overview
│       └── DeviceTimelinePage.tsx # Per-device activity timeline
└── __tests__/
    └── e2e/                      # E2E tests per user story
```

**Structure Decision**: Separate `admin-ui/` directory at repo root, mirroring `kids-app/` architecture. Build output deploys to `fastapi-image-search/static/admin/`. Backend serves at `/admin` with SPA catch-all route.
