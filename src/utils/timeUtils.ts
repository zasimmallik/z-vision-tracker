// src/utils/timeUtils.ts

export interface TimeRemaining {
  years: number;
  months: number;
  weeks: number;
  days: number;
  hours: number;
  totalMs: number;
  isExpired: boolean;
  totalDays?: number;
  totalWeeks?: number;
  totalHours?: number;
  isInvalid?: boolean;
}

/**
 * Calculate the remaining time between current date and end date in a non-overlapping way.
 * This function accurately handles different month lengths and leap years.
 * @param endDate - The target end date
 * @param referenceDate - Optional "now" used by the shared dashboard ticker
 * @returns Object containing years, months, weeks, days, hours, and total milliseconds
 */
export const calculateTimeRemaining = (endDate: string | Date, referenceDate?: Date): TimeRemaining => {
  const now = referenceDate ?? new Date();
  const target = new Date(endDate);
  const targetMs = target.getTime();

  // Guard: invalid end date
  if (Number.isNaN(targetMs)) {
    return {
      years: 0,
      months: 0,
      weeks: 0,
      days: 0,
      hours: 0,
      totalMs: 0,
      isExpired: false,
      totalDays: 0,
      totalWeeks: 0,
      totalHours: 0,
      isInvalid: true,
    };
  }

  const totalMs = targetMs - now.getTime();

  // If the target date has passed, return zeros
  if (totalMs <= 0) {
    return {
      years: 0,
      months: 0,
      weeks: 0,
      days: 0,
      hours: 0,
      totalMs: 0,
      isExpired: true,
    };
  }

  // Use a temporary date to perform calculations without modifying 'now'
  const tempNow = new Date(now);

  // Calculate full years remaining
  let years = target.getFullYear() - tempNow.getFullYear();
  tempNow.setFullYear(tempNow.getFullYear() + years);
  if (tempNow > target) {
    years--;
    tempNow.setFullYear(tempNow.getFullYear() - 1);
  }

  // Calculate full months remaining after accounting for years
  let months = 0;
  const tempCheck = new Date(tempNow);
  while (true) {
    tempCheck.setMonth(tempCheck.getMonth() + 1);
    if (tempCheck > target) break;
    months++;
  }
  tempNow.setMonth(tempNow.getMonth() + months);

  // The remaining difference will be used for days and smaller units
  const remainingMs = target.getTime() - tempNow.getTime();

  // Calculate days, weeks, and hours from the remaining milliseconds
  const remainingDays = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
  
  const weeks = Math.floor(remainingDays / 7);
  const days = remainingDays % 7;
  
  const hours = Math.floor((remainingMs / (1000 * 60 * 60)) % 24);

  // For compatibility with other parts of your app, we can still calculate total values
  const totalDays = Math.floor(totalMs / (1000 * 60 * 60 * 24));
  const totalWeeks = Math.floor(totalDays / 7);
  const totalHours = Math.floor(totalMs / (1000 * 60 * 60));

  return {
    years,
    months,
    weeks,
    days,
    hours,
    totalMs,
    isExpired: false,
    // Keep these additional values in case they are used elsewhere
    totalDays,
    totalWeeks,
    totalHours,
  };
};

/**
 * Format date range for display
 * @param startDate - The start date
 * @param endDate - The end date
 * @returns Formatted date range string
 */
export const formatDateRange = (startDate: string | Date, endDate: string | Date): string => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const startMs = start.getTime();
  const endMs = end.getTime();
  
  const options: Intl.DateTimeFormatOptions = { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  };
  
  const hasStart = !Number.isNaN(startMs);
  const hasEnd = !Number.isNaN(endMs);

  if (hasStart && hasEnd) {
    const startFormatted = start.toLocaleDateString('en-US', options);
    const endFormatted = end.toLocaleDateString('en-US', options);
    return `${startFormatted} – ${endFormatted}`;
  }
  if (hasEnd) {
    return end.toLocaleDateString('en-US', options);
  }
  if (hasStart) {
    return start.toLocaleDateString('en-US', options);
  }
  return 'Invalid Date';
};

/**
 * Format time remaining for display with proper pluralization
 * @param value - The time value
 * @param unit - The time unit (year, month, week, day, hour)
 * @returns Formatted time string
 */
export const formatTimeUnit = (value: number, unit: string): string => {
  if (value === 0) return '';
  if (value === 1) return `${value} ${unit}`;
  return `${value} ${unit}s`;
};

/**
 * Get a human-readable description of remaining time
 * @param timeRemaining - Result from calculateTimeRemaining
 * @returns Human-readable time description
 */
export const getTimeDescription = (timeRemaining: TimeRemaining): string => {
  const { years, months, weeks, days, hours, isExpired } = timeRemaining;
  
  if (isExpired) return 'Expired';
  
  const parts: string[] = [];
  
  if (years > 0) parts.push(formatTimeUnit(years, 'year'));
  if (months > 0) parts.push(formatTimeUnit(months, 'month'));
  if (weeks > 0) parts.push(formatTimeUnit(weeks, 'week'));
  if (days > 0) parts.push(formatTimeUnit(days, 'day'));
  if (hours > 0) parts.push(formatTimeUnit(hours, 'hour'));
  
  if (parts.length === 0) return 'Less than an hour';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts.join(' ');
  
  return parts.slice(0, -1).join(', ') + ' ' + parts[parts.length - 1];
};

/**
 * Calculate progress percentage between two dates
 * @param startDate
 * @param endDate
 * @returns 0-100
 */
export const calculateProgressPercent = (startDate: string | Date | null | undefined, endDate: string | Date): number => {
  const start = startDate ? new Date(startDate).getTime() : null;
  const end = new Date(endDate).getTime();
  const now = Date.now();
  if (Number.isNaN(end)) return 0;
  if (!start || Number.isNaN(start) || now <= start) return 0;
  if (now >= end) return 100;
  const total = end - start;
  const elapsed = now - start;
  return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
};

/**
 * Format milliseconds into a compact countdown (e.g., 2h 15m)
 * @param ms
 * @returns
 */
export const formatCountdown = (ms: number): string => {
  if (ms <= 0) return 'now';
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes || parts.length === 0) parts.push(`${minutes}m`);
  return parts.join(' ');
};
