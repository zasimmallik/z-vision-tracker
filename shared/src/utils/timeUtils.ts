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

export const calculateTimeRemaining = (
  endDate: string | Date,
  referenceDate?: Date
): TimeRemaining => {
  const now = referenceDate ?? new Date();
  const target = new Date(endDate);
  const targetMs = target.getTime();

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

  const tempNow = new Date(now);

  let years = target.getFullYear() - tempNow.getFullYear();
  tempNow.setFullYear(tempNow.getFullYear() + years);
  if (tempNow > target) {
    years--;
    tempNow.setFullYear(tempNow.getFullYear() - 1);
  }

  let months = 0;
  const tempCheck = new Date(tempNow);
  while (true) {
    tempCheck.setMonth(tempCheck.getMonth() + 1);
    if (tempCheck > target) break;
    months++;
  }
  tempNow.setMonth(tempNow.getMonth() + months);

  const remainingMs = target.getTime() - tempNow.getTime();
  const remainingDays = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(remainingDays / 7);
  const days = remainingDays % 7;
  const hours = Math.floor((remainingMs / (1000 * 60 * 60)) % 24);

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
    totalDays,
    totalWeeks,
    totalHours,
  };
};

export const formatDateRange = (
  startDate: string | Date,
  endDate: string | Date
): string => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const startMs = start.getTime();
  const endMs = end.getTime();

  const options: Intl.DateTimeFormatOptions = {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  };

  const hasStart = !Number.isNaN(startMs);
  const hasEnd = !Number.isNaN(endMs);

  if (hasStart && hasEnd) {
    return `${start.toLocaleDateString('en-US', options)} – ${end.toLocaleDateString('en-US', options)}`;
  }
  if (hasEnd) {
    return end.toLocaleDateString('en-US', options);
  }
  if (hasStart) {
    return start.toLocaleDateString('en-US', options);
  }
  return 'Invalid Date';
};

export const formatTimeUnit = (value: number, unit: string): string => {
  if (value === 0) return '';
  if (value === 1) return `${value} ${unit}`;
  return `${value} ${unit}s`;
};

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

export const calculateProgressPercent = (
  startDate: string | Date | null | undefined,
  endDate: string | Date
): number => {
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

export const toLocalYmd = (date: Date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const shiftYmdString = (ymd: string, deltaDays: number): string => {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y || 2026, (m || 1) - 1, d || 1));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
};
