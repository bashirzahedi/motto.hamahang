type Listener = (isOnline: boolean) => void;

let currentlyOnline = true;
const listeners = new Set<Listener>();
let unsubscribe: (() => void) | null = null;

/**
 * Start listening to network state changes.
 * Call once at app startup.
 */
export function startNetworkMonitoring(): void {
  if (unsubscribe) return;
  try {
    const NetInfo = require('@react-native-community/netinfo').default;
    unsubscribe = NetInfo.addEventListener((state: any) => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      if (online !== currentlyOnline) {
        currentlyOnline = online;
        for (const listener of listeners) {
          try { listener(online); } catch {}
        }
      }
    });
  } catch (err) {
    console.warn('[networkStatus] NetInfo not available, assuming online:', err);
  }
}

/**
 * Stop listening to network state changes.
 */
export function stopNetworkMonitoring(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

/**
 * Returns current online status.
 */
export function isOnline(): boolean {
  return currentlyOnline;
}

/**
 * Subscribe to online/offline changes.
 * Returns unsubscribe function.
 */
export function onNetworkChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
