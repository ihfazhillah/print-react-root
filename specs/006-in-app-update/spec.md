# Feature Specification: In-App Self-Update

**Feature Branch**: `006-in-app-update`
**Created**: 2026-03-06
**Status**: Draft
**Input**: User description: "I want to make mobile app have an update button. Always checking new version on the github, if there any display download. User can update from the application. You can think something like telegram app update process when you install it from the source. Not from google play."

## Clarifications

### Session 2026-03-06

- Q: How should the update notification appear visually? → A: Non-blocking persistent bottom button (Telegram-style). When tapped, the button transitions to show download progress inline until download completes.
- Q: Should the app show release notes before updating? → A: No. Show only version number and update button. Internal family use — no need for changelogs.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Check for Updates Automatically (Priority: P1)

When the user opens the app, the app checks the GitHub repository for a newer version. If a new version is available, a persistent bottom button appears showing "Update Available (vX.Y.Z)" with the new version number. The button remains visible across screens until the user acts on it or the app is closed.

**Why this priority**: This is the foundation of the feature. Without version checking, no update flow can exist.

**Independent Test**: Can be fully tested by publishing a new GitHub release with a higher version number and opening the app. The app should display the update bottom button.

**Acceptance Scenarios**:

1. **Given** the app is at version 1.0.0 and a GitHub release exists for version 1.1.0, **When** the user opens the app, **Then** a persistent bottom button showing "Update Available (v1.1.0)" is displayed.
2. **Given** the app is at version 1.1.0 and no newer GitHub release exists, **When** the user opens the app, **Then** no update button is shown.
3. **Given** the device has no internet connection, **When** the app opens and cannot reach GitHub, **Then** the app operates normally without showing an update button or error.

---

### User Story 2 - Download and Install Update (Priority: P1)

When the user taps the bottom update button, the button transitions to show download progress (percentage/progress bar) inline. The user can cancel the download. Upon completion, the system install dialog opens automatically.

**Why this priority**: This is the core value of the feature — enabling self-update without leaving the app.

**Independent Test**: Can be tested by tapping the update button and verifying the APK downloads, progress is shown inline in the bottom button, and the Android install prompt appears.

**Acceptance Scenarios**:

1. **Given** an update is available, **When** the user taps the bottom update button, **Then** the button transitions to show download progress, and upon completion the system install dialog opens.
2. **Given** download is in progress, **When** the user taps "Cancel", **Then** the download stops and the update button returns to its initial "Update Available" state.
3. **Given** the download fails (network error), **When** the download is interrupted, **Then** the user sees an error message with a "Retry" option in the bottom button area.

---

### User Story 3 - Manual Update Check (Priority: P2)

The user can manually check for updates from the app settings by tapping a "Check for Updates" button.

**Why this priority**: Gives users control to check on-demand rather than waiting for the automatic check at app launch.

**Independent Test**: Can be tested by navigating to settings, tapping "Check for Updates", and verifying it reports the correct status (up-to-date or update available).

**Acceptance Scenarios**:

1. **Given** the user is on the settings screen, **When** the user taps "Check for Updates", **Then** the app checks GitHub and shows the result (up-to-date or update available via the bottom button).
2. **Given** no network is available, **When** the user taps "Check for Updates", **Then** a message indicates the check could not be completed.

---

### Edge Cases

- What happens when the GitHub API rate limit is reached? The app should gracefully skip the update check and not show errors.
- What happens if the downloaded APK is corrupted or incomplete? The app should detect the failure when the install is attempted and offer a retry.
- What happens if the user's device does not allow installation from unknown sources? The app should guide the user to enable the setting.
- What happens if multiple GitHub releases exist? The app should compare against the latest release only.
- What happens if the user dismisses the update button? It should reappear on the next app launch.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST check the GitHub repository's latest release for a newer version each time the app is opened.
- **FR-002**: System MUST compare the app's current version against the latest GitHub release version using semantic versioning.
- **FR-003**: System MUST display a persistent bottom button showing the new version number when an update is available. No release notes or changelog are shown.
- **FR-004**: System MUST allow the user to download the APK directly from the GitHub release assets by tapping the bottom button.
- **FR-005**: System MUST display download progress inline within the bottom button during the APK download.
- **FR-006**: System MUST allow the user to cancel an in-progress download, returning the button to its initial state.
- **FR-007**: System MUST trigger the Android package installer to install the downloaded APK after download completes.
- **FR-008**: System MUST provide a "Check for Updates" button accessible from app settings.
- **FR-009**: System MUST handle offline scenarios gracefully — no errors or crashes when GitHub is unreachable.
- **FR-010**: System MUST handle the case where the user has not enabled "Install from unknown sources" by guiding them to the relevant system setting.

### Key Entities

- **App Version**: The current version of the installed app, embedded at build time (e.g., "1.2.0").
- **GitHub Release**: A release published on the project's GitHub repository, containing a version tag and APK asset.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can check for and install an update within 3 taps from anywhere in the app.
- **SC-002**: The update check completes within 5 seconds on a standard connection.
- **SC-003**: 100% of update attempts that complete download successfully trigger the system install dialog.
- **SC-004**: The app remains fully functional when offline or when the update check fails.

## Assumptions

- The project uses GitHub Releases with semantic version tags (e.g., `v1.2.0`) and attaches the APK as a release asset.
- The app is distributed as a side-loaded APK (not via Google Play), so self-update via APK download and install is the expected mechanism.
- The GitHub repository is public, so no authentication is needed to access the releases API.
- Android is the only target platform (consistent with existing project setup).
