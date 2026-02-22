<!-- Sync Impact Report
  Version change: 1.2.0 → 1.3.0
  Modified principles:
    - V. Performance — Measure Before Optimizing → NEW principle
      encoding FlatList performance learnings: propose-before-implement,
      batch rendering defaults, View+map() antipattern, item caps,
      React.memo/useCallback/useMemo standards, stable keyExtractor
  Previous changes (1.1.0 → 1.2.0):
    - II. Testing Standards → added mandatory E2E test requirement
      per user story with coverage guard enforcement
  Previous changes (1.0.0 → 1.1.0):
    - IV. User Experience First → expanded with two user personas
      (admin/developer and children) and per-persona UX rules
  Added sections:
    - V. Performance — Measure Before Optimizing
  Removed sections: None
  Modified sections: None
  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ no changes needed
    - .specify/templates/spec-template.md ✅ no changes needed
    - .specify/templates/tasks-template.md ✅ no changes needed
  Follow-up TODOs: None
-->

# print-react Constitution

## Core Principles

### I. Code Quality

All code MUST be clean, readable, and maintainable. This project has
real users; code quality directly affects reliability and the ability
to iterate quickly.

- Every function MUST have a single, clear responsibility.
- Python code MUST follow community conventions (PEP 8, PEP 257 for
  public APIs) and use type hints for function signatures.
- Mobile app code MUST follow the platform's idiomatic style guide
  and conventions for the chosen framework.
- Dependencies MUST be explicitly declared in `pyproject.toml` with
  minimum version pins. No undeclared or implicit dependencies.
- Magic values (URLs, ports, limits) MUST be extracted into named
  constants or environment variables.
- Dead code MUST be removed, not commented out.
- Linting (ruff or flake8) and formatting (ruff format or black) MUST
  pass before any code is merged.

**Rationale**: A toy project with real users demands the same code
hygiene as production software. Sloppy code compounds into bugs that
hurt real people.

### II. Testing Standards

Every user-facing behavior MUST be covered by automated tests. Tests
are the project's safety net and documentation of expected behavior.

- All API endpoints MUST have at least one happy-path test and one
  error-path test.
- External service calls (HTTP requests, printer communication) MUST
  be mocked in tests; tests MUST NOT depend on network availability.
- Tests MUST be deterministic: no flaky tests, no time-dependent
  assertions, no order dependencies.
- New features MUST include tests before the feature is considered
  complete. Bug fixes MUST include a regression test that reproduces
  the bug before the fix.
- Test files MUST mirror source structure (e.g., `test_main.py` tests
  `main.py`).
- Test names MUST describe the scenario under test, not the
  implementation (e.g., `test_search_returns_matching_items` not
  `test_search_function`).

**E2E / Integration Tests** (mandatory for user-facing features):

- Every user story MUST have a corresponding E2E test file in
  `__tests__/e2e/` that validates the acceptance scenarios from the
  spec. These tests are the **source of truth** for feature correctness.
- E2E tests MUST test **user-visible behavior** (what text/images
  appear, what happens on tap), NOT internal component structure.
  Changing a layout or refactoring components MUST NOT break E2E tests
  if the user story still works.
- Each E2E test MUST be prefixed with `AS-N:` matching the acceptance
  scenario number from the spec (e.g., `AS-1: home screen shows...`).
- A **coverage guard** test (`coverage-guard.test.ts`) MUST exist that
  programmatically verifies every user story has its E2E file and
  required scenario coverage. Deleting an E2E file or scenario causes
  a test failure.
- Unit tests remain valuable for isolated logic (hooks, utilities)
  but MUST NOT be the sole validation of user-facing features.

**Rationale**: Real users depend on this project working correctly.
Unit tests coupled to implementation details break on refactors even
when features still work. E2E tests tied to user stories catch real
regressions — a broken feature — without false positives from layout
changes.

### III. Bullet-Tracing Development

New features MUST be built using the bullet-tracing method: deliver a
thin, end-to-end working slice first, then iterate to fill in depth.

- Start every feature by building the simplest possible path from
  user action to visible result (the "tracer bullet").
- The tracer bullet MUST be deployable and demonstrable, even if it
  handles only the simplest case.
- Once the tracer bullet works end-to-end, iterate by widening:
  add error handling, edge cases, performance, and polish in
  subsequent passes.
- Each iteration MUST keep the system in a working, deployable state.
  No half-built features that break existing functionality.
- Prefer shipping a narrow working feature over a wide broken one.

**Rationale**: This approach validates architecture early, provides
fast feedback from real users, and prevents the trap of building
elaborate internal plumbing that never reaches the user. For a toy
project, it keeps momentum high and waste low.

### IV. User Experience First

This project serves **two distinct users** with different needs.
Every change MUST be evaluated from the perspective of the user it
targets. The user experience is the ultimate measure of value.

