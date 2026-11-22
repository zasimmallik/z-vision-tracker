import { Coordinates, PrayerTimes } from 'adhan';
import { getAdhanParams, safeTimezone } from './prayerGeo.js';
import type { PrayerSettings } from '../types/vision.js';

export interface RamadanDaySchedule {
  dayNumber: number;
  gregorianYmd: string;
  gregorianLabel: string;
  sehriEnd: string;
  sunrise: string;
  iftar: string;
  sehriEnd12: string;
  iftar12: string;
  fastingDurationMinutes: number;
}

export interface RamadanLiveStatus {
  phase: 'before' | 'during' | 'after';
  currentDay?: number;
  daysUntilStart?: number;
  nextEvent?: {
    label: 'Sehri' | 'Iftar';
    at: Date;
    inMs: number;
    progressPercent: number;
  };
}

const getHijriParts = (
  date: Date,
  timeZone: string
): { year: number; month: number; day: number } => {
  const tz = safeTimezone(timeZone);
  const locales = ['en-u-ca-islamic-umalqura', 'en-u-ca-islamic'];
  for (const locale of locales) {
    try {
      const parts = new Intl.DateTimeFormat(locale, {
        timeZone: tz,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      }).formatToParts(date);
      const getNum = (t: string) => {
        const raw = parts.find((p) => p.type === t)?.value ?? '0';
        const digits = raw.replace(/[^\d]/g, '');
        return Number(digits) || 0;
      };
      const year = getNum('year');
      const month = getNum('month');
      const day = getNum('day');
      if (year >= 1300 && month >= 1 && day >= 1) {
        return { year, month, day };
      }
    } catch {
      // try fallback calendar locale
    }
  }
  return { year: 1447, month: 1, day: 1 };
};

export const getCurrentHijriYear = (
  date: Date = new Date(),
  timeZone: string = 'UTC'
): number => {
  return getHijriParts(date, timeZone).year;
};

const formatYmdInZone = (date: Date, timeZone: string): string => {
  const tz = safeTimezone(timeZone);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '01';
  return `${get('year')}-${get('month')}-${get('day')}`;
};

const getTimezoneOffsetMs = (date: Date, timeZone: string): number => {
  const tz = safeTimezone(timeZone);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const hour = get('hour') === 24 ? 0 : get('hour');
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    hour,
    get('minute'),
    get('second')
  );
  return asUtc - date.getTime();
};

const toZonedDateTime = (ymd: string, hhmm: string, timeZone: string): Date => {
  const [y, m, d] = ymd.split('-').map(Number);
  const match = hhmm.match(/^(\d{1,2}):(\d{2})/);
  const hh = match ? Number(match[1]) : 0;
  const mm = match ? Number(match[2]) : 0;
  const guessUtc = new Date(Date.UTC(y || 2026, (m || 1) - 1, d || 1, hh, mm, 0));
  const offset1 = getTimezoneOffsetMs(guessUtc, timeZone);
  const firstPass = new Date(guessUtc.getTime() - offset1);
  const offset2 = getTimezoneOffsetMs(firstPass, timeZone);
  return new Date(guessUtc.getTime() - offset2);
};

