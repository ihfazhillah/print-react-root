# Research: Multi-Site Printable Activities Scraper

## R1: Playwright vs Selenium for JS-rendered sites

**Decision**: Playwright (via `playwright` Python package)
**Rationale**: Playwright has built-in async support (matches existing FastAPI async patterns), auto-waits for elements, and headful mode for captcha solving. User explicitly requested Playwright.
**Alternatives considered**:
- Selenium: heavier, no native async, more brittle waits
- Puppeteer: Node.js only, would split tech stack

## R2: PDF to PNG conversion for printing

**Decision**: Use existing ImageMagick `convert` (already used for webp→PNG)
**Rationale**: `convert input.pdf[0] output.png` extracts first page as PNG. ImageMagick is already a dependency. No new tools needed.
**Alternatives considered**:
- pdf2image (poppler): extra dependency for same result
- PyMuPDF/fitz: extra pip dependency
- Ghostscript directly: ImageMagick wraps it anyway

## R3: Captcha pause/resume mechanism

**Decision**: `input()` blocking with progress file + desktop notification + sound alert
**Rationale**: Scraper runs in a terminal. When captcha detected:
1. Save progress to checkpoint file
2. Send desktop notification via `notify-send` (Linux) so admin sees it even if doing something else
3. Play alert sound via `paplay` or `aplay` (system bell fallback)
4. Print message to terminal
5. `input()` blocks until admin presses Enter after solving captcha in the Playwright browser

Notification is best-effort — if `notify-send` is not available, scraper still works (just no desktop popup).
**Alternatives considered**:
- Automated captcha solving: unreliable, potentially against ToS
- Email/Telegram notification: over-engineered, requires extra setup

## R4: Rate limiting approach

**Decision**: Simple `asyncio.sleep()` between requests, configurable per site
**Rationale**: 0.5s delay = 2 req/sec. No external dependency needed. Each site parser inherits from base class that enforces the delay.
**Alternatives considered**:
- Token bucket / leaky bucket: over-engineered for sequential scraping
- aiohttp-ratelimiter: unnecessary dependency

## R5: How to detect httpx+BS4 vs Playwright at runtime

**Decision**: Static classification per site module. Each site parser declares `REQUIRES_PLAYWRIGHT = True/False`. The CLI checks this and launches Playwright only when needed.
**Rationale**: We already know from research which sites need JS rendering. No need for runtime detection.
**Alternatives considered**:
- Try httpx first, fall back to Playwright: doubles request count, slower
- Always use Playwright: heavy, unnecessary for 21/29 sites

## R6: Print strategy — how to decide which handler to use

**Decision**: URL-based detection with source fallback
**Rationale**: The scraper stores the most direct URL possible (PDF or image). At print time:
1. Check file extension in URL (`.pdf` → PDF handler, `.jpg/.png/.webp` → image handler)
2. Check source (`krokotak` → existing krokotak handler)
3. Fallback → detail page handler (fetch HTML, extract image)

This means **no database schema change** is needed for print strategy — the URL itself encodes the strategy.
**Alternatives considered**:
- Add `print_strategy` column to database: unnecessary schema change, the URL already tells us
- Store both thumbnail and print URL separately: current schema already has `url` (print target) and `thumbnail` (display) — perfect fit

## R7: Playwright dependency management

**Decision**: Add `playwright` to `pyproject.toml` as optional dependency. Install browser with `playwright install chromium`.
**Rationale**: Playwright is only needed for scraping (~8 sites). Keep it optional so the backend can run without it.
**Alternatives considered**:
- Make it mandatory: wastes space on prod server that only runs the API
- Use a separate requirements file: fragmented dependency management

## R8: Sites needing verification (httpx vs Playwright)

Five sites marked ⚠️ in the plan need verification during implementation:
- Suncatcher Studio, Fun Sensory Play, Kiddo Worksheets, Tree Valley Academy, Adventure in a Box

**Decision**: Try httpx+BS4 first during implementation. If content is empty/JS-only, switch to Playwright. This is a one-time decision per site, recorded in the site module.