**User A — Admin (developer/parent)**: Uses the `fastapi-image-search`
web dashboard for image management, data curation, and system
oversight.

- Dashboard MUST surface actionable information: image counts, tag
  coverage, recent activity, and system health.
- Management operations (import, tag, delete) MUST provide clear
  progress and confirmation feedback.
- Error messages MUST include enough technical context to diagnose
  issues without consulting logs.
- Admin UI MUST be tested in a real browser before being considered
  complete.

**User B — Children**: Uses the mobile app to search for and select
images to print. This is the primary end-user experience.

- The mobile UI MUST be operable by a child: large touch targets,
  simple navigation, minimal text, visual-first design.
- Search MUST return relevant results quickly; relevance and speed
  are more important than completeness.
- Print operations MUST provide clear, child-friendly feedback:
  visual success confirmation, simple retry on failure.
- The app MUST work well on mobile screen sizes and handle
  intermittent connectivity gracefully.
- Mobile app changes MUST be tested on a real device or emulator
  before being considered complete.

**Shared rules (both users)**:

- UI responses MUST feel immediate: provide loading indicators for
  operations that take more than 200ms.
- Error messages shown to end users MUST be actionable and written
  in plain language, not stack traces or technical jargon.
- Accessibility basics MUST be maintained: semantic structure, alt
  text on images, sufficient contrast.

**Rationale**: The project serves two audiences with fundamentally
different needs and technical literacy. A child searching for a
coloring page and a developer managing the image catalog require
different UX considerations. Designing for both explicitly prevents
one audience's needs from being neglected.

### V. Performance — Measure Before Optimizing

Performance changes MUST be proposed with alternatives and approved
before implementation. Optimizations MUST NOT be applied speculatively.

- Performance issues MUST be reproduced and described before proposing
  fixes. "It feels slow" is a valid starting point, but the specific
  symptom (scroll jank, slow page transition, long initial load) MUST
  be identified.
- Proposed optimizations MUST be listed with pros/cons for user review
  before any code is changed. The user chooses the approach.
- **FlatList batching is the default optimization for list performance.**
  Use `initialNumToRender`, `maxToRenderPerBatch`, `removeClippedSubviews`,
  and `windowSize` before considering structural changes.
- **Never replace FlatList with View + map() for lists > ~10 items.**
  FlatList's internal batching spreads mount cost across frames; plain
  map() renders everything in one frame, causing visible freezes.
- **Nested grids MUST be capped** at a maximum item count (currently
  48) to prevent unbounded rendering. The cap MUST be divisible by the
  column count for clean grid rows.
- `React.memo` on leaf list-item components and `useCallback`/`useMemo`
  for stable references are standard practice for any scrollable list.
- `keyExtractor` MUST use a stable, unique identifier (e.g., URL or
  database ID), never array index.

**Rationale**: A failed optimization (View + map() replacing FlatList)
taught us that intuitive "simplifications" can make performance worse.
Requiring user approval before implementing performance changes prevents
wasted effort and regressions. Batch rendering is the highest-impact,
lowest-risk optimization for React Native lists.

## Project Context

- **Project type**: Toy project with real users
- **Primary use case**: Image search and printing for kids' activities
  from krokotak.com
- **Users**:
  - **Admin (developer/parent)**: Dashboard and image management
  - **Children**: Search and select images to print via mobile app
- **Repository structure**:
  - `fastapi-image-search/` — Python backend and admin dashboard
    (Tech: Python 3.10+, FastAPI, Jinja2, httpx, BeautifulSoup4;
    Testing: unittest with FastAPI TestClient)
  - `<mobile-app>/` — Mobile app for children (tech stack TBD,
    folder will be created when mobile development begins)
- **Note**: The project will expand beyond the current backend.
  Principles apply to all folders and tech stacks equally.

## Development Workflow

- Features MUST follow the bullet-tracing approach: tracer bullet
  first, then iterative widening.
- Every PR MUST pass linting, formatting, and all existing tests.
- Manual browser testing MUST be performed for any UI-facing change.
- Commit messages MUST be descriptive and reference the change's
  purpose (not just "fix" or "update").

## Governance

This constitution is the authoritative guide for development decisions
in the print-react project. All contributors and automated agents MUST
comply with these principles.

- **Amendments**: Any principle change MUST be documented with a
  rationale, versioned using semantic versioning, and recorded in
  the Sync Impact Report at the top of this file.
- **Versioning policy**:
  - MAJOR: Principle removed or fundamentally redefined.
  - MINOR: New principle added or existing principle materially
    expanded.
  - PATCH: Clarifications, wording fixes, non-semantic refinements.
- **Compliance**: All code reviews and feature plans MUST verify
  alignment with these principles. The Constitution Check section in
  plan templates references this file.

**Version**: 1.3.0 | **Ratified**: 2026-02-21 | **Last Amended**: 2026-02-22
