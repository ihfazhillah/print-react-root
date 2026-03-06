# Contract: Update Service

**Feature**: 006-in-app-update | **Date**: 2026-03-06

## External Interface: GitHub Tags Page

**Source**: `https://github.com/ihfazhillah/print-react-root/tags`
**Method**: HTTP GET (plain `fetch()`)
**Response**: HTML page containing tag names in the DOM

**Expected tag format**: `vX.Y.Z` (e.g., `v2.0.0`, `v2.1.3`)
**Extraction**: Parse tag names from HTML, strip `v` prefix, compare numerically

**Failure modes**:
- Network unreachable → silently skip, app works normally
- GitHub rate limited → silently skip
- No tags found → treat as no update available
- Malformed tag names → skip non-matching tags

## External Interface: GitHub Release APK Download

**URL pattern**: `https://github.com/ihfazhillah/print-react-root/releases/download/v{VERSION}/{APK_FILENAME}`
**Method**: HTTP GET (via `expo-file-system` `createDownloadResumable`)
**Response**: Binary APK file

**Failure modes**:
- Network error mid-download → show error, offer retry
- APK asset not found (404) → show error message
- Download cancelled by user → clean up partial file

## Internal Interface: useUpdateCheck Hook

**Returns**:
```typescript
{
  updateInfo: UpdateInfo | null;  // null while checking
  downloadState: DownloadState;
  checkForUpdate: () => Promise<void>;
  startDownload: () => Promise<void>;
  cancelDownload: () => void;
  installUpdate: () => Promise<void>;
}
```

## Internal Interface: UpdateBar Component

**Props**: None (consumes update context/hook internally)
**Renders**: Persistent bottom bar, only visible when `downloadState.status !== 'idle'`
**States**: "Update Available (vX.Y.Z)" → progress bar → "Install" → error with retry
