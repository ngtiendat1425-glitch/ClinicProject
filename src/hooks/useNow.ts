import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** Refresh time-dependent screens while open and immediately after app resume. */
export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const timer = setInterval(refresh, 15_000);
    const subscription = AppState.addEventListener('change', status => {
      if (status === 'active') refresh();
    });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);
  return now;
}
