# Feature Specification: Device Tracking System with User Management

**Feature Branch**: `005-device-tracking`
**Created**: 2026-03-01
**Status**: Draft
**Input**: User description: "Integrate tracking system with simple device tracking mechanism. Backend: add auth mechanism and user/device management. Mobile: integrate tracking endpoints and allow user to change their name in device settings. Fix critical bugs in settings persistence and endpoint management. Rebrand app to 'KM Kraft' and create leather-themed icon."

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Child Device Auto-Registers on First Connection and Can Be Renamed (Priority: P1)

When the app is first installed on a child's device, it loads default host/port from `.env` configuration (using the current machine's private IP address for seamless local network discovery). Once the app successfully connects to the backend with these defaults (or after user customizes them), the device automatically registers using a randomly generated device name (e.g., "Device-5F7A", "Child-ABC123"). The parent can later change this name through device settings to something more meaningful (e.g., "Sarah's Tablet", "Tommy's Phone") to identify the device. The device name persists and is visible in the backend system.

**Why this priority**: This is the core use case - devices must register seamlessly on first connection without manual configuration, and the parent must be able to rename devices for identification in a multi-child household.

**Independent Test**: Can be fully tested by installing the app with `.env` defaults, verifying auto-registration on first successful connection, optionally changing device name in settings and verifying persistence.

**Acceptance Scenarios**:

1. **Given** the app is first installed with `.env` defaults, **When** app successfully connects to the backend on first launch, **Then** the device automatically registers with the backend and receives a unique device token
2. **Given** a device has auto-registered with a random name, **When** parent opens device settings, **Then** the current random name is displayed (e.g., "Device-5F7A")
3. **Given** a device is registered, **When** user enters a new name in settings and taps save, **Then** the name is updated locally and synced to the backend
4. **Given** a device name has been updated, **When** the app restarts, **Then** the new name persists and is shown in settings
5. **Given** an empty device name, **When** user tries to save, **Then** an error message appears and save is prevented

---

### User Story 2 - Backend Authenticates Device Requests and Manages Device Organization (Priority: P1)

Backend receives requests from mobile devices, validates that the requester is authorized, and manages device associations with parent/family accounts. Each device is securely identified and can only be accessed by authorized requesters. Parent/admin accounts manage device relationships through separate admin dashboard.

**Why this priority**: Security and data isolation - without proper authentication and device management, the system cannot safely organize devices by family or protect privacy.

**Independent Test**: Can be fully tested by creating a device registration flow, issuing device credentials, validating requests, and ensuring unauthorized devices are rejected.

**Acceptance Scenarios**:

1. **Given** a mobile device is configured, **When** it makes a request to the backend, **Then** the backend identifies and authenticates the device
2. **Given** an unauthorized device token, **When** a request is made to the backend, **Then** the request is rejected with a 401/403 error
3. **Given** devices belonging to different families, **When** requests are made with different device tokens, **Then** devices only access their own family's data (data isolation enforced by token)
4. **Given** a device registration request, **When** the backend processes it, **Then** a unique device credential/token is issued and persisted

---

### User Story 3 - Mobile App Sends Activity Events to Backend (Priority: P2)

Mobile app on child's device sends activity events to the backend when the child performs key actions: viewing a page (list view), opening details (detail view), and printing an image (print action). These events are stored on the backend as historical data for the parent/admin to review via the dashboard.

**Why this priority**: Essential for tracking functionality. Depends on P1 stories for proper auth and device registration. This is the core value of "tracking" — knowing what the child did in the app.

**Independent Test**: Can be fully tested by performing view/detail/print actions in the app and verifying events are recorded on the backend with correct device association.

**Acceptance Scenarios**:

1. **Given** a registered device with valid token, **When** child views the image list, **Then** a "view" event is sent to the backend with the device token
2. **Given** a registered device with valid token, **When** child opens image detail page, **Then** a "detail" event is sent to the backend with the image identifier
3. **Given** a registered device with valid token, **When** child prints an image, **Then** a "print" event is sent to the backend with the image identifier
4. **Given** the backend is unreachable, **When** an event occurs, **Then** the app handles the failure gracefully (fire-and-forget or queue for retry)
5. **Given** updated endpoint configuration, **When** app sends next event, **Then** new endpoint is used (not cached old endpoint)

---

### User Story 4 - App Branding and Visual Identity (Priority: P2)

