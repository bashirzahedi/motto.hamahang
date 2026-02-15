import { normalizeCityFromGeocode } from './cityNames';
import { ipGeolocate } from './ipGeolocate';

const LOCATION_POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Singleton location service for city detection via IP geolocation.
 * Uses IP-based APIs — no location permission needed on any platform.
 * Caches city name per session, refreshes every 5 minutes.
 */
export class LocationService {
  private static instance: LocationService | null = null;

  private currentCity: string | null = null;
  private polling = false;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private started = false;
  private lastError: string | null = null;

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  private constructor() {}

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    await this.pollCity();
    this.pollTimer = setInterval(() => {
      this.pollCity().catch(err => {
        console.warn('[LocationService] Poll error:', err);
      });
    }, LOCATION_POLL_INTERVAL_MS);
  }

  async stop(): Promise<void> {
    this.started = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.currentCity = null;
  }

  getCity(): string | null {
    return this.currentCity;
  }

  isPermissionDenied(): boolean {
    return false; // IP-based — no permission needed
  }

  getLastError(): string | null {
    return this.lastError;
  }

  async retry(): Promise<void> {
    await this.pollCity();
  }

  private async pollCity(): Promise<void> {
    if (this.polling) return;
    this.polling = true;
    try {
      const result = await ipGeolocate();
      if (result?.city) {
        this.currentCity = normalizeCityFromGeocode(result.city);
        this.lastError = null;
      } else {
        this.lastError = 'ip_city_detection_failed';
      }
    } finally {
      this.polling = false;
    }
  }
}
