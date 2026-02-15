import { useState, useEffect, useRef } from 'react';
import { ServerCrowdCounter, type ServerCrowdState } from '../lib/serverCrowdCounter';

export interface UseCrowdCountReturn {
  approximateCount: number | null;
  isAvailable: boolean;
  isActive: boolean;
  status: 'unavailable' | 'starting' | 'scanning' | 'error';
  error: string | null;
}

/**
 * React hook that starts server-based crowd counting and returns the live nearby count.
 */
export function useCrowdCount(): UseCrowdCountReturn {
  const [serverCount, setServerCount] = useState<number>(0);
  const [serverActive, setServerActive] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let serverUnsubscribe: (() => void) | null = null;

    const init = async () => {
      const serverCounter = ServerCrowdCounter.getInstance();

      serverUnsubscribe = serverCounter.subscribe((state: ServerCrowdState) => {
        setServerCount(state.approximateCount);
        setServerActive(state.isActive);
      });

      // Start all services in parallel — they share cached geo result
      const locationPromise = (async () => {
        try {
          const { LocationService } = require('../lib/location');
          await LocationService.getInstance().start();
          const { CrowdReporter } = require('../lib/crowdReporter');
          await CrowdReporter.getInstance().start();
        } catch (err) {
          console.warn('[useCrowdCount] Location/reporter init error:', err);
        }
      })();

      await Promise.all([
        serverCounter.start(),
        locationPromise,
      ]);
    };

    init();

    return () => {
      if (serverUnsubscribe) {
        try { serverUnsubscribe(); } catch {}
        ServerCrowdCounter.getInstance().stop();
      }
      try {
        const { CrowdReporter } = require('../lib/crowdReporter');
        CrowdReporter.getInstance().stop();
        const { LocationService } = require('../lib/location');
        LocationService.getInstance().stop();
      } catch (e) { /* ignore */ }
    };
  }, []);

  return {
    approximateCount: serverCount > 0 ? serverCount : null,
    isAvailable: true,
    isActive: serverActive,
    status: serverActive ? 'scanning' : 'starting',
    error: null,
  };
}
