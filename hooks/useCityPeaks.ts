import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface CityPresence {
  city: string;
  visitor_count: number;
}

export interface UseCityPeaksReturn {
  peaks: CityPresence[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Subscribe to today's unique visitor counts per city in real-time.
 * Uses the daily_presence table (one record per device per city per day).
 */
export function useCityPeaks(): UseCityPeaksReturn {
  const [peaks, setPeaks] = useState<CityPresence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPeaks = async () => {
    try {
      const { data, error: fetchError } = await supabase.rpc('get_city_presence');

      if (fetchError) throw fetchError;
      setPeaks(data || []);
    } catch (err) {
      console.warn('[useCityPeaks] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPeaks();

    const subscription = supabase
      .channel('daily-presence-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_presence' },
        () => { fetchPeaks(); }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { peaks, isLoading, error };
}
