import { useSyncExternalStore } from 'react';

// Singleton state — once hydrated, stays hydrated forever
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Returns true on the client after hydration, false during SSR.
 * Uses useSyncExternalStore to avoid an extra re-render that the 
 * useState+useEffect pattern causes (false→true transition).
 */
export function useHydrated() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
