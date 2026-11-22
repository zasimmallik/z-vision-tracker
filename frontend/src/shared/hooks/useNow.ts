import { useEffect, useState } from 'react';

export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    if (intervalMs <= 0) return;

    let intervalId: number | undefined;
    const msToNextBoundary = intervalMs - (Date.now() % intervalMs);
    const timeoutId = window.setTimeout(() => {
      setNow(new Date());
      intervalId = window.setInterval(() => setNow(new Date()), intervalMs);
    }, msToNextBoundary);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, [intervalMs]);

  return now;
}
