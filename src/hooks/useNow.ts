import { useEffect, useState } from 'react';

/**
 * Returns a Date that refreshes on a fixed interval.
 *
 * Most countdowns in the dashboard only display hours/days at their smallest
 * unit, so re-rendering every second is wasted work. The default of 60s keeps
 * the UI accurate while dramatically reducing renders during scrolling.
 */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    if (intervalMs <= 0) return;

    let intervalId: number | undefined;

    // Align the first tick to the next minute boundary so the numbers change
    // at a predictable moment instead of every arbitrary second.
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
