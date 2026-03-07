# Quickstart: Usage Insights & Personalized Feed

## Integration Scenarios

### Scenario 1: Admin views usage insights

1. Navigate to `http://<server>:8080/insights`
2. Page shows summary cards for each non-admin device (Mimi, LuLu, Isa)
3. Each card shows total views, details, prints
4. Top tags section shows each kid's top 5 tags by print count
5. Most printed images shows thumbnails with print counts
6. Shared interests highlights tags common to 2+ kids
7. "Babah" device (is_admin=true) does NOT appear

### Scenario 2: Admin toggles is_admin flag

1. Navigate to admin devices page
2. Toggle is_admin on "Babah" device
3. Refresh insights page — Babah data excluded
4. Toggle is_admin off — Babah reappears in analytics

### Scenario 3: Kid sees personalized feed

1. Open mobile app as Mimi's device
2. Home screen loads with "Kamu mungkin suka" horizontal row at top
3. Row contains images from Mimi's top tags (craft-coloring, valentine, etc.)
4. Below the row, normal image grid appears as usual
5. Scroll horizontally to browse recommendations
6. Tap an image to go to detail/collection view

### Scenario 4: New device sees no recommendations

1. Open mobile app as newly registered device (0 prints)
2. Home screen shows only the normal image grid
3. No "Kamu mungkin suka" row appears

### Scenario 5: Admin views kid timeline (P2)

1. From insights page, click on a kid's name
2. Timeline shows events grouped by date (newest first)
3. Each event shows type icon (eye/detail/print), image thumbnail, timestamp

## Smoke Test Checklist

- [ ] `GET /api/admin/insights/summary` returns non-admin devices only
- [ ] `GET /api/admin/insights/top-tags` returns ranked tags per device
- [ ] `GET /api/admin/insights/top-images` returns most printed images
- [ ] `GET /api/admin/insights/interests` shows shared/unique tags
- [ ] `PATCH /api/admin/devices/{id}/admin` toggles is_admin flag
- [ ] `GET /api/devices/{id}/recommendations` returns images from top tags
- [ ] `GET /api/devices/{id}/recommendations` returns [] for device with <2 prints
- [ ] `/insights` HTML page renders without errors
- [ ] Mobile app shows "Kamu mungkin suka" row for device with print history
- [ ] Mobile app hides row for device with no/insufficient history
