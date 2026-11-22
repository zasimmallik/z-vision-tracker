import React, { useMemo } from 'react';
import {
  formatCountdown,
  generateRamadanSchedule,
  getCurrentHijriYear,
  getRamadanLiveStatus,
  safeTimezone,
} from '@z-vision/shared';
import { useVisionData } from '../../app/providers/VisionDataContext';
import { useNow } from '../../shared/hooks/useNow';
import { useMidnightKey } from '../../shared/hooks/useMidnightKey';
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MapPinIcon,
  MoonStarIcon,
} from '../../shared/components/Icons';

const formatDurationShort = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
};

const formatZoneYmd = (date: Date, timeZone: string): string => {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '01';
    return `${get('year')}-${get('month')}-${get('day')}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
};

export const RamadanCalendarCard: React.FC = () => {
  const { ramadan, settings, updateRamadan } = useVisionData();
  const prayer = settings.prayer;
  const timeZone = useMemo(() => safeTimezone(prayer.timezone), [prayer.timezone]);
  const now = useNow(15_000);
  const midnightKey = useMidnightKey(timeZone);

  const todayYmd = useMemo(() => {
    void midnightKey;
    return formatZoneYmd(new Date(), timeZone);
  }, [midnightKey, timeZone]);

  const schedule = useMemo(
    () => generateRamadanSchedule(ramadan.hijriYear, ramadan.hijriOffset, prayer),
    [ramadan.hijriYear, ramadan.hijriOffset, prayer]
  );

  const liveStatus = useMemo(
    () => getRamadanLiveStatus(schedule, now, timeZone),
    [schedule, now, timeZone]
  );

  const fastedCount = useMemo(() => {
    let count = 0;
    for (const day of schedule) {
      const key = `${ramadan.hijriYear}-${day.dayNumber}`;
      if (ramadan.fastedDays[key]) count++;
    }
    return count;
  }, [schedule, ramadan.hijriYear, ramadan.fastedDays]);

  const fastedPercent = Math.round((fastedCount / 30) * 100);

  const handleToggleDay = (dayNumber: number) => {
    const key = `${ramadan.hijriYear}-${dayNumber}`;
    const nextFasted = {
      ...ramadan.fastedDays,
      [key]: !ramadan.fastedDays[key],
    };
    if (!nextFasted[key]) {
      delete nextFasted[key];
    }
    void updateRamadan({ ...ramadan, fastedDays: nextFasted });
  };

  const handleOffsetChange = (delta: -1 | 1) => {
    const nextOffset = Math.max(-2, Math.min(2, ramadan.hijriOffset + delta));
    if (nextOffset === ramadan.hijriOffset) return;
    void updateRamadan({ ...ramadan, hijriOffset: nextOffset });
  };

  const handleYearChange = (delta: -1 | 1) => {
    const nextYear = Math.max(1400, Math.min(1600, ramadan.hijriYear + delta));
    if (nextYear === ramadan.hijriYear) return;
    void updateRamadan({ ...ramadan, hijriYear: nextYear });
  };

  const currentHijriYear = useMemo(
    () => getCurrentHijriYear(now, timeZone),
    [now, timeZone]
  );

  return (
    <div className="flex flex-col gap-3.5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="section-heading">
          <MoonStarIcon />
          <span>Ramadan calendar</span>
        </h2>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-raised)] text-[11px] text-[var(--text-secondary)] max-w-[130px]">
            <MapPinIcon className="w-3 h-3 text-[var(--accent)] shrink-0" />
            <span className="truncate">{prayer.cityName}</span>
          </span>

          <div className="inline-flex items-center rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-raised)]">
            <button
              type="button"
              onClick={() => handleYearChange(-1)}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              aria-label="Previous Hijri year"
            >
              <ChevronLeftIcon className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 text-xs font-mono tabular-nums text-[var(--text-primary)]">
              {ramadan.hijriYear} H
            </span>
            <button
              type="button"
              onClick={() => handleYearChange(1)}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              aria-label="Next Hijri year"
            >
              <ChevronRightIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Live Status & Offset Controls */}
      <div className="surface-raised p-3 flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
            {liveStatus.phase === 'during' && liveStatus.nextEvent ? (
              <span className="text-[var(--text-secondary)]">
                Day{' '}
                <strong className="font-mono text-[var(--text-primary)]">
                  {liveStatus.currentDay}
                </strong>{' '}
                · Next: <strong className="text-[var(--text-primary)]">{liveStatus.nextEvent.label}</strong>
              </span>
            ) : liveStatus.phase === 'before' ? (
              <span className="text-[var(--text-secondary)]">
                Starts in{' '}
                <strong className="font-mono text-[var(--text-primary)]">
                  {liveStatus.daysUntilStart ?? 0}d
                </strong>
              </span>
            ) : (
              <span className="text-[var(--text-secondary)]">
                Ramadan {ramadan.hijriYear} H complete
                {ramadan.hijriYear <= currentHijriYear && (
                  <button
                    type="button"
                    onClick={() =>
                      void updateRamadan({
                        ...ramadan,
                        hijriYear: currentHijriYear + 1,
                      })
                    }
                    className="ml-2 text-[var(--accent)] hover:underline cursor-pointer"
                  >
                    View {currentHijriYear + 1} H
                  </button>
                )}
              </span>
            )}
          </div>

          {liveStatus.nextEvent && (
            <span className="text-xs font-mono tabular-nums font-medium text-[var(--accent)]">
              in {formatCountdown(liveStatus.nextEvent.inMs)}
            </span>
          )}
        </div>

        {liveStatus.phase === 'during' && liveStatus.nextEvent && (
          <div className="horizon-track">
            <div
              className="horizon-fill"
              style={{
                transform: `scaleX(${Math.max(0, Math.min(1, liveStatus.nextEvent.progressPercent / 100))})`,
              }}
            />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--border-hairline)] text-[11px]">
          <span className="text-[var(--text-muted)]">
            Moon sighting adjustment:{' '}
            <span className="font-mono text-[var(--text-secondary)]">
              {ramadan.hijriOffset > 0 ? `+${ramadan.hijriOffset}` : ramadan.hijriOffset}d
            </span>
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleOffsetChange(-1)}
              disabled={ramadan.hijriOffset <= -2}
              className="px-2 py-0.5 rounded border border-[var(--border-hairline)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40 cursor-pointer font-mono"
            >
              -1d
            </button>
            <button
              type="button"
              onClick={() => handleOffsetChange(1)}
              disabled={ramadan.hijriOffset >= 2}
              className="px-2 py-0.5 rounded border border-[var(--border-hairline)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40 cursor-pointer font-mono"
            >
              +1d
            </button>
          </div>
        </div>
      </div>

      {/* Fasting Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--text-muted)]">Fasting progress</span>
          <span className="font-mono tabular-nums text-[var(--text-secondary)]">
            {fastedCount} / 30 days · {fastedPercent}%
          </span>
        </div>
        <div className="horizon-track">
          <div
            className="horizon-fill"
            style={{ transform: `scaleX(${fastedPercent / 100})` }}
          />
        </div>
      </div>

      {/* 30-Day Schedule Table */}
      <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-raised)]/50 overflow-hidden">
        <div className="grid grid-cols-[2.5rem_1fr_4.5rem_4.5rem_3.75rem_2.5rem] items-center gap-1 px-3 py-2 border-b border-[var(--border-hairline)] bg-[var(--bg-raised)] text-[11px] font-medium text-[var(--text-muted)]">
          <span>Day</span>
          <span>Date</span>
          <span>Sehri</span>
          <span>Iftar</span>
          <span className="hidden sm:inline">Fast</span>
          <span className="sm:hidden">Dur.</span>
          <span className="text-right">Done</span>
        </div>

        <div className="max-h-72 overflow-y-auto scrollbar-hide divide-y divide-[var(--border-hairline)]">
          {schedule.map((day) => {
            const key = `${ramadan.hijriYear}-${day.dayNumber}`;
            const isFasted = Boolean(ramadan.fastedDays[key]);
            const isToday = day.gregorianYmd === todayYmd;

            return (
              <div
                key={day.dayNumber}
                className={`grid grid-cols-[2.5rem_1fr_4.5rem_4.5rem_3.75rem_2.5rem] items-center gap-1 px-3 py-2 text-xs transition-colors ${
                  isToday
                    ? 'bg-[var(--accent-soft)]'
                    : 'hover:bg-[var(--bg-raised)]/60'
                }`}
              >
                <span
                  className={`font-mono tabular-nums font-medium ${
                    isToday ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {String(day.dayNumber).padStart(2, '0')}
                </span>
                <span
                  className={`truncate ${
                    isToday
                      ? 'text-[var(--text-primary)] font-medium'
                      : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {day.gregorianLabel}
                </span>
                <span className="font-mono tabular-nums text-[var(--text-primary)]">
                  {day.sehriEnd12}
                </span>
                <span className="font-mono tabular-nums text-[var(--text-primary)]">
                  {day.iftar12}
                </span>
                <span className="font-mono tabular-nums text-[11px] text-[var(--text-muted)]">
                  {formatDurationShort(day.fastingDurationMinutes)}
                </span>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleToggleDay(day.dayNumber)}
                    aria-pressed={isFasted}
                    aria-label={`Toggle fasted for Day ${day.dayNumber}`}
                    className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors ${
                      isFasted
                        ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-fg)]'
                        : 'border-[var(--border-strong)] hover:border-[var(--accent)] bg-transparent'
                    }`}
                  >
                    {isFasted && <CheckIcon className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RamadanCalendarCard;
