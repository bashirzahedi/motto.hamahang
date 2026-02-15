import { supabase } from './supabase';
import { getAnonymousId } from './anonymousId';
import { approximateCount } from './approximation';
import { ipGeolocate } from './ipGeolocate';

const HEARTBEAT_INTERVAL_MS = 30 * 1000; // 30 seconds
const INITIAL_RETRY_MS = 3 * 1000; // Retry faster initially
const MAX_INITIAL_RETRIES = 10;
const COORDS_MAX_AGE_MS = 5 * 60 * 1000; // Cache coords for 5 minutes

interface Coords {
  lat: number;
  lng: number;
}

export interface ServerCrowdState {
  nearbyCount: number;
  approximateCount: number;
  isActive: boolean;
  locationServicesOff: boolean;
  error: string | null;
}

type StateListener = (state: ServerCrowdState) => void;

/**
 * Server-based crowd counter using IP geolocation on all platforms.
 *
 * Sends IP-based lat/lng to Supabase which rounds to ~11km grid and
 * matches devices in the same or adjacent cells (~22km range).
 *
 * Privacy:
 * - Device ID is hashed (SHA-256) before sending
 * - Only approximate IP-based coords sent (server rounds to ~11km grid)
 * - Stale heartbeats auto-deleted server-side after 3 minutes
 * - No location permission needed
 */
export class ServerCrowdCounter {
  private static instance: ServerCrowdCounter | null = null;

  private deviceHash: string | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private retryTimer: ReturnType<typeof setInterval> | null = null;
  private started = false;
  private cachedCoords: Coords | null = null;
  private cachedCoordsTime: number = 0;
  private listeners: Set<StateListener> = new Set();
  private state: ServerCrowdState = {
    nearbyCount: 0,
    approximateCount: 0,
    isActive: false,
    locationServicesOff: false,
    error: null,
  };

  static getInstance(): ServerCrowdCounter {
    if (!ServerCrowdCounter.instance) {
      ServerCrowdCounter.instance = new ServerCrowdCounter();
    }
    return ServerCrowdCounter.instance;
  }

  private constructor() {}

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  getState(): ServerCrowdState {
    return this.state;
  }

  private notify() {
    for (const listener of this.listeners) {
      try { listener(this.state); } catch {}
    }
  }

  private updateState(partial: Partial<ServerCrowdState>) {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    // Generate hashed device ID
    const anonId = await getAnonymousId();
    this.deviceHash = await this.hashDeviceId(anonId);

    // Fire first heartbeat without blocking — subscriber gets notified when ready
    this.sendHeartbeat().then(success => {
      if (!success) {
        let retries = 0;
        this.retryTimer = setInterval(async () => {
          retries++;
          const ok = await this.sendHeartbeat();
          if (ok || retries >= MAX_INITIAL_RETRIES) {
            if (this.retryTimer) clearInterval(this.retryTimer);
            this.retryTimer = null;
          }
        }, INITIAL_RETRY_MS);
      }
    });

    // Recurring heartbeats every 30 seconds
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat().catch(err => {
        console.warn('[ServerCrowdCounter] Heartbeat error:', err);
      });
    }, HEARTBEAT_INTERVAL_MS);
  }

  async stop(): Promise<void> {
    this.started = false;
    this.cachedCoords = null;
    this.cachedCoordsTime = 0;
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
    this.updateState({
      nearbyCount: 0,
      approximateCount: 0,
      isActive: false,
      error: null,
    });
  }

  /**
   * Get IP-based coordinates, using cache if recent enough.
   */
  private async getCoords(): Promise<Coords | null> {
    // Return cached coords if still fresh
    if (this.cachedCoords && (Date.now() - this.cachedCoordsTime) < COORDS_MAX_AGE_MS) {
      return this.cachedCoords;
    }

    const coords = await this.getCoordsFromIP();

    if (coords) {
      this.cachedCoords = coords;
      this.cachedCoordsTime = Date.now();
    }

    // If fresh fetch failed but we have cached coords, use them
    if (!coords && this.cachedCoords) {
      console.log('[ServerCrowdCounter] Using cached coords');
      return this.cachedCoords;
    }

    return coords;
  }

  private async getCoordsFromIP(): Promise<Coords | null> {
    const result = await ipGeolocate();
    if (result) {
      console.log('[ServerCrowdCounter] IP geolocation OK:', result.lat.toFixed(1), result.lng.toFixed(1));
      return { lat: result.lat, lng: result.lng };
    }
    console.warn('[ServerCrowdCounter] All geolocation methods failed');
    return null;
  }

  /** Returns true if heartbeat was sent successfully */
  private async sendHeartbeat(): Promise<boolean> {
    if (!this.deviceHash) return false;

    const coords = await this.getCoords();
    if (!coords) {
      console.warn('[ServerCrowdCounter] No coords — will retry');
      return false;
    }

    try {
      const { data, error } = await supabase.rpc('heartbeat_nearby', {
        device_hash_param: this.deviceHash,
        lat_param: coords.lat,
        lng_param: coords.lng,
      });

      if (error) {
        console.warn('[ServerCrowdCounter] RPC error:', error);
        return false;
      }

      const rawCount = typeof data === 'number' ? data : 0;
      console.log('[ServerCrowdCounter] lat:', coords.lat.toFixed(3), 'lng:', coords.lng.toFixed(3), '| Nearby:', rawCount);

      this.updateState({
        nearbyCount: rawCount,
        approximateCount: approximateCount(rawCount),
        isActive: true,
        locationServicesOff: false,
        error: null,
      });
      return true;
    } catch (err: any) {
      console.warn('[ServerCrowdCounter] Network error:', err);
      return false;
    }
  }

  /**
   * Hash the device anonymous ID for privacy separation.
   * Uses SHA-256 on web, djb2 fallback on native.
   */
  private async hashDeviceId(id: string): Promise<string> {
    const salt = 'hamahang_crowd_v1';
    const input = salt + id;

    // Web: use crypto.subtle for SHA-256
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(input);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } catch {}
    }

    // Fallback: djb2 hash
    let hash = 5381;
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
    }
    return 'h_' + Math.abs(hash).toString(16);
  }
}
