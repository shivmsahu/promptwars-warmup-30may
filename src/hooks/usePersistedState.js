import { useEffect, useState } from 'react';

/**
 * Syncs React state with localStorage.
 */
export function usePersistedState(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null && stored !== '' ? stored : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage may be unavailable in private browsing or tests.
    }
  }, [key, value]);

  return [value, setValue];
}
