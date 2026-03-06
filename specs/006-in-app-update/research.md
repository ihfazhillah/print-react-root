# Research: In-App Self-Update

**Feature**: 006-in-app-update | **Date**: 2026-03-06

## R-001: Version Check via GitHub Tags Page

**Decision**: Fetch the GitHub tags page (`https://github.com/ihfazhillah/print-react-root/tags`) directly, extract version tags from the HTML, and compare against the current app version using simple string splitting.

**Rationale**: User preference — no extra libraries needed. The tags page is public HTML, parseable with regex or string matching. Version comparison for strict `X.Y.Z` format is trivial with `split('.')` and numeric comparison. The `semver` package is unnecessary for this project's versioning scheme.

**Alternatives considered**:
- GitHub Releases API (`api.github.com/repos/.../releases/latest`) — returns JSON, cleaner parsing, but adds API dependency and rate limiting (60 req/hr unauthenticated). HTML scraping of the tags page avoids API rate limits.
- `semver` npm package — rejected per user preference to avoid extra dependencies.

## R-002: APK Download with Progress

**Decision**: Use `expo-file-system` with `createDownloadResumable()` API.

**Rationale**: Built-in to Expo managed workflow, supports progress callbacks (`totalBytesWritten`/`totalBytesExpectedToWrite`), writes directly to app cache directory (no storage permissions needed). Fully compatible with SDK 54.

**Alternatives considered**:
- `react-native-blob-util` — requires config plugin or ejection, heavier. Rejected for unnecessary complexity.

## R-003: Triggering APK Installation

**Decision**: Use `expo-intent-launcher` with `startActivityAsync` to launch the Android package installer. Use `expo-file-system`'s `getContentUriAsync()` to convert `file://` to `content://` URI (required by Android 7+).

**Rationale**: Works in managed Expo workflow. `getContentUriAsync` eliminates the need for a custom FileProvider config plugin. The intent action `android.intent.action.INSTALL_PACKAGE` with data type `application/vnd.android.package-archive` and `FLAG_GRANT_READ_URI_PERMISSION` triggers the system installer.

**Alternatives considered**:
- Custom native module — overkill for a simple intent launch.
- Manual FileProvider config plugin — unnecessary since `getContentUriAsync` handles the URI conversion.

## R-004: Getting Current App Version

**Decision**: Use `expo-application` with `Application.nativeApplicationVersion`.

**Rationale**: Reads the actual installed native `versionName` (e.g., "2.0.0"), which matches `app.json` `expo.version`. More reliable than `Constants.expoConfig?.version` for update comparison since it reflects the installed build, not the JS bundle config.

**Alternatives considered**:
- `expo-constants` — reads config rather than installed native value. Less reliable for update checks.

## R-005: APK Download URL Construction

**Decision**: Derive the APK download URL from the latest tag. Convention: `https://github.com/ihfazhillah/print-react-root/releases/download/vX.Y.Z/app-release.apk` (or similar asset name matching the release).

**Rationale**: GitHub releases have a predictable URL pattern for attached assets. The tag name extracted from the tags page maps directly to the download URL.

## R-006: Required Android Permissions

**Decision**: Add `REQUEST_INSTALL_PACKAGES` permission via Expo config plugin.

**Rationale**: Required since Android 8 (API 26) for any app that triggers APK installation. Must be declared in `AndroidManifest.xml`. Can be added via `expo-build-properties` plugin or a small custom config plugin. No storage permissions needed since downloads go to `FileSystem.cacheDirectory`.

## R-007: "Install from Unknown Sources" Handling

**Decision**: Attempt install directly; if not permitted, use `expo-intent-launcher` to open `android.settings.MANAGE_UNKNOWN_APP_SOURCES` with `data: "package:com.kmkraft.printreact"`.

**Rationale**: Since Android 8, the permission is per-app. Attempting the install will either succeed or show a system prompt. Proactively redirecting to the app-specific settings page provides a good UX. No custom native module needed.

## Package Summary

| Purpose                        | Package                              | New? |
|--------------------------------|--------------------------------------|------|
| Download APK with progress     | `expo-file-system`                   | No (already in Expo) |
| Convert file:// to content://  | `expo-file-system` (`getContentUriAsync`) | No |
| Launch install intent          | `expo-intent-launcher`               | Yes  |
| Get installed version          | `expo-application`                   | Yes  |
| Semver compare                 | Hand-rolled (split & compare)        | No   |
| Version check                  | `fetch()` + HTML parsing             | No   |
| Add install permission         | Config plugin                        | Yes (custom, ~20 lines) |
