# KM Kraft — Print React App

Kids' app for browsing and printing craft images. Features device tracking, server endpoint configuration, and activity logging.

**Stack**: FastAPI (backend) + React Native/Expo (mobile), SQLite database, device authentication.

---

## Quick Start

### Prerequisites
- **Python 3.10+** with `uv` (for dependency management)
  - Tested with Python 3.14.3
- **Node.js 18+** + npm (mobile)
  - Tested with Node.js 22.22.0 + npm 10.9.4
- **Android SDK** / Android emulator (for local mobile testing)

### Technology Versions
- **Backend**: FastAPI 0.104.1+, uvicorn 0.24.0+, aiosqlite 0.22.1, deep-translator 1.11.4+
- **Mobile**: React Native 0.81.5, Expo 54.0.33, TypeScript 5.9.3, @tanstack/react-query 5.90.21
- **Database**: SQLite (file-based)

### Project Structure
```
print-react/
├── fastapi-image-search/       # Backend API server
│   ├── main.py                 # FastAPI app
│   ├── db.py                   # Database & queries
│   ├── printer.py              # Printer service
│   └── tests/                  # Unit tests
├── kids-app/                   # React Native/Expo mobile app
│   ├── app/                    # Expo Router screens
│   ├── src/                    # Hooks, components, types
│   ├── __tests__/              # E2E & unit tests
│   └── package.json
└── specs/                      # Feature specs & planning docs
```

---

## Backend Server

### Setup
```bash
cd fastapi-image-search

# Install uv (if not already installed)
pip install uv

# Install dependencies (uv handles venv automatically)
uv sync
```

### Run Server
```bash
# Development (with auto-reload)
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8080

# Production
uv run uvicorn main:app --host 0.0.0.0 --port 8080
```

Server runs on `http://localhost:8080`

### Database
- File-based SQLite: `fastapi-image-search/printable_pages.db`
- Schema auto-initializes on server startup
- Seed with data: `uv run python seed.py`

### Test
```bash
uv run python -m unittest discover -v
```

---

## Mobile App (Expo)

### Setup
```bash
cd kids-app
npm install
```

### Run Locally
```bash
# Start Expo dev server (clears Metro cache)
npx expo start --clear

# Then:
# - Press 'a' to open in Android emulator
# - Press 'i' to open in iOS simulator (macOS only)
# - Scan QR code with Expo Go app (on physical device)
```

### Configure Server Endpoint
In app: **Settings** → Enter server IP and port (e.g., `192.168.1.100:8080`)

### Test
```bash
# Run all tests (unit + E2E)
npm test

# Run specific test file
npm test -- __tests__/e2e/us1-browse-search.test.tsx

# Watch mode
npm test -- --watch
```

---

## Build & Deploy

### Android Build
```bash
cd kids-app

# Create local APK (for testing)
npx eas build --platform android --local

# Or use EAS cloud build
npx eas build --platform android
```

Install APK on device:
```bash
adb install app.apk
```

### Web Preview (Expo)
```bash
npx expo export --platform web
npx serve dist
```

Browse to `http://localhost:3000`

---

## Testing

### Mobile Tests (E2E + Unit)
```bash
cd kids-app
npm test -- --passWithNoTests
```

**Test coverage**:
- 18 test suites, 91 tests
- E2E: Browse, Detail, Settings, Device tracking, Activity events, Branding
- Unit: Hooks, Components, API client

### Backend Tests
```bash
cd fastapi-image-search
uv run python -m unittest discover -v
```

**Test coverage**:
- 62 tests
- Device registration & auth
- CRUD operations (pages, tags)
- Printer service integration

### Lint & Format
```bash
cd kids-app

# Check linting (ESLint + Prettier)
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

---

## Development Workflow

### Adding a Feature
1. Create feature spec: `specs/XXX-feature-name/spec.md`
2. Generate plan: `npm run speckit:plan` (if using speckit)
3. Create tests first (TDD)
4. Implement feature
5. Run tests: `npm test && npm run lint`
6. Commit with clear message

### Database Changes
1. Modify `fastapi-image-search/db.py` schema
2. Server will auto-migrate on startup
3. Update `kids-app/src/types/` if needed
4. Write & run tests

### API Endpoint Changes
1. Update `fastapi-image-search/main.py`
2. Add Pydantic models for request/response
3. Update mobile client: `kids-app/src/api/`
4. Update hooks: `kids-app/src/hooks/`
5. Write E2E tests

---

## Environment Variables

### Backend
```bash
# .env (optional)
DB_PATH=./printable_pages.db
PRINTER_SERVICE=http://printer-service:8000
```

### Mobile (Expo)
```bash
# .env.local (in kids-app/)
EXPO_PUBLIC_API_IP=192.168.1.100
EXPO_PUBLIC_API_PORT=8080
```

---

## Troubleshooting

### Server won't start
```bash
# Check port is free
lsof -i :8080

# Clear database and restart
rm fastapi-image-search/printable_pages.db
uv run uvicorn main:app --reload
```

### App crashes on connect
- Check server IP/port in Settings
- Ensure device can reach server (same WiFi)
- Check server logs for errors

### Tests fail
```bash
# Clear cache and retry
cd kids-app
rm -rf node_modules .jest-cache
npm install
npm test
```

---

## Links

- **API Docs**: http://localhost:8080/docs (FastAPI Swagger UI)
- **Feature Specs**: `/specs/005-device-tracking/spec.md`
- **Tasks**: `/specs/005-device-tracking/tasks.md`

---

## Recent Changes

- **Phase 1**: DB schema, TS types, storage module
- **Phase 2**: Fixed settings persistence + list caching bugs
- **Phase 3**: KM Kraft branding + leather icon
- **Phase 4**: Device registration, auth, endpoints (62 backend tests)
- **Phase 5**: Auto-registration + device name in settings
- **Phase 6+7**: Activity event tracking (view/detail/print)
- **Phase 8**: Coverage guard, all tasks complete

**Total**: 153 tests passing (91 mobile + 62 backend)

---

## Contact & Issues

Report bugs or feature requests in GitHub Issues.
