# Tasks: Multi-Site Printable Activities Scraper

**Input**: Design documents from `/specs/008-scrape-coloring-sites/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested — test tasks omitted. E2E validation via quickstart.md.

**Organization**: Tasks grouped by user story. US1 (scraper) is the bulk of the work. US2 (browse) requires only seed.py changes. US3 (print) requires print handler refactoring.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create scraper package structure and install dependencies

- [x] T001 Create scraper package directory structure: `fastapi-image-search/scraper/__init__.py`, `scraper/sites/__init__.py`, `scraper/output/.gitkeep`, `fastapi-image-search/print_handlers/__init__.py`
- [x] T002 Add `playwright` as optional dependency in `fastapi-image-search/pyproject.toml` and run `playwright install chromium`
- [x] T003 Add `scraper/output/` to `fastapi-image-search/.gitignore`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Base classes, CLI, and utilities that all site parsers and print handlers depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Implement `BaseScraper` class (httpx+BS4) in `fastapi-image-search/scraper/base.py` — constructor takes `source_id`, `base_url`, `content_type_tag`; methods: `get_categories() -> list[dict]`, `scrape_category(url, tag) -> list[dict]`, `run() -> list[dict]`; includes rate limiting (0.5s between requests), JSON output writer, checkpoint save/load, progress logging per contract
- [x] T005 Implement `PlaywrightScraper` subclass in `fastapi-image-search/scraper/base.py` — extends BaseScraper; launches headful Chromium browser; captcha detection (check for common captcha indicators in page); notify via `notify-send` + `paplay` /dev/null fallback; `input()` pause; checkpoint save before pause
- [x] T006 Implement rate limiter in `fastapi-image-search/scraper/rate_limiter.py` — simple async sleep-based, 0.5s default (2 req/sec), configurable per site
- [x] T007 Implement CLI entry point in `fastapi-image-search/scraper/cli.py` and `fastapi-image-search/scraper/__main__.py` — argparse with: `<site_id>`, `--all`, `--all --skip-playwright`, `--resume`, `--list`; imports site registry from `scraper/sites/__init__.py`; exit codes 0/1/2 per contract
- [x] T008 Create site registry in `fastapi-image-search/scraper/sites/__init__.py` — dict mapping source_id to parser class; function `get_scraper(site_id)` and `list_scrapers()`

**Checkpoint**: Foundation ready — site parsers and print handlers can now be implemented

---

## Phase 3: User Story 1 — Scrape and Import from Multiple Sites (Priority: P1) 🎯 MVP

**Goal**: Scraper extracts printable activity data from target sites, outputs JSON, seed script imports with `--source`

**Independent Test**: Run `uv run python -m scraper mondaymandala`, verify JSON output has valid entries with url, thumbnail, searches (tags), type. Then `uv run python seed.py --data scraper/output/scraped_mondaymandala.json --source mondaymandala` and verify pages exist in database.

### Seed Script Enhancement

- [x] T009 [US1] Add `--source` CLI argument to `fastapi-image-search/seed.py` — pass value to `seed()` function's existing `source` parameter; default remains `'krokotak'`

### Coloring Page Scrapers (httpx+BS4)

- [x] T010 [P] [US1] Implement Monday Mandala scraper in `fastapi-image-search/scraper/sites/mondaymandala.py` — scrape category index page for all ~180 category URLs; per category page extract `<a href=PDF><img src=JPG>` pairs; store PDF as `url`, JPG as `thumbnail`; tags = category name + `"coloring"`; handle pagination if present
- [x] T011 [P] [US1] Implement Printable Free Coloring scraper in `fastapi-image-search/scraper/sites/printablefreecoloring.py` — three-level scrape: categories page → subcategory pages (e.g., `/animals/cat/`) → individual pages; store full image URL (`/drawing/animals/coloring-cat-1890.jpg`) as `url`, thumbnail as `thumbnail`; tags = subcategory + category + `"coloring"`
- [x] T012 [P] [US1] Implement Crayola scraper in `fastapi-image-search/scraper/sites/crayola.py` — scrape category pages with `<li class="item-list-item">` grid; extract image URLs and detail page links; store detail page as `url` (print handler will extract image), image as `thumbnail`; tags = category + `"coloring"`; handle pagination
- [x] T013 [P] [US1] Implement Cute Coloring Pages scraper in `fastapi-image-search/scraper/sites/cutecoloringpages.py` — WordPress blog structure; scrape post listings per theme; extract featured image as `thumbnail`, PDF/post link as `url`; tags from theme name + `"coloring"`
- [x] T014 [P] [US1] Implement Coloring Bunny scraper in `fastapi-image-search/scraper/sites/coloringbunny.py` — extract PDF download links and thumbnails; tags = category + `"coloring"`
- [x] T015 [P] [US1] Implement Yay! Coloring Pages scraper in `fastapi-image-search/scraper/sites/yaycoloringpages.py` — extract PDF links and thumbnails; tags = category + `"coloring"`
- [x] T016 [P] [US1] Implement Online-Coloring.com scraper in `fastapi-image-search/scraper/sites/onlinecoloring.py` — extract printable image URLs and thumbnails; tags = category + `"coloring"`

### Craft Template Scrapers

- [x] T017 [P] [US1] Implement PJs and Paint scraper in `fastapi-image-search/scraper/sites/pjsandpaint.py` — httpx+BS4; extract PDF craft templates; tags = craft type + `"craft"`
- [x] T018 [P] [US1] Implement Paper Toys scraper in `fastapi-image-search/scraper/sites/papertoys.py` — httpx+BS4; extract PDF model links; tags = model type + `"craft"`
- [x] T019 [P] [US1] ~~Crafting Jeannie~~ — SKIPPED: membership site, no public downloadable content
- [x] T020 [P] [US1] ~~FirstPalette~~ — SKIPPED: printable content rendered purely via JS, no downloadable files
- [x] T021 [P] [US1] ~~The Craft Train~~ — SKIPPED: content rendered via JS, no downloadable files

### Origami Scrapers

- [x] T022 [P] [US1] Implement Origami-Fun scraper in `fastapi-image-search/scraper/sites/origamifun.py` — httpx+BS4; extract PDF diagram links by difficulty; tags = model name + difficulty + `"origami"`
- [x] T023 [P] [US1] Implement Happy Folding scraper in `fastapi-image-search/scraper/sites/happyfolding.py` — httpx+BS4; extract 162 PDF diagram links; tags = model name + `"origami"`
- [x] T024 [P] [US1] ~~Kiddo Worksheets~~ — SKIPPED: dynamic worksheet generator, no downloadable printables

### Paper Cutting / Scissors Practice Scrapers

- [x] T025 [P] [US1] ~~Suncatcher Studio~~ — SKIPPED: content rendered via JS, no downloadable files
- [x] T026 [P] [US1] ~~Fun Sensory Play~~ — SKIPPED: no downloadable content found on category pages
- [x] T027 [P] [US1] Implement Kidsnex scraper in `fastapi-image-search/scraper/sites/kidsnex.py` — httpx+BS4; extract cutting activity PDFs; tags = activity type + `"cutting-practice"`

### Maze & Dot-to-Dot Scrapers

- [x] T028 [P] [US1] Implement All Kids Network scraper in `fastapi-image-search/scraper/sites/allkidsnetwork.py` — httpx+BS4; extract maze and dot-to-dot PDFs/images; tags = theme + `"maze"` or `"dot-to-dot"`
- [x] T029 [P] [US1] Implement Animal Dot to Dots scraper in `fastapi-image-search/scraper/sites/animaldottodots.py` — httpx+BS4; extract 100+ PDF worksheets; tags = animal name + `"dot-to-dot"`
- [x] T030 [P] [US1] Implement Monkey Pen scraper in `fastapi-image-search/scraper/sites/monkeypen.py` — httpx+BS4; extract dot-to-dot PDF activities; tags = theme + `"dot-to-dot"`
- [x] T031 [P] [US1] Implement Superstar Worksheets scraper in `scraper/sites/superstarworksheets.py` — Playwright; 1,207 entries scraped across coloring, mazes, dot-to-dot, word search

### Puzzle Scrapers (Word Search & Spot the Difference)

- [x] T032 [P] [US1] Implement Puzzles to Print scraper in `fastapi-image-search/scraper/sites/puzzlestoprint.py` — httpx+BS4; extract word search PDFs; tags = theme + `"word-search"`
- [x] T033 [P] [US1] ~~Tree Valley Academy~~ — SKIPPED: content rendered via JS, no downloadable files
- [x] T034 [P] [US1] Implement Just Family Fun scraper in `fastapi-image-search/scraper/sites/justfamilyfun.py` — httpx+BS4; extract word search + spot-the-difference PDFs; tags = difficulty + `"word-search"` or `"spot-the-difference"`
- [x] T035 [P] [US1] Implement Print it Free scraper in `fastapi-image-search/scraper/sites/printitfree.py` — httpx+BS4; extract spot-the-difference images/PDFs; tags = theme + `"spot-the-difference"`

### Paper Doll Scrapers

- [x] T036 [P] [US1] Implement Paper Thin Personas scraper in `fastapi-image-search/scraper/sites/paperthinpersonas.py` — httpx+BS4; extract PDF paper doll sets; tags = doll series + `"paper-doll"`
- [x] T037 [P] [US1] Implement Design Eat Repeat scraper in `fastapi-image-search/scraper/sites/designeatrepeat.py` — httpx+BS4; extract PDF dolls + outfits; tags = `"paper-doll"`
- [x] T038 [P] [US1] ~~Adventure in a Box~~ — SKIPPED: Squarespace website expired (dead)

### Tracing & Handwriting Scrapers

- [x] T039 [P] [US1] Implement Worksheet Fun scraper in `fastapi-image-search/scraper/sites/worksheetfun.py` — httpx+BS4; extract tracing worksheet PDFs; tags = letters/numbers + `"tracing"`
- [x] T040 [P] [US1] Superstar Worksheets tracing — covered by T031 (scraper already scrapes all worksheet categories including tracing)

### Register All Scrapers

- [x] T041 [US1] Register all site parsers in `fastapi-image-search/scraper/sites/__init__.py` — import all scraper classes from T010-T040 and add to registry dict

**Checkpoint**: `uv run python -m scraper <any_site>` produces valid JSON. `uv run python seed.py --data <json> --source <site>` imports into database. All 7 content types represented.

---

## Phase 4: User Story 2 — Browse Printable Activities by Source in the App (Priority: P2)

**Goal**: Scraped pages display in the kids app with correct thumbnails, tags, and source identification

**Independent Test**: Seed scraped data, call `GET /api/items` and verify response includes pages from new sources with correct tags.

- [x] T042 [US2] Verify existing `/api/items` and `/api/search` endpoints serve multi-source pages without code changes — confirm `source` field is returned in API responses in `fastapi-image-search/main.py`; add `source` to item serialization if not already included
- [x] T043 [US2] Verify tag deduplication works case-insensitively in `fastapi-image-search/seed.py` — existing `INSERT OR IGNORE` uses exact match; if needed, normalize tag names to lowercase before insert

**Checkpoint**: App shows pages from all sources with correct thumbnails and tags

---

## Phase 5: User Story 3 — Print/View Activities from New Sources (Priority: P2)

**Goal**: Users can print pages from any source using the appropriate format handler (PDF, image, or detail page)

**Independent Test**: Call `GET /api/print-image?url=<pdf_url>` with a Monday Mandala PDF URL and verify it prints. Repeat with a Printable Free Coloring image URL. Repeat with a Crayola detail page URL.

### Print Handler Implementation

- [x] T044 [P] [US3] Implement `PrintHandler` base class and `get_print_handler(url)` dispatch function in `fastapi-image-search/print_handlers/__init__.py` — URL-based routing per contract: `.pdf` → DirectPdfHandler, `.jpg/.png/.webp` → DirectImageHandler, `krokotak.com` → KrokotakHandler, else → DetailPageHandler
- [x] T045 [P] [US3] Extract existing krokotak print logic into `fastapi-image-search/print_handlers/krokotak.py` — move `fetch_krokotak_page()` and webp→PNG conversion from `main.py` into `KrokotakHandler.get_printable_png(url) -> bytes`
- [x] T046 [P] [US3] Implement `DirectImageHandler` in `fastapi-image-search/print_handlers/direct_image.py` — fetch image via httpx → detect format from content-type or extension → convert to PNG via ImageMagick `convert` if not already PNG → return bytes
- [x] T047 [P] [US3] Implement `DirectPdfHandler` in `fastapi-image-search/print_handlers/direct_pdf.py` — fetch PDF via httpx → save to temp file → `convert pdf[0] png` via ImageMagick → return PNG bytes → cleanup temp files
- [x] T048 [US3] Implement `DetailPageHandler` in `fastapi-image-search/print_handlers/detail_page.py` — fetch HTML via httpx → parse with BS4 → find first `<img>` with large src or `<a href=*.pdf>` → delegate to DirectImageHandler or DirectPdfHandler

### Integrate into Main API

- [x] T049 [US3] Refactor `get_print_image()` endpoint in `fastapi-image-search/main.py` — replace inline krokotak logic with `handler = get_print_handler(url); png_bytes = await handler.get_printable_png(url); result = await printer_service.print_image(png_bytes)`

**Checkpoint**: Printing works for all source types — PDF, direct image, krokotak, and detail page URLs

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T050 [P] Run all scrapers and seed all data — 94,659 pages from 21 sources (20 new + krokotak), 4,006 tags. SC-001 ✓ (21 sites), SC-002 ✓ (94K+ pages), SC-003 ✓ (all tagged)
- [x] T051 [P] Verify thumbnail hotlinks work — 10/10 random thumbnails return HTTP 200 with correct image content-type
- [x] T052 Verify print handler dispatch — PDF→DirectPdfHandler, JPG/PNG→DirectImageHandler, krokotak→KrokotakHandler, other→DetailPageHandler all correctly routed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2. All site scrapers (T010-T040) are parallelizable
- **US2 (Phase 4)**: Depends on Phase 2. Can run in parallel with US1 (T042-T043 are verification tasks)
- **US3 (Phase 5)**: Depends on Phase 2. Can run in parallel with US1. Print handlers (T044-T048) are parallelizable
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Independent — produces JSON files and seeds database
- **US2 (P2)**: Needs seeded data from US1 to verify, but code changes (T042-T043) are independent
- **US3 (P2)**: Independent — print handlers work on any URL regardless of how it got into the database

### Within User Story 1

- T009 (seed.py) is independent of all scrapers
- All scrapers (T010-T040) are fully parallel — different files, no shared state
- T041 (registry) depends on all scrapers being complete

### Parallel Opportunities

```
Phase 2 complete →
  ├── US1: T009 + T010-T040 (all parallel) → T041
  ├── US2: T042 + T043 (parallel)
  └── US3: T044-T048 (all parallel) → T049
