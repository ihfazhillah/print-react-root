# Backend API Contract

**Feature**: Device Tracking System
**Date**: 2026-03-01
**Framework**: FastAPI (Python 3.10+)
**Protocol**: REST over HTTP/HTTPS (local network)

## Overview

Simple REST API for device registration, authentication, and name management. No parent/admin endpoints in this feature (handled by separate admin dashboard).

---

## Endpoints

### 1. Device Registration

**POST** `/api/devices/register`

**Purpose**: Device auto-registers on first successful connection.

**Request**:
```json
{
  "initial_name": "Device-5F7A"
}
```

**Response (200 OK)**:
```json
{
  "device_id": "uuid-string-here",
  "device_token": "base64-or-hex-token-32-chars-min",
  "device_name": "Device-5F7A",
  "registered_at": "2026-03-01T10:00:00Z"
}
```

**Error Responses**:
- **400 Bad Request**: Missing or invalid `initial_name`
- **500 Internal Server Error**: Database error

**Implementation Notes**:
- No authentication required (device doesn't have token yet)
- Generate device_id (UUID)
- Generate device_token (128-bit random, base64-encoded)
- Store in `devices` table
- Store token in `device_tokens` table
- Return token to device for caching in AsyncStorage

---

### 2. Update Device Name

**PATCH** `/api/devices/{device_id}/name`

**Purpose**: Update device display name (user-editable).

**Request Header**:
```
Authorization: Bearer {device_token}
```

**Request Body**:
```json
{
  "name": "Sarah's Tablet"
}
```

**Response (200 OK)**:
```json
{
  "device_id": "uuid-string-here",
  "device_name": "Sarah's Tablet",
  "updated_at": "2026-03-01T10:05:00Z"
}
```

**Error Responses**:
- **400 Bad Request**: Missing or invalid `name` (empty, >50 chars)
- **401 Unauthorized**: Missing or invalid device_token
- **404 Not Found**: Device not found or inactive
- **500 Internal Server Error**: Database error

**Implementation Notes**:
- Validate token against device_tokens table
- Verify device.is_active = true
- Trim whitespace, validate length
- Update devices.device_name
- Update devices.last_activity_timestamp

---

### 3. Record Activity Event

**POST** `/api/devices/{device_id}/events`

**Purpose**: Record a child's action in the app. Three event types: view (browsed list), detail (opened image), print (sent to printer). Fire-and-forget from mobile app perspective.

**Request Header**:
```
Authorization: Bearer {device_token}
```

**Request Body**:
```json
{
  "event_type": "detail",
  "image_id": "some-image-id",
  "timestamp": "2026-03-01T10:05:00Z"
}
```

**Fields**:
- `event_type` (required): One of `"view"`, `"detail"`, `"print"`
- `image_id` (optional for view, required for detail/print): Identifier of the image
- `timestamp` (required): When the action occurred on the device (ISO 8601)

**Response (201 Created)**:
```json
{
  "event_id": "uuid-string",
  "status": "recorded"
}
```

**Error Responses**:
- **400 Bad Request**: Invalid event_type or missing required fields
- **401 Unauthorized**: Invalid device_token
- **404 Not Found**: Device not found or inactive

**Implementation Notes**:
- Validate token
- Validate event_type is one of: view, detail, print
- Store in activity_events table
- Update devices.last_activity_timestamp
- No retention policy — events stored indefinitely
- We do NOT track time spent, location, or session duration

---

### 4. List Devices (for Admin Dashboard)

**GET** `/api/admin/devices`

**Purpose**: Admin retrieves all devices for a user/family (separate auth, out of scope for mobile feature).

**Request Header**:
```
Authorization: Bearer {admin_token}
```

**Query Parameters**:
- `user_id` (required): Parent/admin user ID
- `include_inactive` (optional): Include deactivated devices (default: false)

**Response (200 OK)**:
```json
{
  "devices": [
    {
      "device_id": "uuid-1",
      "device_name": "Device-5F7A",
      "registered_at": "2026-03-01T10:00:00Z",
      "last_activity_timestamp": "2026-03-01T10:05:00Z",
      "is_active": true
    }
  ],
  "total": 1
}
```

**Error Responses**:
- **401 Unauthorized**: Invalid admin token
- **403 Forbidden**: User not authorized to view these devices

**Implementation Notes**:
- Requires admin authentication (separate from device token)
- Filter devices by user_id and family_id
- Not tested in mobile feature E2E tests (admin-only)

---

## Authentication Strategy

**Device Token Authentication**:
```python
# FastAPI dependency
def get_device_id(token: str = Header(...)) -> str:
    # Validate token against device_tokens table
    # Return device_id if valid, raise 401 if not
    pass

@app.post("/api/devices/{device_id}/name")
async def update_device_name(
    device_id: str,
    auth_device_id: str = Depends(get_device_id)
):
    # Ensure device_id == auth_device_id
    pass
```

**Admin Authentication** (separate, not in mobile feature):
- Handled by existing FastAPI auth middleware
- Separate from device token authentication

---

## Error Handling

**Standard Error Response**:
```json
{
  "detail": "Device token is invalid or expired",
  "error_code": "INVALID_TOKEN"
}
```

**HTTP Status Codes**:
- 200: Success
- 400: Bad request (validation error)
- 401: Unauthorized (invalid token)
- 403: Forbidden (permission denied)
- 404: Not found
- 500: Server error

---

## Rate Limiting (MVP Scope)

No rate limiting required for MVP (local network only, single family).

---

## Testing Requirements

**Unit Tests** (test_devices.py):
- Device registration: Happy path, missing name, database error
- Device name update: Valid token, invalid token, invalid name, device inactive
- Device heartbeat: Valid token, invalid token, activity logging
- Token validation: Valid token, invalid token, expired token (Phase 2)

**E2E Tests** (kids-app __tests__):
- Mobile app auto-registers on first connection
- Mobile app shows registered device name in settings
- Mobile app can update device name, name persists and syncs to backend
- Mobile app handles endpoint unreachable (retry, error message)

---

## Backwards Compatibility

Not applicable for MVP. Schema versioning deferred to Phase 2+.

