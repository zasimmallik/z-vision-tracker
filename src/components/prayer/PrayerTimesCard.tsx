import React, { useState, useEffect, useMemo } from 'react';
import {
  Coordinates,
  CalculationMethod,
  Madhab,
  PrayerTimes,
  Qibla,
  SunnahTimes,
} from 'adhan';
import { formatCountdown } from '../../utils/timeUtils';
import {
  PRAYER_CALC_METHOD_OPTIONS,
  formatQiblaBearing,
} from '../../utils/prayerGeo';
import { useVisionData } from '../../context/VisionDataContext';
import { Modal } from '../shared/Modal';
import { PrayerLocationPicker } from './PrayerLocationPicker';
import {
  SunIcon,
  SunriseIcon,
  SunsetIcon,
  MoonIcon,
  CloudSunIcon,
  MapPinIcon,
  CompassIcon,
} from '../shared/Icons';
import type {
  PrayerCalculationMethodKey,
  PrayerSettings,
} from '../../types/vision';

interface PrayerTimings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Sunset: string;
  Maghrib: string;
  Isha: string;
  Midnight?: string;
  Tahajjud?: string;
}

interface NextPrayerInfo {
  name: string;
  at: Date;
  inMs: number;
}

type PrayerTimesCacheEntry = {
  ymd: string;
  timings: PrayerTimings;
  savedAt: number;
  source: 'api' | 'local';
};

const PRAYER_TIMES_CACHE_KEY_PREFIX = 'zvision:prayerTimes:v3';

const getAladhanMethodId = (method: PrayerCalculationMethodKey): string => {
  const found = PRAYER_CALC_METHOD_OPTIONS.find((m) => m.value === method);
  return found?.aladhanId ?? '3';
};

const getAdhanParams = (
  method: PrayerCalculationMethodKey,
  madhab: 'Hanafi' | 'Shafi'
) => {
  const params = (() => {
    switch (method) {
      case 'Karachi':
        return CalculationMethod.Karachi();
      case 'NorthAmerica':
        return CalculationMethod.NorthAmerica();
      case 'UmmAlQura':
        return CalculationMethod.UmmAlQura();
      case 'Egyptian':
        return CalculationMethod.Egyptian();
      case 'Turkey':
        return CalculationMethod.Turkey();
      case 'Singapore':
        return CalculationMethod.Singapore();
      case 'Dubai':
        return CalculationMethod.Dubai();
      case 'Qatar':
        return CalculationMethod.Qatar();
      case 'Kuwait':
        return CalculationMethod.Kuwait();
      case 'MoonsightingCommittee':
        return CalculationMethod.MoonsightingCommittee();
      case 'Tehran':
        return CalculationMethod.Tehran();
      case 'MuslimWorldLeague':
      default:
        return CalculationMethod.MuslimWorldLeague();
    }
  })();

  params.madhab = madhab === 'Shafi' ? Madhab.Shafi : Madhab.Hanafi;
  return params;
};

const safeTimezone = (tz: string): string => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
};

const formatYmdInZone = (date: Date, timeZone: string): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '01';
  return `${get('year')}-${get('month')}-${get('day')}`;
};

