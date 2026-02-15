import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';

/**
 * Hook for admin pages that fetch data on mount.
 *
 * Solves the Safari background-tab problem: when Safari suspends a tab,
 * in-flight `fetch()` requests hang forever. This hook adds:
 *
 * 1. A safety timeout — loading ends after `timeoutMs` even if the fetch hangs.
 * 2. Visibility-based re-fetch — when the tab becomes visible again, `fetchFn`
 *    is called again with fresh network requests.
 * 3. A `refetch` callback you can call manually.
 * 4. Prevents concurrent fetches — if a fetch is already in progress, new
 *    requests are skipped to avoid network congestion.
 *
 * Usage:
 *   const { loading, refetch } = useAdminData(async () => {
 *     const { data } = await supabase.from('slangs').select('*');
 *     setSlangs(data ?? []);
 *   });
 */
export function useAdminData(
  fetchFn: () => Promise<void>,
  { timeoutMs = 8000, deps = [] as readonly unknown[] } = {},
) {
  const [loading, setLoading] = useState(true);
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;
  const loadedOnceRef = useRef(false);
  const fetchingRef = useRef(false);

  const doFetch = useCallback(async (showLoading: boolean) => {
    // Prevent concurrent fetches
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    if (showLoading) setLoading(true);
    try {
      await fetchRef.current();
    } catch (err: any) {
      console.warn('[useAdminData] fetch failed:', err);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
      loadedOnceRef.current = true;
    }
  }, []);

  // Initial fetch + safety timeout
  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(false);
      loadedOnceRef.current = true;
    }, timeoutMs);

    doFetch(true).then(() => clearTimeout(timeout));

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Re-fetch when tab resumes (Safari background fix)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const handler = () => {
      if (document.visibilityState === 'visible' && loadedOnceRef.current) {
        // Silent re-fetch — don't show loading spinner
        doFetch(false);
      }
    };

    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [doFetch]);

  const refetch = useCallback(() => doFetch(false), [doFetch]);

  return { loading, refetch };
}
