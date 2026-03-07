import type {
  ActivityEventRequest,
  ActivityEventResponse,
  DeviceNameUpdateRequest,
  DeviceNameUpdateResponse,
  DeviceRegistrationRequest,
  DeviceRegistrationResponse,
} from '../types/device';
import { ApiRequestError } from './client';
import type { ApiError, Item } from '../types/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({ detail: res.statusText }))) as ApiError;
    throw new ApiRequestError(res.status, body);
  }
  return res.json() as Promise<T>;
}

export function createDeviceApiClient(baseUrl: string) {
  return {
    register(data: DeviceRegistrationRequest): Promise<DeviceRegistrationResponse> {
      return request<DeviceRegistrationResponse>(`${baseUrl}/api/devices/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },

    updateName(
      deviceId: string,
      token: string,
      data: DeviceNameUpdateRequest,
    ): Promise<DeviceNameUpdateResponse> {
      return request<DeviceNameUpdateResponse>(`${baseUrl}/api/devices/${deviceId}/name`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
    },

    recordEvent(
      deviceId: string,
      token: string,
      data: ActivityEventRequest,
    ): Promise<ActivityEventResponse> {
      return request<ActivityEventResponse>(`${baseUrl}/api/devices/${deviceId}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
    },

    getRecommendations(deviceId: string, token: string): Promise<Item[]> {
      return request<Item[]>(`${baseUrl}/api/devices/${deviceId}/recommendations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
  };
}
