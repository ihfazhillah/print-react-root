# Phase 1: Data Model

**Feature**: Device Tracking System with User Management
**Date**: 2026-03-01

## Entities & Relationships

### 1. Device

**Purpose**: Represents a child's physical device (phone, tablet) configured to participate in tracking system.

**Fields**:
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | UUID/String | Primary Key, unique | Device identifier in backend |
| `user_id` | UUID/String | Foreign Key → User | Which parent/family owns this device |
| `device_token` | String | Unique, not null | Authentication token for device requests |
| `device_name` | String | Max 50 chars, not null | Display name (auto-generated initially, user-editable) |
| `registration_timestamp` | DateTime | not null | When device first registered |
| `last_activity_timestamp` | DateTime | nullable | Last successful API request |
| `is_active` | Boolean | default=true | Soft delete; admin can deactivate from dashboard |

**Validations**:
- `device_name`: Non-empty, max 50 characters, no leading/trailing whitespace
- `device_token`: Must be valid UUID or alphanumeric string, min 16 chars

**Lifecycle**:
```
Install → (Register: POST /devices) → Active → (Rename: PATCH /devices/{id}/name)*
→ (Deactivate: via admin dashboard only) → Inactive
```

---

### 2. DeviceToken

**Purpose**: Secure credential issued during device registration for authentication.

**Fields**:
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | UUID/String | Primary Key | Token record ID |
| `device_id` | UUID/String | Foreign Key → Device | Which device owns this token |
| `token_string` | String | Unique, not null, indexed | The actual token value (128-bit random) |
| `issued_at` | DateTime | not null | When token was created |
| `expires_at` | DateTime | nullable | Expiration date (if implemented in Phase 2) |
| `is_valid` | Boolean | default=true | Token can be revoked (admin dashboard) |

**Validations**:
- `token_string`: 128-bit random alphanumeric, min 32 chars

**Lifecycle**:
```
Register → Issue Token → Valid → (Revoke: admin dashboard) → Revoked
```

---

### 3. User (Backend Only)

**Purpose**: Parent/admin account managing devices (NOT in mobile app scope).

**Fields**:
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | UUID/String | Primary Key | User identifier |
| `username` | String | Unique, not null | For admin authentication |
| `family_id` | String | Foreign Key | Identifies family group for data isolation |
| `created_at` | DateTime | not null | Account creation timestamp |

**Note**: User authentication and management is handled by existing backend infrastructure (separate from this feature). This entity is documented for context only.

---

### 4. ActivityEvent (Backend)

**Purpose**: Records child activity events from the mobile app. Tracks three action types: view (browsing image list), detail (opening image detail page), and print (sending image to printer). Historical data stored indefinitely with no retention policy.

**Fields**:
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | UUID/String | Primary Key | Event record ID |
| `device_id` | UUID/String | Foreign Key → Device, indexed | Which device generated event |
| `event_type` | String | not null, one of: "view", "detail", "print" | What action the child performed |
| `image_id` | String | nullable | Image identifier (for detail/print events; null for list view) |
| `timestamp` | DateTime | not null, indexed | When event occurred on device |
| `created_at` | DateTime | not null, default CURRENT_TIMESTAMP | When backend received event |

**Validations**:
- `event_type`: Must be one of "view", "detail", "print"
- `image_id`: Required for "detail" and "print" events; optional for "view"
- No time-based retention — events stored indefinitely

**Note**: We do NOT track time spent, location, or session duration. A child may open a page and leave it — only the action itself matters, not duration.

---

## Data Isolation & Security

**Family-Based Isolation**:
- Each Device belongs to exactly one User (parent)
- Each User belongs to one family_id
- Backend enforces that requests with device_token X can only access Device records owned by the same User

**Token-Based Authentication**:
- Device requests include device_token in header or payload
- Backend validates token against Device.device_token
- Invalid/revoked tokens → 401/403 error

**Example**:
```
Device A (owned by User 1)       can only access itself
Device B (owned by User 2)       cannot see Device A's data
                                 (different family_ids)
```

