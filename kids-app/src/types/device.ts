/** TypeScript types for the device tracking system. */

export interface DeviceRegistrationRequest {
  initial_name: string;
}

export interface DeviceRegistrationResponse {
  device_id: string;
  device_token: string;
  device_name: string;
  registered_at: string;
}

export interface DeviceNameUpdateRequest {
  name: string;
}

export interface DeviceNameUpdateResponse {
  device_id: string;
  device_name: string;
  updated_at: string;
}

export interface ActivityEventRequest {
  event_type: 'view' | 'detail' | 'print';
  image_id?: string;
  timestamp: string;
}

export interface ActivityEventResponse {
  event_id: string;
  status: 'recorded';
}
