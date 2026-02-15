import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface AppSettings {
  votingEnabled: boolean;
  weightedSelectionEnabled: boolean;
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>({ votingEnabled: true, weightedSelectionEnabled: true });
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['voting_enabled', 'weighted_selection_enabled']);

      if (!error && data) {
        const map = Object.fromEntries(data.map((r) => [r.key, r.value]));
        setSettings({
          votingEnabled: map['voting_enabled'] !== false,
          weightedSelectionEnabled: map['weighted_selection_enabled'] !== false,
        });
      }
    } catch {
      // Default to enabled on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();

    const subscription = supabase
      .channel('app-settings-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings' },
        () => { fetchSettings(); },
      )
      .subscribe();

    return () => { subscription.unsubscribe(); };
  }, [fetchSettings]);

  return { ...settings, isLoading };
}
