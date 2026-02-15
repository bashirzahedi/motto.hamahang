import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getAnonymousId } from '../lib/anonymousId';
import { ServerCrowdCounter } from '../lib/serverCrowdCounter';

const PRESENCE_RETRY_MS = 30 * 1000; // Retry every 30s if city not detected yet
const PRESENCE_REFRESH_MS = 5 * 60 * 1000; // Re-record every 5 min

/**
 * Starts presence services and records daily presence per city.
 * Uses IP-based geolocation on web — no location permission needed.
 */
export function usePresence() {
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let presenceInterval: ReturnType<typeof setInterval> | null = null;
    let recorded = false;

    (async () => {
      // Start all services in parallel — they share cached geo result
      await Promise.all([
        ServerCrowdCounter.getInstance().start().catch(err => {
          console.warn('[usePresence] ServerCrowdCounter error:', err);
        }),
        (async () => {
          try {
            const { LocationService } = require('../lib/location');
            await LocationService.getInstance().start();
            const { CrowdReporter } = require('../lib/crowdReporter');
            await CrowdReporter.getInstance().start();
          } catch (err) {
            console.warn('[usePresence] Location/reporter error:', err);
          }
        })(),
      ]);

      // Try recording presence immediately
      recorded = await recordPresence();

      // Retry/refresh periodically
      presenceInterval = setInterval(async () => {
        const ok = await recordPresence();
        if (ok) recorded = true;
      }, recorded ? PRESENCE_REFRESH_MS : PRESENCE_RETRY_MS);
    })();

    return () => {
      if (presenceInterval) clearInterval(presenceInterval);
      try { ServerCrowdCounter.getInstance().stop(); } catch {}
      try {
        const { CrowdReporter } = require('../lib/crowdReporter');
        CrowdReporter.getInstance().stop();
        const { LocationService } = require('../lib/location');
        LocationService.getInstance().stop();
      } catch {}
    };
  }, []);
}

async function recordPresence(): Promise<boolean> {
  try {
    const { LocationService } = require('../lib/location');
    const city = LocationService.getInstance().getCity();
    if (!city) return false;

    const deviceId = await getAnonymousId();
    const { error } = await supabase.rpc('record_presence', {
      p_city: city,
      p_device_id: deviceId,
    });

    if (error) {
      console.warn('[usePresence] Record presence error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[usePresence] Record presence error:', err);
    return false;
  }
}