---

## Mobile Storage Schema (AsyncStorage)

**Purpose**: Local persistence on child device (never synced to backend).

**Keys**:
```
{
  "device:token": "<token-string>",              # From registration response
  "device:name": "<current-name>",               # User-editable
  "device:registered": "true|false",             # Registration state
  "device:host": "192.168.1.x",                  # Backend host (from .env or user config)
  "device:port": "8000",                         # Backend port (from .env or user config)
  "device:last_sync": "<iso-timestamp>"          # For cache invalidation
}
```

**Persistence Rules**:
- Device token: Persisted immediately on registration, cleared only if unregister is implemented
- Device name: Persisted immediately on user save, synced to backend asynchronously
- Host/Port: Persisted immediately on user save, used for all subsequent requests
- No data shared with parent/admin (local device only)

---

## Database Schema Changes (Backend)

**New Tables**:

```sql
-- Users (extend existing if not present)
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    family_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Devices (new)
CREATE TABLE devices (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    device_token TEXT UNIQUE NOT NULL,
    device_name TEXT NOT NULL CHECK (LENGTH(device_name) > 0 AND LENGTH(device_name) <= 50),
    registration_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_activity_timestamp DATETIME,
    is_active BOOLEAN DEFAULT 1,
    UNIQUE(user_id, id)
);

-- Device Tokens (new, could be denormalized into devices for MVP)
CREATE TABLE device_tokens (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL UNIQUE REFERENCES devices(id),
    token_string TEXT UNIQUE NOT NULL,
    issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    is_valid BOOLEAN DEFAULT 1
);

-- Activity Events (tracks view, detail, print actions)
CREATE TABLE activity_events (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL REFERENCES devices(id),
    event_type TEXT NOT NULL CHECK (event_type IN ('view', 'detail', 'print')),
    image_id TEXT,
    timestamp DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Indices**:
```sql
CREATE INDEX idx_devices_user_id ON devices(user_id);
CREATE INDEX idx_devices_token ON devices(device_token);
CREATE INDEX idx_device_tokens_token ON device_tokens(token_string);
CREATE INDEX idx_activity_events_device ON activity_events(device_id);
CREATE INDEX idx_activity_events_timestamp ON activity_events(timestamp);
CREATE INDEX idx_activity_events_type ON activity_events(event_type);
```

---

## Validation Rules (Backend)

**Device Registration (POST /devices)**:
- Required: `initial_name` (auto-generated, e.g., "Device-5F7A")
- Output: `device_token` (unique, 32+ chars), `device_id`, `device_name`
- Error: Device limit exceeded (future), user not found, database error

**Device Name Update (PATCH /devices/{id}/name)**:
- Required: `device_token` (authentication), `new_name`
- Validation: `new_name` non-empty, max 50 chars, no leading/trailing whitespace
- Output: Updated device record with new name
- Error: Invalid token, device not found, validation failed

---

## State Transitions (Finite State Machine)

**Device Lifecycle**:
```
┌─────────┐
│ CREATED │  (First app launch, .env configured)
└────┬────┘
     │ POST /devices (register)
     ▼
┌───────────┐     PATCH /devices/{id}/name
│ ACTIVE    │◄────────────────────┐
└────┬──────┘                      │
     │ (Periodic polling starts)   │ (User renames)
     │                             │
     ├─────────────────────────────┘
     │
     │ (Admin: deactivate via dashboard)
     ▼
┌───────────┐
│ INACTIVE  │ (Device token revoked, cannot make requests)
└───────────┘
```

---

## Assumptions & Constraints

1. **No Concurrent Edits**: Same device name change from two sources (mobile + admin dashboard) is not handled. Last-write-wins accepted for MVP.
2. **Token Persistence**: Tokens persist until explicitly revoked via admin dashboard (no expiration in MVP).
3. **Family Isolation**: Data isolation enforced at backend level via `user_id` FK and token validation.
4. **No Historical Data**: MVP focuses on current state only. Tracking history is Phase 2+.

