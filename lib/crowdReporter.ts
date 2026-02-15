import { supabase } from './supabase';
import { approximateCount } from './approximation';
import { LocationService } from './location';
import { ServerCrowdCounter } from './serverCrowdCounter';

const REPORT_INTERVAL_MS = 60 * 1000; // Report every 60 seconds

/**
 * Singleton service that periodically reports the peak crowd count
 * to Supabase, tagged with the IP-detected city.
 *
 * Privacy: only sends city name + bucketed approximate count + date.
 * No device IDs, no coordinates, no user identity.
 */
export class CrowdReporter {
  private static instance: CrowdReporter | null = null;

  private peakRawCount = 0;
  private lastReportedPeak = 0;
  private reportTimer: ReturnType<typeof setInterval> | null = null;
  private started = false;
  private unsubscribeSource: (() => void) | null = null;

  static getInstance(): CrowdReporter {
    if (!CrowdReporter.instance) {
      CrowdReporter.instance = new CrowdReporter();
    }
    return CrowdReporter.instance;
  }

  private constructor() {}

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    // Subscribe to server crowd counter to track peak count
    const serverCounter = ServerCrowdCounter.getInstance();
    this.unsubscribeSource = serverCounter.subscribe((state) => {
      const raw = state.nearbyCount || 0;
      if (raw > this.peakRawCount) {
        this.peakRawCount = raw;
      }
    });

    // Start reporting timer
    this.reportTimer = setInterval(() => {
      this.reportPeak().catch(err => {
        console.warn('[CrowdReporter] Report error:', err);
      });
    }, REPORT_INTERVAL_MS);
  }

  async stop(): Promise<void> {
    this.started = false;
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = null;
    }
    if (this.unsubscribeSource) {
      this.unsubscribeSource();
      this.unsubscribeSource = null;
    }
    this.peakRawCount = 0;
    this.lastReportedPeak = 0;
  }

  private async reportPeak(): Promise<void> {
    const approx = approximateCount(this.peakRawCount);
    if (approx <= 0 || approx === this.lastReportedPeak) return;

    const city = LocationService.getInstance().getCity();
    if (!city) return;

    const today = new Date().toISOString().split('T')[0];

    try {
      const { error } = await supabase.rpc('report_crowd_peak', {
        p_city: city,
        p_date: today,
        p_count: approx,
      });

      if (error) {
        console.warn('[CrowdReporter] RPC error:', error);
        return;
      }

      this.lastReportedPeak = approx;
    } catch (err) {
      console.warn('[CrowdReporter] Network error:', err);
    }
  }
}
