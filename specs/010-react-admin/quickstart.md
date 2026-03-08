# Quickstart: React Admin Dashboard

## Development

```bash
cd admin-ui
npm install
npm run dev          # Vite dev server with proxy to FastAPI
```

Dev server proxies `/api/*` to `http://localhost:8080` (FastAPI backend).

## Build & Deploy

```bash
cd admin-ui
npm run build        # Output to ../fastapi-image-search/static/admin/
```

Restart FastAPI — new dashboard available at `http://localhost:8080/admin`.

## Validation Scenarios

### US1: Browse and Search
1. Open `/admin` → paginated table of pages loads
2. Type "dinosaur" in search → results filter
3. Click a tag → only pages with that tag shown
4. Click "Next" → next page loads

### US2: Page CRUD
1. Click "Add Page" → fill form → submit → page appears in list
2. Click "Edit" on a page → change tags → save → tags updated
3. Click "Delete" → confirm → page removed

### US3: Tag Management
1. Navigate to `/admin/tags` → paginated tag list
2. Add tag "test-tag" → appears in list
3. Click "Translate All" → untranslated tags get Indonesian translations
4. Toggle blocked → tag marked blocked

### US4: Device Management
1. Navigate to `/admin/devices` → device list
2. Rename a device → name updates
3. Toggle admin → flag changes
4. Merge two devices → events transferred

### US5: Insights
1. Navigate to `/admin/insights` → summary cards visible
2. Click a child → timeline loads with events
3. Scroll to "Most Printed" → top 10 images shown
4. View "Shared Interests" → common tags highlighted

## Comparison Testing

During migration, compare old (`/`) and new (`/admin`) side by side:
- Same page count and data in tables
- Same CRUD operations produce same results
- Same insights data displayed
