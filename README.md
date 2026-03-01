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

Seed database: `uv run python seed.py`

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
