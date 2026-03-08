# Research: React Admin Dashboard

## R1: React Project Setup for FastAPI Static Serving

**Decision**: Create a separate `admin-ui/` directory at repo root with Vite + React + TypeScript. Build output goes to `fastapi-image-search/static/admin/` and FastAPI serves it at `/admin`.

**Rationale**: Vite is the standard React build tool — fast dev server, optimized production builds. Separate directory keeps frontend concerns isolated from the Python backend. Build output as static files means zero backend changes for serving.

**Alternatives considered**:
- Create React App: Deprecated, slower builds.
- Next.js: Overkill for an admin SPA with no SSR needs.
- Embed in fastapi-image-search/: Mixes Python and Node tooling in one directory.

## R2: TanStack Libraries for Admin Dashboard

**Decision**: Use TanStack Query (data fetching/caching), TanStack Table (sortable/filterable tables), and TanStack Router (type-safe routing). Evaluate TanStack Form if needed — otherwise use standard controlled components for simple forms.

**Rationale**: User explicitly requested heavy TanStack usage. TanStack Query handles cache invalidation after mutations (NFR-003). TanStack Table provides built-in pagination, sorting, filtering for all admin list views. TanStack Router gives type-safe, URL-based routing (FR-006).

**Alternatives considered**:
- React Router + custom tables: More manual work, less type safety.
- React Hook Form: Lightweight alternative for forms, may be preferable if TanStack Form feels heavy.

## R3: API Client Architecture

**Decision**: Create a standalone API client module (`admin-ui/src/api/client.ts`) using native `fetch` — same architecture as `kids-app/src/api/client.ts`. Factory function `createApiClient(baseUrl)` returns typed methods. Provide via React Context (`ApiClientContext`), consumed by TanStack Query hooks.

**Rationale**: User explicitly requested separated client matching kids-app architecture. Native `fetch` — no HTTP library dependency. Typed client enables autocomplete, catches contract mismatches at compile time.

**Alternatives considered**:
- Axios: Unnecessary abstraction over fetch for this use case.
- OpenAPI codegen: Backend doesn't have an OpenAPI spec file committed; manual client is simpler.
- Fetch directly in components: No reuse, no type safety.

## R4: Styling Approach

**Decision**: Use vanilla CSS with CSS Modules (`.module.css`) for component-scoped styles. Port existing `style.css` color scheme and layout patterns.

**Rationale**: The current dashboard uses vanilla CSS. CSS Modules give scoping without adding a runtime dependency (styled-components) or build complexity (Tailwind). Keeps the migration focused on architecture, not design changes.

**Alternatives considered**:
- Tailwind CSS: Adds build config complexity, learning curve for utility classes.
- styled-components: Runtime CSS-in-JS, unnecessary for a simple admin panel.
- Keep global CSS: Risk of style conflicts as app grows.

## R5: FastAPI Serving Configuration

**Decision**: Add a single `StaticFiles` mount in `main.py` at `/admin` pointing to `static/admin/` build output. Add a catch-all route for `/admin/{path}` to return `index.html` for client-side routing.

**Rationale**: Minimal backend change (2-3 lines). SPA catch-all is needed for TanStack Router to handle deep links like `/admin/insights/device-123`.

**Alternatives considered**:
- Nginx reverse proxy: Adds deployment complexity for a local-network app.
- Serve from Vite dev server in production: Not production-ready.

## R6: Testing Strategy

**Decision**: Use Vitest + Testing Library for component tests. E2E tests per constitution requirement (one per user story). Coverage guard pattern same as kids-app.

**Rationale**: Vitest is native to Vite, fast, compatible with Jest API. Testing Library aligns with constitution's "test user-visible behavior" principle.

**Alternatives considered**:
- Jest: Requires additional config for Vite/ESM.
- Playwright: Good for E2E but heavier setup; start with Testing Library for unit/integration, add Playwright later if needed.
