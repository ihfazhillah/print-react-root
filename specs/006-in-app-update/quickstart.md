# Quickstart: In-App Self-Update

**Feature**: 006-in-app-update | **Date**: 2026-03-06

## Prerequisites

- Expo SDK 54 development environment (already set up)
- Android device or emulator for testing APK install flow

## Setup

```bash
cd kids-app
npx expo install expo-intent-launcher expo-application
```

## Config Plugin for Install Permission

Create a config plugin to add `REQUEST_INSTALL_PACKAGES` to AndroidManifest.xml (required for triggering APK install on Android 8+).

## Key Files to Create

1. `src/hooks/useUpdateCheck.ts` — Hook that fetches GitHub tags page, parses latest version, compares with current
2. `src/components/UpdateBar.tsx` — Persistent bottom button component with state transitions (available → downloading → ready)
3. `plugins/withInstallPermission.js` — Expo config plugin for Android manifest permission

## Testing the Flow

1. Build an APK with version `1.0.0` in `app.json`
2. Create a GitHub release tagged `v2.0.0` with an APK attached
3. Install the `1.0.0` APK on device
4. Open app → bottom button should appear with "Update Available (v2.0.0)"
5. Tap → download progress shown → system installer opens

## GitHub Tags URL

```
https://github.com/ihfazhillah/print-react-root/tags
```

Version extraction: parse tag names matching `vX.Y.Z` pattern from the HTML response.
