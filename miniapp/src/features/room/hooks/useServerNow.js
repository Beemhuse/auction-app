import { useEffect, useState } from 'react';

/**
 * Ticking "now" in server time. `serverTime` is the server clock at the moment the live state was
 * fetched, so countdowns agree with the server even when the phone's clock is off.
 */
export function useServerNow(serverTime, fetchedAt) {
  const offset = serverTime ? new Date(serverTime).getTime() - fetchedAt : 0;
  const [now, setNow] = useState(() => Date.now() + offset);

  useEffect(() => {
    const tick = () => setNow(Date.now() + offset);
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [offset]);

  return now;
}
