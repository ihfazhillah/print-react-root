# Quickstart: Personalized Feed

## Scenario 1: Backend — Personalized List

```bash
# Unpersonalized (backward compatible)
curl "http://localhost:8080/api/items?skip=0&limit=5"

# Personalized for a specific device
curl "http://localhost:8080/api/items?skip=0&limit=5&device_id=4abe3194-a50f-4c67-9207-1bced36cb375"

# Compare: two devices should return different orderings
curl "http://localhost:8080/api/items?limit=5&device_id=DEVICE_A" | jq '.[].index'
curl "http://localhost:8080/api/items?limit=5&device_id=DEVICE_B" | jq '.[].index'
```

## Scenario 2: Backend — Enhanced Recommendations

```bash
# Get recommendations (requires auth)
TOKEN="ac7b9a77..."
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/devices/4abe3194-.../recommendations?limit=10"

# Should return items matching device's tag interests
# Falls back to popular items if no history
```

## Scenario 3: Mobile — Verify Device ID Sent

1. Open the app on a registered device
2. Check network requests — `/api/items` should include `device_id` param
3. Browse several items, print one
4. Close and reopen app
5. Browsing list should show different ordering (printed item deprioritized)

## Scenario 4: Mobile — "Kamu Mungkin Suka" Section

1. Open the app on a device with print history
2. Home screen should show "Kamu Mungkin Suka" horizontal section above main list
3. Items in the section should relate to previously printed content
4. Tapping an item navigates to detail view
5. On a new device with no history: section shows popular items or is hidden

## Validation Checklist

- [ ] `/api/items` without device_id returns same format as before
- [ ] `/api/items` with device_id returns personalized order
- [ ] Two devices get different top-20 results
- [ ] Recommendations work with view-only history (no prints needed)
- [ ] Recommendations fall back to popular when no history
- [ ] Blocked tags excluded from both lists
- [ ] Mobile app sends device_id in list requests
- [ ] "Kamu Mungkin Suka" section visible on home screen
