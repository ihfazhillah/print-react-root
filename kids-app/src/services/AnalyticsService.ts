import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

const QUEUE_KEY = '@analytics_queue';
const TOKEN_KEY = 'device:token';
const SYNC_INTERVAL_MS = 30_000;
const MAX_BATCH = 20;

export interface Interaction {
  type: 'select' | 'print';
  page_url: string;
  timestamp: string;
}

class AnalyticsService {
  private _deviceId: string | null = null;
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _pending: Interaction[] = [];
  private _baseUrl: string | null = null;

  /** Call once at app start with device info */
  init(deviceId: string, baseUrl: string) {
    if (this._deviceId) return;
    this._deviceId = deviceId;
    this._baseUrl = baseUrl;
    this._loadQueue();
    this._timer = setInterval(() => this._sync(), SYNC_INTERVAL_MS);
  }

  /** Record an interaction — queued locally, synced in background */
  track(type: 'select' | 'print', pageUrl: string) {
    if (!this._deviceId || !this._baseUrl) return;
    const entry: Interaction = {
      type,
      page_url: pageUrl,
      timestamp: new Date().toISOString(),
    };
    this._pending.push(entry);
    this._saveQueue();
    if (this._pending.length >= MAX_BATCH) {
      this._sync();
    }
  }

  /** Stop background sync — call on app quit / destroy */
  destroy() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  private async _loadQueue() {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      if (raw) this._pending = JSON.parse(raw);
    } catch {
      this._pending = [];
    }
  }

  private async _saveQueue() {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this._pending));
    } catch {
      // silent
    }
  }

  private async _getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  private async _sync() {
    if (this._pending.length === 0 || !this._baseUrl) return;
    const token = await this._getToken();
    if (!token) return; // no device registered yet

    const batch = this._pending.splice(0, MAX_BATCH);

    try {
      let synced = 0;
      for (let i = 0; i < batch.length; i++) {
        const entry = batch[i];
        const res = await fetch(`${this._baseUrl}/api/interactions/device`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            page_url: entry.page_url,
            interaction_type: entry.type,
          }),
        });
        if (!res.ok) {
          // Re-queue this and remaining entries
          this._pending.unshift(...batch.slice(i));
          break;
        }
        synced++;
      }

      if (synced > 0) {
        await this._saveQueue();
        DeviceEventEmitter.emit('analytics:synced', synced);
      }
    } catch {
      // offline — re-queue
      this._pending.unshift(...batch);
      await this._saveQueue();
    }
  }
}

export const analytics = new AnalyticsService();
