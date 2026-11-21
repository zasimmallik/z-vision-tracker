import { useEffect, useState } from 'react';

/**
 * Subscribes to a CSS media query.
 *
 * Used to mount only the layout that is actually visible. Rendering both the
 * mobile and desktop dashboards at once doubles the DOM, fetches, and timers
 * even though one of the two is hidden with `display: none`.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent) => setMatches(event.matches);

    setMatches(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}
