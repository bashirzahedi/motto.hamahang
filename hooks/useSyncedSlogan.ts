import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { calculateLocalState, isSlangExpired, type CurrentSlangState, type ServerSlangResponse } from '../lib/syncEngine';

interface UseSyncedSloganReturn {
  state: CurrentSlangState | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for getting the synchronized slogan state with server-side random selection
 * Updates every 100ms for smooth countdown display
 * Subscribes to real-time changes from Supabase
 */
export function useSyncedSlogan(): UseSyncedSloganReturn {
  const [serverResponse, setServerResponse] = useState<ServerSlangResponse | null>(null);
  const [state, setState] = useState<CurrentSlangState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const serverResponseRef = useRef<ServerSlangResponse | null>(null);
  const isFetchingRef = useRef(false);

  // Fetch current slang from server (with random selection)
  const fetchCurrentSlang = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      setError(null);
      console.log('[Hamahang] Fetching current slang from server...');

      const { data, error: rpcError } = await supabase.rpc('get_current_slang');

      if (rpcError) {
        console.warn('[Hamahang] RPC error:', rpcError);
        throw rpcError;
      }

      console.log('[Hamahang] Server response:', data);

      if (data) {
        const response: ServerSlangResponse = {
          slang: data.slang,
          currentRepeat: data.currentRepeat,
          secondsRemaining: data.secondsRemaining,
          totalDuration: data.totalDuration,
          elapsedInSlang: data.elapsedInSlang,
          startedAt: data.startedAt,
          receivedAt: Date.now(), // Capture when we received this response
        };
        setServerResponse(response);
        serverResponseRef.current = response;
      } else {
        setServerResponse(null);
        serverResponseRef.current = null;
      }

      setIsLoading(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message
        : (err as any)?.message || 'Failed to load slang';
      console.warn('[Hamahang] Error fetching slang:', msg);
      setError(msg);
      setIsLoading(false);
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchCurrentSlang();
  }, [fetchCurrentSlang]);

  // Subscribe to real-time updates on settings changes (when admin changes slang)
  useEffect(() => {
    const settingsSubscription = supabase
      .channel('settings-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings' },
        () => {
          // Refetch when settings change (e.g., admin manually changed slang)
          fetchCurrentSlang();
        }
      )
      .subscribe();

    const slangsSubscription = supabase
      .channel('slangs-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'slangs' },
        () => {
          // Refetch when slangs change
          fetchCurrentSlang();
        }
      )
      .subscribe();

    return () => {
      settingsSubscription.unsubscribe();
      slangsSubscription.unsubscribe();
    };
  }, [fetchCurrentSlang]);

  // Update state every 100ms for smooth countdown
  useEffect(() => {
    if (!serverResponseRef.current) {
      return;
    }

    const updateState = () => {
      const response = serverResponseRef.current;
      if (!response) {
        setState(null);
        return;
      }

      // Check if slang has expired
      if (isSlangExpired(response)) {
        // Trigger server fetch for next random slang
        fetchCurrentSlang();
        return;
      }

      // Calculate local state
      const newState = calculateLocalState(response);
      setState(newState);
    };

    // Initial update
    updateState();

    // Update every 100ms
    const interval = setInterval(updateState, 100);

    return () => clearInterval(interval);
  }, [serverResponse, fetchCurrentSlang]);

  return {
    state,
    isLoading,
    error,
    refetch: fetchCurrentSlang,
  };
}
