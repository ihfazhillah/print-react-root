# Mobile App API Contract

**Feature**: Device Tracking System
**Date**: 2026-03-01
**Framework**: React Native 0.81 with Expo SDK 54
**Language**: TypeScript 5.x

## Overview

TypeScript types and function interfaces for mobile app device tracking feature. Defines contracts between components, hooks, storage, and backend.

---

## Type Definitions

### DeviceSettings
```typescript
interface DeviceSettings {
  deviceToken: string;        // Received from backend during registration
  deviceName: string;         // Display name (user-editable)
  isRegistered: boolean;      // Registration status
  backendHost: string;        // e.g., "192.168.1.10"
  backendPort: number;        // e.g., 8000
  lastSyncTimestamp?: number; // ISO timestamp of last backend sync
}
```

### DeviceRegistrationRequest
```typescript
interface DeviceRegistrationRequest {
  initial_name: string; // Generated name like "Device-5F7A"
}
```

### DeviceRegistrationResponse
```typescript
interface DeviceRegistrationResponse {
  device_id: string;
  device_token: string;
  device_name: string;
  registered_at: string;
}
```

### DeviceNameUpdateRequest
```typescript
interface DeviceNameUpdateRequest {
  name: string;
}
```

### DeviceNameUpdateResponse
```typescript
interface DeviceNameUpdateResponse {
  device_id: string;
  device_name: string;
  updated_at: string;
}
```

### ActivityEventRequest
```typescript
interface ActivityEventRequest {
  event_type: "view" | "detail" | "print";
  image_id?: string;       // Required for detail/print, optional for view
  timestamp: string;        // ISO 8601 (when action occurred on device)
}
```

### ActivityEventResponse
```typescript
interface ActivityEventResponse {
  event_id: string;
  status: "recorded";
}
```

---

## Hooks

### useDeviceRegistration

**Purpose**: Auto-register device on first connection.

```typescript
interface UseDeviceRegistrationOptions {
  backendHost: string;
  backendPort: number;
}

interface UseDeviceRegistrationResult {
  isRegistering: boolean;
  error?: Error;
  deviceToken?: string;
  register: () => Promise<void>;
}

function useDeviceRegistration(
  options: UseDeviceRegistrationOptions
): UseDeviceRegistrationResult
```

**Behavior**:
- On mount: Check if device is already registered (via deviceStorage.getToken)
- If registered: Do nothing
- If not registered: Attempt registration with auto-generated name
- On registration success: Store token in AsyncStorage
- On error: Show error message, provide retry button

---

### useDeviceSettings

**Purpose**: Persist and reload device settings (name, host, port).

```typescript
interface UseDeviceSettingsResult {
  settings: DeviceSettings;
  updateDeviceName: (newName: string) => Promise<void>;
  updateBackendHost: (host: string) => Promise<void>;
  updateBackendPort: (port: number) => Promise<void>;
  isLoading: boolean;
  error?: Error;
}

function useDeviceSettings(): UseDeviceSettingsResult
```