App is rebranded as "KM Kraft" with a new app icon featuring leather-themed design. The branding is visible throughout the app UI and in the app store/system settings.

**Why this priority**: Important for user recognition and brand consistency but doesn't block core functionality.

**Independent Test**: Can be fully tested by verifying app name and icon display in multiple locations (splash screen, home screen, settings, app list).

**Acceptance Scenarios**:

1. **Given** the app is installed, **When** viewed on device home screen, **Then** the app name displays as "KM Kraft"
2. **Given** the app is running, **When** viewed in system app list and settings, **Then** the app icon shows the leather-themed design
3. **Given** the app is open, **When** user looks at header/title areas, **Then** "KM Kraft" branding is consistent throughout

### Edge Cases

- What happens when device tries to connect to the configured endpoint but it's offline or unreachable?
- How does the system handle a device name change while a tracking request is in flight?
- What happens if parent and child device try to access the system simultaneously from the same network?
- How does the system handle device credentials/tokens that expire or become invalid?
- What happens when network connectivity is lost - should offline mode cache settings or fail fast?
- How does the system handle very long device names or special characters?

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

**Backend - Authentication & Device Management**:

- **FR-001**: Backend MUST provide a device registration endpoint that accepts device info (randomly generated initial name) and returns a unique device token/credential
- **FR-002**: Backend MUST validate device tokens on all subsequent requests from mobile devices
- **FR-003**: Backend MUST maintain a user-to-device mapping that tracks which parent/family owns which child devices
- **FR-004**: Backend MUST return only the child devices associated with the requesting parent user (data isolation)
- **FR-005**: Backend MUST support simple device token-based authentication (sufficient for this use case)
- **FR-006**: Backend MUST store device metadata including device name, registration time, and last activity
- **FR-007**: Backend MUST provide an endpoint to update device name, accessible only with valid device token

**Mobile App - Device Registration & Settings**:

- **FR-008**: Mobile app MUST generate a random device name (e.g., "Device-XXXX") and automatically register with backend on first successful connection (after host/port is configured)
- **FR-009**: Mobile app MUST persist the device token received from backend registration to local storage (used for all subsequent backend requests)
- **FR-009a**: Mobile app MUST check on startup if device is registered; if not, attempt registration on next successful backend connection
- **FR-010**: Mobile app MUST provide settings interface where user can view and edit device name
- **FR-011**: Mobile app MUST persist device name changes to local storage immediately upon save and sync to backend
- **FR-012**: Mobile app MUST reload device name from local storage on app startup and when returning from background
- **FR-013**: Mobile app MUST provide settings interface to configure backend host and port
- **FR-013a**: Mobile app MUST load default host/port from `.env` file configuration (using current machine's private IP address)
- **FR-014**: Mobile app MUST persist host/port configuration to local storage immediately upon save
- **FR-015**: Mobile app MUST validate host/port are accessible before accepting configuration (or provide clear feedback if unavailable)
- **FR-016**: Mobile app MUST use the latest saved host/port configuration for all backend requests (not cached values)

**Mobile App - Tracking Integration**:

- **FR-017**: Mobile app MUST send activity events to backend when child performs key actions: view (list), detail (open image), print (send to printer)
- **FR-018**: Each event MUST include device token, event type (view/detail/print), image identifier (if applicable), and timestamp
- **FR-019**: Mobile app MUST handle event delivery failures gracefully (fire-and-forget or queue; no blocking the UI)
- **FR-020**: Mobile app MUST use the most recently saved host/port configuration for each event request (no stale endpoint caching)
- **FR-021**: Backend MUST store all activity events as historical data with no automatic retention/deletion policy

**Branding**:

- **FR-022**: App display name MUST be "KM Kraft" throughout UI and system (app name, splash screen, headers)
- **FR-023**: App icon MUST feature leather-themed design and be used consistently across all platforms

### Key Entities *(include if feature involves data)*

- **Device**: Represents a child's physical device (phone, tablet, etc.) configured to participate in tracking system. Has unique token for authentication, display name (auto-generated initially, user-editable), host/port configuration (stored locally on device), registration timestamp, last activity timestamp. The backend also tracks which parent/family owns this device. Relationships: has Device Token, generates many Tracking Sessions.

- **Device Token**: Unique credential (string/UUID) issued during device registration on the backend, returned to mobile app and stored in local storage. Used to authenticate all subsequent requests from that device to the backend. Cannot be reused across devices. Relationships: belongs to one Device.

- **Activity Event** (backend): Record of a child's action in the app. Three types: "view" (browsed image list), "detail" (opened image detail page), "print" (sent image to printer). Includes device token, event type, image identifier (if applicable), and timestamp. Stored indefinitely with no retention policy. We do NOT track time spent, location, or session duration. Relationships: belongs to one Device.

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: Device auto-registration works - device registers with backend on first successful connection (after host/port configuration) and receives device token within 5 seconds
- **SC-002**: Device name persists correctly - when changed in settings and app is restarted, the new name is displayed 100% of the time and backend is updated
- **SC-003**: Endpoint configuration persists correctly - when host/port is changed in settings and app restarts, requests use the new endpoint 100% of the time
- **SC-004**: Device authentication works - 100% of authenticated device requests are accepted, 100% of requests with invalid tokens are rejected
- **SC-005**: Data isolation works - backend only returns device data for devices that are family-owned (parent can only see their own children's devices)
- **SC-006**: Activity event delivery works - view/detail/print events are recorded on backend for 95% of actions (allowing 5% loss for transient network issues; fire-and-forget is acceptable)
- **SC-007**: Name sync works - when device name is changed locally, backend updates within 5 seconds
- **SC-008**: App rebranding is complete - "KM Kraft" displays as app name in 100% of UI locations (splash, home screen, headers, settings); leather icon displays consistently

## Clarifications

### Session 2026-03-01

- Q: How should device discovery and pairing work? → A: **No parent mobile app**. Children only connect to server. Parent/admin accesses device info through server-side admin dashboard (out of scope for this mobile feature).
- Q: When should the device auto-register with the backend? → A: **On first successful connection**. Device registers when app successfully connects using configured host/port.
- Q: Should backend host/port have defaults or require manual configuration? → A: **`.env` file updated at build time with current IP:port**. When rebuilding/reloading Expo, `.env` is updated with current machine's IP and port for seamless local network discovery.
- Q: Max child devices per parent and parent account structure? → A: **No parent accounts in mobile app. No device limits**. Parent/admin manages all devices via separate server-side admin dashboard (CRUD operations). Mobile app is children-only.
- Q: What legal/regulatory requirements apply? → A: **None - local network only**. Family-owned device tracking on local network. No cloud storage, no external data sharing, no third-party data handling. No COPPA/GDPR/compliance concerns.
- Q: How should device unregistration/removal work? → A: **Option A - Admin dashboard only (MVP)**. Device unregistration is handled through separate admin dashboard. Mobile app has no unregister function. Device keeps token until admin removes it. Simplest approach for MVP.
- Q: What does "tracking" mean? → A: **Track 3 actions only: view, detail, print**. NOT location, time spent, or session duration. Child may open a page and leave it — only the action matters. Historical data stored indefinitely (no retention policy).

## Assumptions

- **System Scope**: Local network only, family-owned device tracking. No cloud data storage, no external data sharing, no third-party integrations. Compliance and privacy concerns are not applicable (local family network only).
- Device authentication uses simple token-based mechanism (device token-based) rather than complex OAuth - sufficient for local IoT/child tracking use case
- "Tracking" means recording child actions (view, detail, print) — NOT location tracking, time spent, or session duration. A child may open a page and leave it, so only the action itself matters.
- Activity events are fire-and-forget from mobile app — no blocking the UI waiting for backend confirmation
- Device name is display-only identifier for child/parent convenience, not a security/privacy control
- Parent/admin accounts are managed through separate server-side admin dashboard (out of scope for mobile app feature)
- `.env` file is updated at Expo build/reload time with current machine's IP and port for seamless local network setup
- No maximum limit on child devices per parent - system scales to any number of devices per family
- Network connectivity is expected to be intermittent on child devices; offline fallbacks are important
- Data isolation between families is critical for privacy, enforced by device token authentication at backend level
- Mobile storage (AsyncStorage) is suitable for persisting device configuration and device token - no external storage service needed
- Random device name generation uses simple format like "Device-XXXX" or "Child-ABC123" (exact format decided during planning)

## Open Questions/Clarifications for Planning

These items appear clear based on context but are noted for planning phase:

- Random device name format specifics (e.g., "Device-5F7A" vs "Device-001", character set for random part)
- Activity event batching vs. real-time delivery (assumed: fire-and-forget on each action, no batching needed for local network)