const formatHijriDate = (date: Date, timeZone: string): string | null => {
  try {
    return new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      timeZone,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    try {
      return new Intl.DateTimeFormat('en-u-ca-islamic', {
        timeZone,
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(date);
    } catch {
      return null;
    }
  }
};

const getTimezoneOffsetMs = (date: Date, timeZone: string): number => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
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

const shiftYmd = (
  ymd: string,
  deltaDays: number,
  timeZone: string
): { ymd: string; date: Date } => {
  const noon = toZonedDateTime(ymd, '12:00', timeZone);
  const shifted = new Date(noon.getTime() + deltaDays * 24 * 60 * 60 * 1000);
  const nextYmd = formatYmdInZone(shifted, timeZone);
  return { ymd: nextYmd, date: toZonedDateTime(nextYmd, '12:00', timeZone) };
};

const PrayerTimesCard: React.FC = () => {
  const { settings, updateSettings } = useVisionData();
  const prayerConfig = settings.prayer;

  const [prayerTimes, setPrayerTimes] = useState<PrayerTimings | null>(null);
  const [nextPrayer, setNextPrayer] = useState<NextPrayerInfo | null>(null);
  const [activePrayer, setActivePrayer] = useState<string | null>(null);
  const [activeProgress, setActiveProgress] = useState<number>(0);

  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [draftPrayer, setDraftPrayer] = useState<PrayerSettings>(prayerConfig);
  const [savingLocation, setSavingLocation] = useState(false);

  const timingsRef = React.useRef<PrayerTimings | null>(null);

  useEffect(() => {
    if (locationModalOpen) {
      setDraftPrayer(prayerConfig);
    }
  }, [locationModalOpen, prayerConfig]);

  const timeZone = useMemo(
    () => safeTimezone(prayerConfig.timezone),
    [prayerConfig.timezone]
  );

  const qiblaDegrees = useMemo(() => {
    const lat = Number.isFinite(prayerConfig.latitude) ? prayerConfig.latitude : 22.701;
    const lng = Number.isFinite(prayerConfig.longitude) ? prayerConfig.longitude : 90.3535;
    return Qibla(new Coordinates(lat, lng));
  }, [prayerConfig.latitude, prayerConfig.longitude]);

  const hijriDate = useMemo(
    () => formatHijriDate(new Date(), timeZone),
    [timeZone]
  );

  const activeMethodShort = useMemo(() => {
    const found = PRAYER_CALC_METHOD_OPTIONS.find(
      (m) => m.value === prayerConfig.calculationMethod
    );
    return found?.shortLabel ?? prayerConfig.calculationMethod;
  }, [prayerConfig.calculationMethod]);

  useEffect(() => {
    const lat = Number.isFinite(prayerConfig.latitude) ? prayerConfig.latitude : 22.701;
    const lng = Number.isFinite(prayerConfig.longitude) ? prayerConfig.longitude : 90.3535;
    const coordinates = new Coordinates(lat, lng);

    const getTodayInZone = () => {
      const ymd = formatYmdInZone(new Date(), timeZone);
      return { ymd, date: toZonedDateTime(ymd, '12:00', timeZone) };
    };

    const sanitizeHHmm = (value: string): string => {
      const match = value.match(/^(\d{1,2}):(\d{2})/);
      if (!match) return value;
      return `${match[1].padStart(2, '0')}:${match[2]}`;
    };

    const fmtHHmm = (d: Date) =>
      new Intl.DateTimeFormat('en-GB', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(d);

    const computeFromLocalLibrary = (zoneDate: Date) => {
      const params = getAdhanParams(prayerConfig.calculationMethod, prayerConfig.madhab);
      const times = new PrayerTimes(coordinates, zoneDate, params);
      const sunnah = new SunnahTimes(times);

      return {
        prayerTimes: {
          Fajr: fmtHHmm(times.fajr),
          Sunrise: fmtHHmm(times.sunrise),
          Dhuhr: fmtHHmm(times.dhuhr),
          Asr: fmtHHmm(times.asr),
          Sunset: fmtHHmm(times.sunset),
          Maghrib: fmtHHmm(times.maghrib),
          Isha: fmtHHmm(times.isha),
          Midnight: fmtHHmm(sunnah.middleOfTheNight),
          Tahajjud: fmtHHmm(sunnah.lastThirdOfTheNight),
        },
      };
    };

    const computeNextPrayerFromTimings = (
      ymd: string,
      timings: PrayerTimings
    ): NextPrayerInfo | null => {
      const now = new Date();
      const prayers = [
        { name: 'Fajr', time: toZonedDateTime(ymd, timings.Fajr, timeZone) },
        { name: 'Dhuhr', time: toZonedDateTime(ymd, timings.Dhuhr, timeZone) },
        { name: 'Asr', time: toZonedDateTime(ymd, timings.Asr, timeZone) },
        { name: 'Maghrib', time: toZonedDateTime(ymd, timings.Maghrib, timeZone) },
        { name: 'Isha', time: toZonedDateTime(ymd, timings.Isha, timeZone) },
      ];

      let next = prayers.find((p) => p.time.getTime() > now.getTime());
      if (!next) {
        const tomorrow = shiftYmd(ymd, 1, timeZone);
        const local = computeFromLocalLibrary(tomorrow.date);
        next = {
          name: 'Fajr',
          time: toZonedDateTime(tomorrow.ymd, local.prayerTimes.Fajr, timeZone),
        };
      }

      return next
        ? { name: next.name, at: next.time, inMs: next.time.getTime() - now.getTime() }
        : null;
    };

    const updateActiveInterval = (ymd: string, timings: PrayerTimings) => {
      const now = new Date();
      const FajrDate = toZonedDateTime(ymd, timings.Fajr, timeZone);
      const SunriseDate = toZonedDateTime(ymd, timings.Sunrise, timeZone);
      const DhuhrDate = toZonedDateTime(ymd, timings.Dhuhr, timeZone);
      const AsrDate = toZonedDateTime(ymd, timings.Asr, timeZone);
      const MaghribDate = toZonedDateTime(ymd, timings.Maghrib, timeZone);
      const IshaDate = toZonedDateTime(ymd, timings.Isha, timeZone);

      let activeName = '';
      let start = new Date();
      let end = new Date();

      const nowTime = now.getTime();

      if (nowTime < FajrDate.getTime()) {
        activeName = 'Isha';
        const yesterday = shiftYmd(ymd, -1, timeZone);
        const localPrev = computeFromLocalLibrary(yesterday.date);
        start = toZonedDateTime(yesterday.ymd, localPrev.prayerTimes.Isha, timeZone);
        end = FajrDate;
      } else if (nowTime >= FajrDate.getTime() && nowTime < SunriseDate.getTime()) {
        activeName = 'Fajr';
        start = FajrDate;
        end = SunriseDate;
      } else if (nowTime >= SunriseDate.getTime() && nowTime < DhuhrDate.getTime()) {
        activeName = 'Sunrise';
        start = SunriseDate;
        end = DhuhrDate;
      } else if (nowTime >= DhuhrDate.getTime() && nowTime < AsrDate.getTime()) {
        activeName = 'Dhuhr';
        start = DhuhrDate;
        end = AsrDate;
      } else if (nowTime >= AsrDate.getTime() && nowTime < MaghribDate.getTime()) {
        activeName = 'Asr';
        start = AsrDate;
        end = MaghribDate;
      } else if (nowTime >= MaghribDate.getTime() && nowTime < IshaDate.getTime()) {
        activeName = 'Maghrib';
        start = MaghribDate;
        end = IshaDate;
      } else {
        activeName = 'Isha';
        start = IshaDate;
        const tomorrow = shiftYmd(ymd, 1, timeZone);
        const localTom = computeFromLocalLibrary(tomorrow.date);
        end = toZonedDateTime(tomorrow.ymd, localTom.prayerTimes.Fajr, timeZone);
      }

      const total = Math.max(1, end.getTime() - start.getTime());
      const elapsed = nowTime - start.getTime();
      const progress = Math.max(0, Math.min(100, (elapsed / total) * 100));

      return { activeName, progress };
    };

    const cacheScope = `${lat.toFixed(3)}:${lng.toFixed(3)}:${prayerConfig.calculationMethod}:${prayerConfig.madhab}`;
    const getCacheKey = (ymd: string) =>
      `${PRAYER_TIMES_CACHE_KEY_PREFIX}:${cacheScope}:${ymd}`;

    const readCachedTimings = (ymd: string): PrayerTimings | null => {
      try {
        const raw = window.localStorage.getItem(getCacheKey(ymd));
        if (!raw) return null;
        const parsed = JSON.parse(raw) as PrayerTimesCacheEntry;
        if (!parsed || parsed.ymd !== ymd || !parsed.timings) return null;
        return parsed.timings;
      } catch {
        return null;
      }
    };

    const writeCachedTimings = (
      ymd: string,
      timings: PrayerTimings,
      source: PrayerTimesCacheEntry['source']
    ) => {
      try {
        const entry: PrayerTimesCacheEntry = { ymd, timings, savedAt: Date.now(), source };
        window.localStorage.setItem(getCacheKey(ymd), JSON.stringify(entry));
      } catch {
        // Ignore cache failures
      }
    };

    type AladhanResponse = {
      code: number;
      status: string;
      data?: {
        timings?: Record<string, string>;
      };
    };

    const controller = new AbortController();

    const load = async () => {
      const { date: zoneDate, ymd } = getTodayInZone();
      const local = computeFromLocalLibrary(zoneDate);

      const cached = readCachedTimings(ymd);
      const timingsToUse = cached
        ? {
            ...local.prayerTimes,
            ...cached,
            Midnight: cached.Midnight ?? local.prayerTimes.Midnight,
            Tahajjud: cached.Tahajjud ?? local.prayerTimes.Tahajjud,
          }
        : local.prayerTimes;

      setPrayerTimes(timingsToUse);
      timingsRef.current = timingsToUse;
      setNextPrayer(computeNextPrayerFromTimings(ymd, timingsToUse));
      if (!cached) {
        writeCachedTimings(ymd, timingsToUse, 'local');
      }

      if (timingsToUse) {
        const { activeName, progress } = updateActiveInterval(ymd, timingsToUse);
        setActivePrayer(activeName);
        setActiveProgress(progress);
      }

      try {
        const timestampSeconds = Math.floor(zoneDate.getTime() / 1000);
        const url = new URL(`https://api.aladhan.com/v1/timings/${timestampSeconds}`);
        url.searchParams.set('latitude', String(lat));
        url.searchParams.set('longitude', String(lng));
        url.searchParams.set('method', getAladhanMethodId(prayerConfig.calculationMethod));
        url.searchParams.set('school', prayerConfig.madhab === 'Shafi' ? '0' : '1');
        url.searchParams.set('timezonestring', timeZone);

        const res = await fetch(url.toString(), { signal: controller.signal });
        if (!res.ok) throw new Error(`API status ${res.status}`);
        const json = (await res.json()) as AladhanResponse;
        const timings = json?.data?.timings;
        if (!timings) throw new Error('API missing timings');

        const normalized: PrayerTimings = {
          Fajr: sanitizeHHmm(timings.Fajr ?? ''),
          Sunrise: sanitizeHHmm(timings.Sunrise ?? ''),
          Dhuhr: sanitizeHHmm(timings.Dhuhr ?? ''),
          Asr: sanitizeHHmm(timings.Asr ?? ''),
          Sunset: sanitizeHHmm(timings.Sunset ?? ''),
          Maghrib: sanitizeHHmm(timings.Maghrib ?? ''),
          Isha: sanitizeHHmm(timings.Isha ?? ''),
          Midnight: timings.Midnight
            ? sanitizeHHmm(timings.Midnight)
            : local.prayerTimes.Midnight,
          Tahajjud: timings.Lastthird
            ? sanitizeHHmm(timings.Lastthird)
            : local.prayerTimes.Tahajjud,
        };

        setPrayerTimes(normalized);
        timingsRef.current = normalized;
        setNextPrayer(computeNextPrayerFromTimings(ymd, normalized));
        writeCachedTimings(ymd, normalized, 'api');

        const { activeName, progress } = updateActiveInterval(ymd, normalized);
        setActivePrayer(activeName);
        setActiveProgress(progress);
      } catch {
        // Keep fast local/cached values
      }
    };

    void load();

    const timer = setInterval(() => {
      setNextPrayer((prev) => {
        if (!prev) return prev;
        const diff = prev.at.getTime() - Date.now();
        if (diff <= 0) {
          void load();
          return prev;
        }
        return { ...prev, inMs: diff };
      });

      if (timingsRef.current) {
        const ymd = formatYmdInZone(new Date(), timeZone);
        const { activeName, progress } = updateActiveInterval(ymd, timingsRef.current);
        setActivePrayer(activeName);
        setActiveProgress(progress);
      }
    }, 15_000);

    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [
    prayerConfig.latitude,
    prayerConfig.longitude,
    prayerConfig.calculationMethod,
    prayerConfig.madhab,
    timeZone,
  ]);

  const to12Hour = (hhmm: string | undefined): string | null => {
    if (!hhmm) return null;
    const [hStr, mStr] = hhmm.split(':');
    if (!hStr || !mStr) return hhmm;
    let h = parseInt(hStr, 10);
    const ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${mStr} ${ampm}`;
  };

  const handleSaveLocation = async () => {
    setSavingLocation(true);
    try {
      await updateSettings({
        ...settings,
        prayer: {
          ...draftPrayer,
          cityName: draftPrayer.cityName.trim() || 'Custom',
          latitude: Number(draftPrayer.latitude) || 0,
          longitude: Number(draftPrayer.longitude) || 0,
          timezone: draftPrayer.timezone.trim() || 'UTC',
        },
      });
      setLocationModalOpen(false);
    } finally {
      setSavingLocation(false);
    }
  };

  const prayerIconMap: Record<string, React.ReactNode> = {
    Fajr: <SunriseIcon className="w-4 h-4 shrink-0" />,
    Sunrise: <SunIcon className="w-4 h-4 shrink-0" />,
    Dhuhr: <SunIcon className="w-4 h-4 shrink-0" />,
    Asr: <CloudSunIcon className="w-4 h-4 shrink-0" />,
    Maghrib: <SunsetIcon className="w-4 h-4 shrink-0" />,
    Isha: <MoonIcon className="w-4 h-4 shrink-0" />,
  };

  return (
    <>
      <section className="surface-card p-5 flex flex-col gap-3.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="section-heading">
            <SunIcon />
            <span>Prayer times</span>
          </h2>
          <button
            type="button"
            onClick={() => setLocationModalOpen(true)}
            title="Change city, country, or calculation method"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-raised)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] cursor-pointer transition-colors max-w-[175px]"
          >
            <MapPinIcon className="w-3 h-3 text-[var(--accent)] shrink-0" />
            <span className="truncate">{prayerConfig.cityName}</span>
          </button>
        </div>

        {(hijriDate || Number.isFinite(qiblaDegrees)) && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-muted)]">
            {hijriDate ? <span>{hijriDate}</span> : <span />}
            <span
              className="inline-flex items-center gap-1 font-mono"
              title="Qibla bearing from North"
            >
              <CompassIcon className="w-3 h-3 text-[var(--accent)] shrink-0" />
              <span>Qibla {formatQiblaBearing(qiblaDegrees)}</span>
            </span>
          </div>
        )}

        {nextPrayer && (
          <div className="surface-raised p-3 flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
                <span className="text-xs text-[var(--text-secondary)]">
                  Next:{' '}
                  <span className="font-medium text-[var(--text-primary)]">
                    {nextPrayer.name}
                  </span>
                </span>
              </div>
              <span className="text-xs font-mono tabular-nums font-medium text-[var(--accent)]">
                in {formatCountdown(nextPrayer.inMs)}
              </span>
            </div>

            {activePrayer && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>Current: {activePrayer}</span>
                  <span className="font-mono tabular-nums">
                    {Math.round(activeProgress)}%
                  </span>
                </div>
                <div className="horizon-track">
                  <div
                    className="horizon-fill"
                    style={{
                      transform: `scaleX(${Math.max(0, Math.min(1, activeProgress / 100))})`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {prayerTimes ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {[
                { name: 'Fajr', time: to12Hour(prayerTimes.Fajr) },
                { name: 'Sunrise', time: to12Hour(prayerTimes.Sunrise) },
                { name: 'Dhuhr', time: to12Hour(prayerTimes.Dhuhr) },
                { name: 'Asr', time: to12Hour(prayerTimes.Asr) },
                { name: 'Maghrib', time: to12Hour(prayerTimes.Maghrib) },
                { name: 'Isha', time: to12Hour(prayerTimes.Isha) },
              ].map(({ name, time }) => {
                const isActive = name === activePrayer;
                return (
                  <div
                    key={name}
                    className={`p-3 rounded-lg border flex flex-col gap-1.5 transition-[background-color,border-color] duration-150 ${
                      isActive
                        ? 'bg-[var(--accent-soft)] border-[var(--accent-border)]'
                        : 'bg-[var(--bg-raised)] border-[var(--border-hairline)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-xs ${
                          isActive
                            ? 'text-[var(--accent)] font-medium'
                            : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        {name}
                      </span>
                      <span
                        className={
                          isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'
                        }
                      >
                        {prayerIconMap[name]}
                      </span>
                    </div>
                    <div className="text-sm font-mono tabular-nums font-medium text-[var(--text-primary)]">
                      {time}
                    </div>
                  </div>
                );
              })}
            </div>

            {(prayerTimes.Midnight || prayerTimes.Tahajjud) && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--border-hairline)] text-[11px] text-[var(--text-muted)]">
                <div className="flex items-center gap-3 font-mono tabular-nums">
                  {prayerTimes.Midnight && (
                    <span>
                      Midnight{' '}
                      <span className="text-[var(--text-secondary)]">
                        {to12Hour(prayerTimes.Midnight)}
                      </span>
                    </span>
                  )}
                  {prayerTimes.Tahajjud && (
                    <span>
                      Tahajjud{' '}
                      <span className="text-[var(--text-secondary)]">
                        {to12Hour(prayerTimes.Tahajjud)}
                      </span>
                    </span>
                  )}
                </div>
                <span className="font-mono">
                  {activeMethodShort} · {prayerConfig.madhab}
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-16 rounded-lg bg-[var(--bg-raised)]" />
            ))}
          </div>
        )}
      </section>

      <Modal
        open={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        title="Prayer Location & Method"
        subtitle="Search any city worldwide or detect via GPS."
        maxWidthClass="max-w-lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setLocationModalOpen(false)}
              className="h-9 px-3.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-raised)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSaveLocation()}
              disabled={savingLocation}
              className="btn-primary h-9 text-xs"
            >
              {savingLocation ? 'Saving…' : 'Save location'}
            </button>
          </>
        }
      >
        <PrayerLocationPicker value={draftPrayer} onChange={setDraftPrayer} />
      </Modal>
    </>
  );
};

export default PrayerTimesCard;