const findRamadanStartUtcNoon = (hijriYear: number): Date => {
  // Approximate Gregorian year: Hijri year * 0.970224 + 621.5774
  const approxYear = Math.round(hijriYear * 0.970224 + 621.5774);
  const startSearch = Date.UTC(approxYear - 1, 0, 1, 12, 0, 0);
  const endSearch = Date.UTC(approxYear + 1, 11, 31, 12, 0, 0);
  const dayMs = 24 * 60 * 60 * 1000;

  let lo = startSearch;
  let hi = endSearch;

  // Binary search using total Hijri day index: year * 400 + month * 32 + day
  const targetRank = hijriYear * 400 + 9 * 32 + 1;
  while (hi - lo > dayMs) {
    const mid = Math.floor((lo + hi) / 2);
    const parts = getHijriParts(new Date(mid), 'UTC');
    const rank = parts.year * 400 + parts.month * 32 + parts.day;
    if (rank < targetRank) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  // Scan +/- 5 days around hi to find exact Hijri 9/1
  for (let offset = -5; offset <= 5; offset++) {
    const candidate = new Date(hi + offset * dayMs);
    const parts = getHijriParts(candidate, 'UTC');
    if (parts.year === hijriYear && parts.month === 9 && parts.day === 1) {
      return new Date(
        Date.UTC(
          candidate.getUTCFullYear(),
          candidate.getUTCMonth(),
          candidate.getUTCDate(),
          12,
          0,
          0
        )
      );
    }
  }

  return new Date(hi);
};

const to12HourCompact = (hhmm: string): string => {
  const [hStr, mStr] = hhmm.split(':');
  if (!hStr || !mStr) return hhmm;
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${mStr} ${ampm}`;
};

export const generateRamadanSchedule = (
  hijriYear: number,
  hijriOffset: number,
  prayer: PrayerSettings
): RamadanDaySchedule[] => {
  const tz = safeTimezone(prayer.timezone);
  const lat = Number.isFinite(prayer.latitude) ? prayer.latitude : 51.5074;
  const lng = Number.isFinite(prayer.longitude) ? prayer.longitude : -0.1278;
  const coordinates = new Coordinates(lat, lng);
  const params = getAdhanParams(prayer.calculationMethod, prayer.madhab);

  const baseStart = findRamadanStartUtcNoon(hijriYear);
  const clampedOffset = Math.max(-2, Math.min(2, Math.round(hijriOffset)));
  const dayMs = 24 * 60 * 60 * 1000;

  const fmtHHmm = (d: Date) =>
    new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);

  const fmtLabel = (d: Date) =>
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(d);

  const days: RamadanDaySchedule[] = [];

  for (let i = 0; i < 30; i++) {
    const dayDate = new Date(baseStart.getTime() + (i + clampedOffset) * dayMs);
    const ymd = formatYmdInZone(dayDate, tz);
    const noonInZone = toZonedDateTime(ymd, '12:00', tz);
    const prayerTimes = new PrayerTimes(coordinates, noonInZone, params);

    const sehriEnd = fmtHHmm(prayerTimes.fajr);
    const sunrise = fmtHHmm(prayerTimes.sunrise);
    const iftar = fmtHHmm(prayerTimes.maghrib);
    const durationMinutes = Math.max(
      0,
      Math.round((prayerTimes.maghrib.getTime() - prayerTimes.fajr.getTime()) / 60000)
    );

    days.push({
      dayNumber: i + 1,
      gregorianYmd: ymd,
      gregorianLabel: fmtLabel(noonInZone),
      sehriEnd,
      sunrise,
      iftar,
      sehriEnd12: to12HourCompact(sehriEnd),
      iftar12: to12HourCompact(iftar),
      fastingDurationMinutes: durationMinutes,
    });
  }

  return days;
};

export const getRamadanLiveStatus = (
  schedule: RamadanDaySchedule[],
  now: Date,
  timeZone: string
): RamadanLiveStatus => {
  if (schedule.length === 0) {
    return { phase: 'before', daysUntilStart: 0 };
  }

  const tz = safeTimezone(timeZone);
  const todayYmd = formatYmdInZone(now, tz);
  const firstYmd = schedule[0].gregorianYmd;
  const lastYmd = schedule[schedule.length - 1].gregorianYmd;

  if (todayYmd < firstYmd) {
    const startAt = toZonedDateTime(firstYmd, schedule[0].sehriEnd, tz);
    const diffMs = Math.max(0, startAt.getTime() - now.getTime());
    const daysUntilStart = Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
    return {
      phase: 'before',
      daysUntilStart,
      nextEvent: {
        label: 'Sehri',
        at: startAt,
        inMs: diffMs,
        progressPercent: 0,
      },
    };
  }

  if (todayYmd > lastYmd) {
    return { phase: 'after' };
  }

  const todayIdx = schedule.findIndex((d) => d.gregorianYmd === todayYmd);
  const todayEntry = todayIdx >= 0 ? schedule[todayIdx] : schedule[0];
  const sehriAt = toZonedDateTime(todayEntry.gregorianYmd, todayEntry.sehriEnd, tz);
  const iftarAt = toZonedDateTime(todayEntry.gregorianYmd, todayEntry.iftar, tz);

  if (now.getTime() < sehriAt.getTime()) {
    const prevYmd =
      todayIdx > 0
        ? schedule[todayIdx - 1].gregorianYmd
        : formatYmdInZone(new Date(sehriAt.getTime() - 24 * 60 * 60 * 1000), tz);
    const prevIftarStr = todayIdx > 0 ? schedule[todayIdx - 1].iftar : todayEntry.iftar;
    const prevIftarAt = toZonedDateTime(prevYmd, prevIftarStr, tz);
    const span = Math.max(1, sehriAt.getTime() - prevIftarAt.getTime());
    const progressPercent = Math.max(
      0,
      Math.min(100, ((now.getTime() - prevIftarAt.getTime()) / span) * 100)
    );
    return {
      phase: 'during',
      currentDay: todayEntry.dayNumber,
      nextEvent: {
        label: 'Sehri',
        at: sehriAt,
        inMs: sehriAt.getTime() - now.getTime(),
        progressPercent,
      },
    };
  }

  if (now.getTime() < iftarAt.getTime()) {
    const span = Math.max(1, iftarAt.getTime() - sehriAt.getTime());
    const progressPercent = Math.max(
      0,
      Math.min(100, ((now.getTime() - sehriAt.getTime()) / span) * 100)
    );
    return {
      phase: 'during',
      currentDay: todayEntry.dayNumber,
      nextEvent: {
        label: 'Iftar',
        at: iftarAt,
        inMs: iftarAt.getTime() - now.getTime(),
        progressPercent,
      },
    };
  }

  const nextDay = todayIdx >= 0 && todayIdx + 1 < schedule.length ? schedule[todayIdx + 1] : null;
  if (!nextDay) {
    return { phase: 'after', currentDay: todayEntry.dayNumber };
  }

  const nextSehriAt = toZonedDateTime(nextDay.gregorianYmd, nextDay.sehriEnd, tz);
  const span = Math.max(1, nextSehriAt.getTime() - iftarAt.getTime());
  const progressPercent = Math.max(
    0,
    Math.min(100, ((now.getTime() - iftarAt.getTime()) / span) * 100)
  );
  return {
    phase: 'during',
    currentDay: todayEntry.dayNumber,
    nextEvent: {
      label: 'Sehri',
      at: nextSehriAt,
      inMs: nextSehriAt.getTime() - now.getTime(),
      progressPercent,
    },
  };
};