```

---

## Parallel Example: User Story 1

```bash
# Launch all coloring page scrapers in parallel:
Task: "T010 Monday Mandala scraper in scraper/sites/mondaymandala.py"
Task: "T011 Printable Free Coloring scraper in scraper/sites/printablefreecoloring.py"
Task: "T012 Crayola scraper in scraper/sites/crayola.py"
Task: "T013 Cute Coloring Pages scraper in scraper/sites/cutecoloringpages.py"
# ... all T014-T040 in parallel too

# Launch all print handlers in parallel:
Task: "T045 KrokotakHandler in print_handlers/krokotak.py"
Task: "T046 DirectImageHandler in print_handlers/direct_image.py"
Task: "T047 DirectPdfHandler in print_handlers/direct_pdf.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 — Single Site)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (base classes, CLI, rate limiter)
3. Implement T009 (seed.py --source) + T010 (mondaymandala scraper only) + T041 (registry with 1 entry)
4. **STOP and VALIDATE**: `uv run python -m scraper mondaymandala` → JSON → seed → verify in database
5. This is the tracer bullet — end-to-end working with 1 site

### Incremental Delivery

1. Tracer bullet: mondaymandala → scrape → seed → browse ✓
2. Add print handlers (US3) → print mondaymandala pages ✓
3. Add remaining httpx+BS4 scrapers (T011-T018, T022-T023, T025-T030, T032, T034-T039) — 21 sites
4. Add Playwright scrapers (T019-T021, T024, T031, T033, T038, T040) — 8 sites
5. Full validation (Phase 6)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- All 30 site scrapers are fully parallelizable within US1
- Playwright sites (8) should be done last — they require browser install and may hit captchas
- The 5 sites marked ⚠️ (suncatcherstudio, funsensoryplay, kiddoworksheets, treevalleyacademy, adventureinabox) should try httpx+BS4 first; only switch to Playwright if content is empty
