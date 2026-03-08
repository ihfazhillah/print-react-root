# Implementation Plan: Multi-Site Printable Activities Scraper

**Branch**: `008-scrape-coloring-sites` | **Date**: 2026-03-08 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/008-scrape-coloring-sites/spec.md`

## Summary

Build a per-site scraper system that extracts coloring pages, craft templates, origami diagrams, puzzles, paper dolls, and tracing worksheets from ~30 websites. Each site gets its own parser module. Sites are classified as either **httpx+BS4** (static HTML) or **Playwright** (JS-rendered, with captcha pause). Output is JSON files matching the existing `data.json` format, seeded into the database with per-source identification. The print workflow is extended with a source-aware dispatch to handle PDF, direct image, and detail-page-scraping print strategies.

## Technical Context

**Language/Version**: Python 3.10+ (existing backend)
**Primary Dependencies**: httpx, BeautifulSoup4 (existing); Playwright (new, for JS-rendered sites)
**Storage**: SQLite via aiosqlite (existing `printable_pages.db`)
**Testing**: stdlib `unittest` (existing convention)
**Target Platform**: Linux server (scraper runs locally)
**Project Type**: CLI scraper script + backend API extension
**Constraints**: Rate limit 2 req/sec per site; Playwright sites may hit captcha → pause for manual solve, then resume
**Scale/Scope**: ~30 sites, targeting 5,000+ entries total

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | ✅ Pass | Per-site parser modules with single responsibility; type hints; constants for URLs/limits |
| II. Testing Standards | ✅ Pass | Each site parser testable with saved HTML fixtures; E2E test: scrape → seed → API returns pages |
| III. Bullet-Tracing | ✅ Pass | Tracer: 1 site (mondaymandala) → JSON → seed → display → print. Then widen to remaining sites |
| IV. UX First | ✅ Pass | Admin: clear scraper logs + progress. Children: pages appear with thumbnails and tags |
| V. Performance | ✅ Pass | No perf changes to app. Scraper is offline batch process |

## Project Structure

### Documentation (this feature)

```text
specs/008-scrape-coloring-sites/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
fastapi-image-search/
├── main.py                      # Extended: source-aware print dispatch
├── seed.py                      # Extended: --source CLI arg
├── scraper/                     # NEW: scraper package
│   ├── __init__.py
│   ├── cli.py                   # CLI entry point: python -m scraper <site>
│   ├── base.py                  # BaseScraper class (httpx+BS4) + PlaywrightScraper class
│   ├── rate_limiter.py          # Rate limiter (2 req/sec)
│   ├── sites/                   # Per-site parser modules
│   │   ├── __init__.py          # Registry of all site parsers
│   │   ├── mondaymandala.py     # httpx+BS4
│   │   ├── printablefreecoloring.py  # httpx+BS4
│   │   ├── crayola.py           # httpx+BS4
│   │   ├── cutecoloringpages.py # httpx+BS4
│   │   ├── craftingjeannie.py   # Playwright (JS-rendered)
│   │   ├── firstpalette.py      # Playwright (JS-rendered)
│   │   ├── thecrafttrain.py     # Playwright (JS-rendered)
│   │   ├── pjsandpaint.py       # httpx+BS4
│   │   ├── papertoys.py         # httpx+BS4
│   │   ├── origamifun.py        # httpx+BS4
│   │   ├── happyfolding.py      # httpx+BS4
│   │   ├── kiddoworksheets.py   # Playwright (JS-rendered, WordPress)
│   │   ├── coloringbunny.py     # httpx+BS4
│   │   ├── yaycoloringpages.py  # httpx+BS4
│   │   ├── onlinecoloring.py    # httpx+BS4
│   │   ├── suncatcherstudio.py  # httpx+BS4
│   │   ├── funsensoryplay.py    # Playwright (JS-rendered, WordPress)
│   │   ├── kidsnex.py           # httpx+BS4
│   │   ├── allkidsnetwork.py    # httpx+BS4
│   │   ├── animaldottodots.py   # httpx+BS4
│   │   ├── monkeypen.py         # httpx+BS4
│   │   ├── superstarworksheets.py  # Playwright (JS-rendered)
│   │   ├── puzzlestoprint.py    # httpx+BS4
│   │   ├── treevalleyacademy.py # Playwright (JS-rendered, WordPress)
│   │   ├── justfamilyfun.py     # httpx+BS4
│   │   ├── printitfree.py       # httpx+BS4
│   │   ├── paperthinpersonas.py # httpx+BS4 (WordPress, but content loads server-side)
│   │   ├── designeatrepeat.py   # httpx+BS4
│   │   ├── adventureinabox.py   # Playwright (JS-rendered, WordPress)
│   │   ├── worksheetfun.py      # httpx+BS4
│   │   └── ...
│   └── output/                  # Generated JSON files (gitignored)
│       ├── scraped_mondaymandala.json
│       ├── scraped_crayola.json
│       └── ...
└── print_handlers/              # NEW: source-aware print dispatch
    ├── __init__.py              # Registry + dispatch function
    ├── krokotak.py              # Existing logic extracted
    ├── direct_image.py          # Fetch image URL → convert → print
    └── direct_pdf.py            # Fetch PDF → convert → print