**Behavior**:
- On mount: Load all settings from AsyncStorage
- updateDeviceName:
  - Validate locally (non-empty, max 50 chars)
  - Save to AsyncStorage immediately
  - Send PATCH request to backend (async, don't wait)
  - Show "syncing..." state during request
  - Show success/error toast after response
- updateBackendHost/Port:
  - Validate locally (non-empty, valid IP/port format)
  - Save to AsyncStorage immediately
  - Validate connectivity (optional)
  - Show error if endpoint unreachable

---

### useActivityTracking

**Purpose**: Send activity events to backend when child performs view/detail/print actions. Fire-and-forget — never blocks UI.

```typescript
interface UseActivityTrackingResult {
  trackView: () => void;                              // Child browsed image list
  trackDetail: (imageId: string) => void;             // Child opened image detail
  trackPrint: (imageId: string) => void;              // Child printed image
}

function useActivityTracking(): UseActivityTrackingResult
```

**Behavior**:
- Each track function sends POST to `/api/devices/{id}/events` with device token
- Fire-and-forget: No UI feedback on success/failure (silent)
- If backend is unreachable, event is silently dropped (acceptable per spec)
- Includes timestamp of when action occurred on device
- Does NOT track time spent or session duration

---

## Storage Interface

### deviceStorage

```typescript
namespace deviceStorage {
  // Getters
  async function getToken(): Promise<string | null>;
  async function getDeviceName(): Promise<string | null>;
  async function getBackendConfig(): Promise<{host: string; port: number}>;
  async function isRegistered(): Promise<boolean>;

  // Setters
  async function setToken(token: string): Promise<void>;
  async function setDeviceName(name: string): Promise<void>;
  async function setBackendConfig(host: string, port: number): Promise<void>;
  async function setRegistered(registered: boolean): Promise<void>;

  // Utils
  async function clear(): Promise<void>; // Clears all device data
}
```

**Storage Keys**:
- `device:token`
- `device:name`
- `device:host`
- `device:port`
- `device:registered`
- `device:last_sync`

**Guarantees**:
- All operations are synchronous to AsyncStorage (no race conditions)
- No network calls from storage layer
- Suitable for 1MB+ of data (device settings are <1KB)

---

## API Client

### DeviceAPI

```typescript
class DeviceAPI {
  constructor(baseURL: string, deviceToken?: string);

  // Registration (no token required)
  async register(initialName: string): Promise<DeviceRegistrationResponse>;

  // Name update (token required)
  async updateName(deviceId: string, newName: string): Promise<DeviceNameUpdateResponse>;

  // Activity event (token required, fire-and-forget)
  async trackEvent(deviceId: string, event: ActivityEventRequest): Promise<ActivityEventResponse>;
}
```

**Implementation Details**:
- Base URL: `http://{host}:{port}` (from .env or user config)
- All requests include device_token in Authorization header
- Timeout: 10 seconds per request
- Retry logic: Exponential backoff (1s, 2s, 4s) for transient errors
- Error handling: Throw descriptive error messages (not HTTP status codes)

---

## Components

### SettingsScreen

**Purpose**: Display and edit device configuration.

```typescript
interface SettingsScreenProps {
  // None - uses hooks internally
}

interface SettingsScreenState {
  deviceName: string;
  backendHost: string;
  backendPort: number;
  isEditing: boolean;
  isSaving: boolean;
  error?: string;
}
```

**Behavior**:
- On mount: Load current settings via useDeviceSettings
- Show device name input (editable)
- Show host/port inputs (editable)
- Show "Save" button
- On save:
  - Validate all fields
  - Call updateDeviceName, updateBackendHost, updateBackendPort
  - Show "Saving..." state
  - Show success toast or error message
  - Auto-dismiss toast after 3 seconds

**UI**:
- Simple form layout (vertical stack)
- Large touch targets (48px minimum)
- Clear labels
- Error message below each field if validation fails

---

## Error Handling

### Network Errors

```typescript
// When backend is unreachable:
{
  code: "ENDPOINT_UNREACHABLE",
  message: "Cannot connect to device tracking backend. Check host and port.",
  retryable: true
}

// When token is invalid:
{
  code: "INVALID_TOKEN",
  message: "Device not authorized. Please restart the app.",
  retryable: false
}
```

### Validation Errors

```typescript
// When device name is empty:
{
  code: "INVALID_DEVICE_NAME",
  message: "Device name cannot be empty",
  retryable: false
}

// When port is invalid:
{
  code: "INVALID_PORT",
  message: "Port must be a number between 1 and 65535",
  retryable: false
}
```

---

## State Management

**Global State** (Context or React Query):
- Current device token (read-only once registered)
- Current device name (editable)
- Backend host/port (editable)
- Registration status (read-only)

**Local Component State**:
- Form input values (name, host, port)
- Loading/error states
- UI mode (viewing vs. editing)

**Persistence**:
- All state persisted to AsyncStorage immediately
- Reloaded on app startup
- Cleared only on unregister (Phase 2+)

---

## Testing Requirements

**Unit Tests**:
- deviceStorage: getToken, setToken, clear
- DeviceAPI: register, updateName error handling
- useDeviceSettings hook: Loading, saving, validation
- SettingsScreen: Form inputs, save button behavior

**E2E Tests**:
- AS-1: App auto-registers on first launch
- AS-2: Device name is displayed in settings
- AS-3: Device name can be changed and persists after restart
- AS-4: Host/port can be configured and used for requests
- AS-5: Error message shows when endpoint unreachable

---

## Performance Considerations

- No FlatList (device list is simple form, not scrollable list)
- No unnecessary re-renders (memoize if reused)
- Storage operations are <10ms (AsyncStorage is fast)
- Network requests timeout at 10s to avoid frozen UI

