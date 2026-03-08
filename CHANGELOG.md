# Changelog

## v3.1.0 — 2026-03-08

### 008-scrape-coloring-sites
- Scraped 21 coloring/printable sites (~94k pages, ~4k tags)
- Added print handler dispatch: PDF, image, Krokotak URL manipulation, detail-page fallback
- Added tag blocking for content moderation (16 Christian-specific tags blocked, hiding 504 pages)
- Admin API: `PATCH /api/admin/tags/{id}/block`, `POST /api/admin/tags/block`, `GET /api/admin/tags/blocked`
- Merged 16 duplicate tags (hyphenated vs space-separated)
- Backend filters pages with ANY blocked tag from browse/search results

### 007-usage-insights
- Stable device identity via ANDROID_ID
- Admin device merge endpoint
- Usage tracking (view/select/print interactions)

### 006-in-app-update
- Telegram-style in-app self-update from GitHub releases
- APK download + install via intent launcher