```

**Structure Decision**: Scraper lives inside `fastapi-image-search/` alongside existing backend code. It's a separate package (`scraper/`) run as a CLI tool, not a web endpoint. Print handlers are extracted into their own module for clean source-based dispatch.

## Site Classification: httpx+BS4 vs Playwright

Based on our research, sites are classified by whether their content loads server-side (static HTML) or requires JavaScript rendering.

### httpx+BS4 (Static HTML) — 21 sites

| Site | Source ID | Verified | Notes |
|------|-----------|----------|-------|
| Monday Mandala | mondaymandala | ✅ WebFetch returned full content | `<a href=PDF><img src=JPG>` pattern |
| Printable Free Coloring | printablefreecoloring | ✅ WebFetch returned full content | `/thumbnail/` + `/drawing/` URL patterns |
| Crayola | crayola | ✅ WebFetch returned full content | `<li>` grid with image URLs |
| Cute Coloring Pages | cutecoloringpages | ✅ Schema markup visible | WordPress, images in post content |
| PJs and Paint | pjsandpaint | ✅ WebFetch returned craft list | "Color, cut and assemble" crafts |
| Paper Toys | papertoys | ✅ WebFetch returned content | PDF printable models |
| Origami-Fun | origamifun | ✅ Expected static | PDF diagram links |
| Happy Folding | happyfolding | ✅ Expected static | PDF diagram downloads |
| Coloring Bunny | coloringbunny | ✅ Expected static | Online + PDF |
| Yay! Coloring Pages | yaycoloringpages | ✅ Expected static | PDF downloads |
| Online-Coloring.com | onlinecoloring | ✅ Expected static | Interactive + printable |
| Kidsnex | kidsnex | ✅ Expected static | PDF cutting sheets |
| All Kids Network | allkidsnetwork | ✅ Expected static | PDF/images |
| Animal Dot to Dots | animaldottodots | ✅ Expected static | PDF worksheets |
| Monkey Pen | monkeypen | ✅ Expected static | PDF dot-to-dot |
| Puzzles to Print | puzzlestoprint | ✅ Expected static | PDF word searches |
| Just Family Fun | justfamilyfun | ✅ Expected static | PDF puzzles |
| Print it Free | printitfree | ✅ Expected static | PDF/images |
| Paper Thin Personas | paperthinpersonas | ✅ WordPress server-rendered | PDF paper dolls |
| Design Eat Repeat | designeatrepeat | ✅ Expected static | PDF dolls + outfits |
| Worksheet Fun | worksheetfun | ✅ Expected static | PDF tracing worksheets |

### Playwright (JS-Rendered) — 8 sites

| Site | Source ID | Verified | Why Playwright needed |
|------|-----------|----------|----------------------|
| Crafting Jeannie | craftingjeannie | ✅ WebFetch returned only JS/CSS | WordPress with heavy JS rendering |
| FirstPalette | firstpalette | ✅ WebFetch returned only JS/CSS | JS-rendered craft listings |
| The Craft Train | thecrafttrain | ✅ WebFetch returned only JS/CSS | WordPress with JS rendering |
| Superstar Worksheets | superstarworksheets | ❌ WebFetch returned only JS/CSS | Porto theme, JS-rendered |
| Suncatcher Studio | suncatcherstudio | ⚠️ Likely WordPress JS | Needs verification |
| Fun Sensory Play | funsensoryplay | ⚠️ Likely WordPress JS | Needs verification |
| Kiddo Worksheets | kiddoworksheets | ⚠️ Likely WordPress JS | Needs verification |
| Tree Valley Academy | treevalleyacademy | ⚠️ Likely WordPress JS | Needs verification |
| Adventure in a Box | adventureinabox | ⚠️ Likely WordPress JS | Needs verification |

### Captcha Handling Strategy

When a Playwright scraper encounters a captcha:
1. **Notify** — send desktop notification via `notify-send` + play alert sound so admin notices even when doing something else
2. **Pause** — print message to terminal: `CAPTCHA detected on <url>. Solve in browser, then press Enter.`
3. **Wait** — `input()` blocks until admin presses Enter
4. **Resume** — scraper continues from where it left off
5. **Progress saving** — before pausing, the scraper saves progress (categories completed, current position) so it can resume even if killed

## Print Workflow: Source-Aware Dispatch

### Current (krokotak only)

```
URL → transform /print → /_print → fetch HTML → extract base64 img → decode webp → convert PNG → print
```

### New: Source-Based Print Strategies

| Strategy | Sources | How it works |
|----------|---------|--------------|
| **krokotak** (existing) | krokotak | URL manipulation → `/_print` page → base64 extract → webp→PNG → print |
| **direct_image** | printablefreecoloring, crayola, cutecoloringpages, animaldottodots, printitfree, and most image-based sites | Fetch image URL directly → detect format → convert to PNG if needed → print |
| **direct_pdf** | mondaymandala, origamifun, happyfolding, puzzlestoprint, and most PDF-based sites | Fetch PDF URL → convert first page to PNG via ImageMagick (`convert pdf[0] png`) → print |
| **detail_page** | Sites where `url` points to an HTML page, not a direct file | Fetch detail page HTML → extract image/PDF URL from page → then use direct_image or direct_pdf |

### Implementation

The `url` field stored in the database determines the print strategy:
- If `url` ends with `.pdf` → `direct_pdf`
- If `url` ends with `.jpg`, `.png`, `.webp` → `direct_image`
- If `url` contains `krokotak.com` → `krokotak` (existing)
- Otherwise → `detail_page` (fetch HTML, extract printable)

This means the **scraper must store the most direct URL possible**:
- For Monday Mandala: store the PDF link (e.g., `https://mondaymandala.com/wp-content/uploads/.../Cat.pdf`)
- For Printable Free Coloring: store the full image URL (e.g., `https://printablefreecoloring.com/drawing/animals/coloring-cat-1890.jpg`)
- For Crayola: store the detail page URL (print handler fetches image from it)

## Complexity Tracking

No constitution violations. All choices are minimal complexity for the task.
