import { useEffect, useState } from 'react';

const formatZoneDate = (timeZone?: string): string => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
};

/**
 * Returns a YYYY-MM-DD key that updates automatically when the calendar day rolls over past midnight.
 */
export function useMidnightKey(timeZone?: string): string {
  const [key, setKey] = useState<string>(() => formatZoneDate(timeZone));

  useEffect(() => {
    setKey(formatZoneDate(timeZone));
    const id = window.setInterval(() => {
      const next = formatZoneDate(timeZone);
      setKey((prev) => (prev === next ? prev : next));
    }, 30_000);
    return () => window.clearInterval(id);
  }, [timeZone]);

  return key;
}
