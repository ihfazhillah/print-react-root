# KM Kraft

Kids' app for browsing and printing craft images.

**Stack**: FastAPI + React Native/Expo + SQLite

---

## Development

### Backend

```bash
cd fastapi-image-search
uv sync
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8080
```

Seed database: `uv run python seed.py --data <file.json> --source <site-id>`

### Content Pipeline

Scrapers live in a [separate repo](https://github.com/ihfazhillah/print-scraper). Output JSON is seeded into SQLite via `seed.py`.

- **21 sources** across httpx+BS4 and Playwright scrapers
- **~94k printable pages**, **~4k tags**
- Print handler auto-dispatches by URL pattern (PDF, image, Krokotak, detail-page)
- Tag blocking for content moderation (admin API)

### Mobile

```bash
cd kids-app
npm install
npx expo start --clear    # press 'a' for Android emulator
```

Configure server IP in app **Settings**.

### Tests

```bash
# Backend
cd fastapi-image-search && uv run python -m unittest discover -v

# Mobile
cd kids-app && npm test
```

---

## Build & Deploy

Requires `ANDROID_HOME` and `JAVA_HOME` set.

```bash
cd kids-app
./build-release.sh
```

Builds a release APK, tags the version from `app.json`, and creates a GitHub release (if `gh` CLI is available).

Install on device: `adb install android/app/build/outputs/apk/release/app-release.apk`

---

## API Docs

http://localhost:8080/docs
