# Data Model: In-App Self-Update

**Feature**: 006-in-app-update | **Date**: 2026-03-06

## Entities

### UpdateInfo

Represents the result of a version check against GitHub.

| Field           | Type              | Description                                      |
|-----------------|-------------------|--------------------------------------------------|
| latestVersion   | string            | Latest version tag from GitHub (e.g., "2.1.0")   |
| currentVersion  | string            | Installed app version (e.g., "2.0.0")            |
| isUpdateAvailable | boolean         | Whether latestVersion > currentVersion           |
| downloadUrl     | string \| null    | APK asset download URL (null if no update)       |

### DownloadState

Represents the current state of the update button/download flow.

| Field    | Type   | Values                                                    |
|----------|--------|-----------------------------------------------------------|
| status   | enum   | `idle` \| `available` \| `downloading` \| `error` \| `ready` |
| progress | number | Download progress 0.0–1.0 (only meaningful when `downloading`) |
| error    | string \| null | Error message if status is `error`                 |

**State transitions**:

```
idle → available        (update found)
idle → idle             (no update / offline)
available → downloading (user taps button)
downloading → ready     (download complete)
downloading → error     (network failure)
downloading → available (user cancels)
error → downloading     (user taps retry)
ready → (system installer opens)
```

## No Persistent Storage

This feature requires no database or persistent storage. Version check results and download state are ephemeral — held in React state/context only. The downloaded APK is stored in `FileSystem.cacheDirectory` (auto-cleaned by Android).
