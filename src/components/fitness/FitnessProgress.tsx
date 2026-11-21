import React, { useMemo, useState } from 'react';
import { calculateTimeRemaining } from '../../utils/timeUtils';
import { useNow } from '../../hooks/useNow';
import { useVisionData } from '../../context/VisionDataContext';
import { FitnessDatesModal, FitnessMetricModal } from './FitnessEditorModal';
import { ConfirmDialog } from '../shared/Modal';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarIcon,
  EditIcon,
  PlusIcon,
  TrashIcon,
} from '../shared/Icons';
import type { FitnessMetric, FitnessMetricDirection } from '../../types/vision';

const calculateAgeAtDate = (birthDateStr: string, referenceDate: Date): number => {
  const [birthYear, birthMonth, birthDay] = birthDateStr.split('-').map(Number);
  if (!birthYear || !birthMonth || !birthDay) return 0;
  let age = referenceDate.getFullYear() - birthYear;
  const monthDiff = referenceDate.getMonth() + 1 - birthMonth;
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birthDay)) {
    age--;
  }
  return age;
};

const formatHeightText = (val: string | number, unit?: string): string => {
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^\d.]/g, ''));
  if (isNaN(num) || num <= 0) return String(val);
  const inchesTotal = num / 2.54;
  const feet = Math.floor(inchesTotal / 12);
  const inches = Math.round(inchesTotal % 12);
  const ftInStr =
    inches === 12
      ? `${feet + 1} ft`
      : inches === 0
        ? `${feet} ft`
        : `${feet} ft ${inches} in`;
  return `${ftInStr}\n${num} ${unit || 'cm'}`;
};

const formatWeightText = (val: string | number): string => {
  const valStr = String(val).trim();

  const rangeMatch = valStr.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*kg/i);
  if (rangeMatch) {
    const minKg = parseFloat(rangeMatch[1]);
    const maxKg = parseFloat(rangeMatch[2]);
    const minLb = Math.round(minKg * 2.20462);
    const maxLb = Math.round(maxKg * 2.20462);
    return `${minKg}–${maxKg} kg\n${minLb}–${maxLb} lb`;
  }

  const singleMatch = valStr.match(/(\d+(?:\.\d+)?)\s*kg/i);
  if (singleMatch) {
    const kg = parseFloat(singleMatch[1]);
    const lb = Math.round(kg * 2.20462);
    return `${kg} kg\n${lb} lb`;
  }

  if (typeof val === 'number') {
    const lb = Math.round(val * 2.20462);
    return `${val} kg\n${lb} lb`;
  }

  return valStr;
};

const renderMetricValue = (
  val: string | number,
  label: string,
  isTarget: boolean,
  unit?: string
): React.ReactNode => {
  if (label === 'Height') {
    const text = formatHeightText(val, unit);
    if (text.includes('\n')) {
      const [primary, secondary] = text.split('\n');
      return (
        <>
          <span>{primary}</span>
          <span className="block text-xs font-normal text-[var(--text-muted)] mt-0.5">
            {secondary}
          </span>
        </>
      );
    }
    return text;
  }

  if (label === 'Weight') {
    const text = formatWeightText(val);
    if (text.includes('\n')) {
      const [primary, secondary] = text.split('\n');
      return (
        <>
          <span>{primary}</span>
          <span className="block text-xs font-normal text-[var(--text-muted)] mt-0.5">
            {secondary}
          </span>
        </>
      );
    }
    return text;
  }

  return (
    <>
      {val}
      {typeof val === 'number' && unit && (
        <span className={isTarget ? 'text-[var(--text-muted)]' : 'text-xs font-normal text-[var(--text-muted)] ml-1'}>
          {isTarget ? ' ' : ''}
          {unit}
        </span>
      )}
    </>
  );
};

const resolveDirection = (metric: FitnessMetric): FitnessMetricDirection => {
  if (metric.direction) return metric.direction;
  if (metric.label === 'Height') return 'static';
  if (['Body Fat', 'Waist'].includes(metric.label)) return 'decrease';
  return 'increase';
};

const FitnessProgress: React.FC = () => {
  const { fitness: fitnessData, loading, isEditMode, updateFitness } = useVisionData();
  const now = useNow(60_000);

  const [datesModalOpen, setDatesModalOpen] = useState(false);
  const [metricModalState, setMetricModalState] = useState<{
    open: boolean;
    editing: FitnessMetric | null;
  }>({ open: false, editing: null });
  const [deletingMetric, setDeletingMetric] = useState<FitnessMetric | null>(null);

  const timeRemaining = useMemo(
    () => (fitnessData?.targetDate ? calculateTimeRemaining(fitnessData.targetDate, now) : null),
    [fitnessData?.targetDate, now]
  );

  const nextMetricId = useMemo(() => {
    const numericIds = fitnessData.metrics
      .map((m) => (typeof m.id === 'number' ? m.id : parseInt(String(m.id), 10)))
      .filter((n) => !Number.isNaN(n));
    return (numericIds.length > 0 ? Math.max(...numericIds) : 0) + 1;
  }, [fitnessData.metrics]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-10 rounded-lg bg-[var(--bg-raised)]" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-24 rounded-lg bg-[var(--bg-raised)]" />
          ))}
        </div>
      </div>
    );
  }

  const calculateProgress = (
    current: string | number,
    target: string | number,
    direction: FitnessMetricDirection
  ): { percent: number; isComplete: boolean } => {
    const getValue = (val: string | number): number => {
      if (typeof val === 'number') return val;
      const match = val.match(/(\d+(?:\.\d+)?)/);
      return match ? parseFloat(match[1]) : 0;
    };

    const currentNum = getValue(current);

    let targetMin = 0;
    let targetMax = 0;

    if (typeof target === 'number') {
      targetMin = target;
      targetMax = target;
    } else {
      const rangeMatch = target.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
      if (rangeMatch) {
        targetMin = parseFloat(rangeMatch[1]);
        targetMax = parseFloat(rangeMatch[2]);
      } else {
        targetMin = getValue(target);
        targetMax = targetMin;
      }
    }

    if (direction === 'static') return { percent: 100, isComplete: true };
    if (isNaN(currentNum) || targetMin === 0 || currentNum <= 0) {
      return { percent: 0, isComplete: false };
    }

    if (direction === 'decrease') {
      const isComplete = currentNum <= targetMax;
      const percent = Math.min((targetMax / currentNum) * 100, 100);
      return { percent, isComplete };
    } else {
      const isComplete = currentNum >= targetMin;
      const percent = Math.min((currentNum / targetMin) * 100, 100);
      return { percent, isComplete };
    }
  };

  const handleSaveDates = async (birthDate: string, targetDate: string) => {
    await updateFitness({
      ...fitnessData,
      birthDate: birthDate || undefined,
      targetDate,
    });
  };

  const handleSaveMetric = async (saved: FitnessMetric) => {
    const exists = fitnessData.metrics.some((m) => String(m.id) === String(saved.id));
    const nextMetrics = exists
      ? fitnessData.metrics.map((m) => (String(m.id) === String(saved.id) ? saved : m))
      : [...fitnessData.metrics, saved];
    await updateFitness({ ...fitnessData, metrics: nextMetrics });
  };

  const handleMoveMetric = (idx: number, delta: -1 | 1) => {
    const target = idx + delta;
    if (target < 0 || target >= fitnessData.metrics.length) return;
    const copy = [...fitnessData.metrics];
    [copy[idx], copy[target]] = [copy[target], copy[idx]];
    void updateFitness({ ...fitnessData, metrics: copy });
  };

  const handleDeleteMetric = async () => {
    if (!deletingMetric) return;
    const nextMetrics = fitnessData.metrics.filter(
      (m) => String(m.id) !== String(deletingMetric.id)
    );
    await updateFitness({ ...fitnessData, metrics: nextMetrics });
    setDeletingMetric(null);
  };

  const timeUnits = timeRemaining
    ? [
        { label: 'Years', value: timeRemaining.years, show: timeRemaining.years > 0 },
        { label: 'Months', value: timeRemaining.months, show: timeRemaining.months > 0 || timeRemaining.years > 0 },
        { label: 'Weeks', value: timeRemaining.weeks, show: true },
        { label: 'Days', value: timeRemaining.days, show: true },
        { label: 'Hours', value: timeRemaining.hours, show: true },
      ].filter((unit) => unit.show)
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-[var(--text-muted)]">Target date</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[var(--text-secondary)]">
            {new Date(fitnessData.targetDate).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          {isEditMode && (
            <button
              type="button"
              onClick={() => setDatesModalOpen(true)}
              className="px-2 py-1 rounded border border-[var(--border-hairline)] bg-[var(--bg-raised)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer inline-flex items-center gap-1"
            >
              <CalendarIcon className="w-3 h-3" />
              <span>Edit dates</span>
            </button>
          )}
        </div>
      </div>

      {timeRemaining && !timeRemaining.isExpired && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[var(--bg-raised)] border border-[var(--border-hairline)] text-xs">
            <div className="font-mono tabular-nums text-[var(--text-primary)] font-medium">
              {timeRemaining.years > 0 ? `${timeRemaining.years}y ` : ''}
              {timeRemaining.months > 0 ? `${timeRemaining.months}m` : timeRemaining.years === 0 ? '0m' : ''}
              <span className="font-sans font-normal text-[var(--text-secondary)] ml-1.5">
                remaining
              </span>
            </div>
            <div className="font-mono tabular-nums text-[var(--text-primary)]">
              <span>{timeRemaining.totalWeeks}</span>
              <span className="text-[var(--text-secondary)] font-sans ml-0.5 mr-2">weeks</span>
              <span>{timeRemaining.totalDays}</span>
              <span className="text-[var(--text-secondary)] font-sans ml-0.5">days</span>
            </div>
          </div>

          <div
            className={`grid gap-1.5 ${
              timeUnits.length === 5
                ? 'grid-cols-5'
                : timeUnits.length === 4
                  ? 'grid-cols-4'
                  : 'grid-flow-col auto-cols-fr'
            }`}
          >
            {timeUnits.map((unit) => (
              <div
                key={unit.label}
                className="surface-raised py-2 px-1 text-center flex flex-col items-center justify-center gap-0.5 min-w-0"
              >
                <div className="text-sm font-mono tabular-nums font-medium text-[var(--text-primary)] leading-tight">
                  {unit.value}
                </div>
                <div className="text-[11px] leading-none text-[var(--text-secondary)]">
                  {unit.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {fitnessData.metrics.length === 0 ? (
        <div className="surface-raised p-5 text-center space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              No fitness metrics yet
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Track weight, body fat, workouts, steps, or any custom physical target.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMetricModalState({ open: true, editing: null })}
            className="btn-primary h-9 px-4 text-xs"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Add your first metric</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {fitnessData.metrics.map((metric, idx) => {
          const isAge = metric.label === 'Age';
          const resolvedCurrent =
            isAge && fitnessData.birthDate
              ? calculateAgeAtDate(fitnessData.birthDate, now)
              : metric.current;
          const resolvedTarget =
            isAge && fitnessData.birthDate && fitnessData.targetDate
              ? calculateAgeAtDate(fitnessData.birthDate, new Date(fitnessData.targetDate))
              : metric.target;

          const direction = resolveDirection(metric);
          const isStatic = direction === 'static';
          const { percent, isComplete } = calculateProgress(
            resolvedCurrent,
            resolvedTarget,
            direction
          );

          return (
            <div
              key={metric.id}
              className="surface-raised p-3 sm:p-4 flex flex-col justify-between gap-3"
            >
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-xs font-medium text-[var(--text-secondary)] truncate">
                    {metric.label}
                  </span>
                  {!isStatic && !isEditMode && (
                    <span
                      className={`text-xs font-mono tabular-nums font-medium shrink-0 ${
                        isComplete
                          ? 'text-[var(--accent)]'
                          : 'text-sky-700 dark:text-sky-300'
                      }`}
                    >
                      {Math.round(percent)}%
                    </span>
                  )}
                  {isEditMode && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveMetric(idx, -1)}
                        disabled={idx === 0}
                        className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer"
                        aria-label={`Move ${metric.label} up`}
                      >
                        <ArrowUpIcon className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveMetric(idx, 1)}
                        disabled={idx === fitnessData.metrics.length - 1}
                        className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer"
                        aria-label={`Move ${metric.label} down`}
                      >
                        <ArrowDownIcon className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setMetricModalState({ open: true, editing: metric })}
                        className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                        aria-label={`Edit ${metric.label}`}
                      >
                        <EditIcon className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingMetric(metric)}
                        className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--semantic-negative)] cursor-pointer"
                        aria-label={`Delete ${metric.label}`}
                      >
                        <TrashIcon className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="text-sm sm:text-base font-mono tabular-nums font-medium text-[var(--text-primary)] leading-snug">
                  {renderMetricValue(resolvedCurrent, metric.label, false, metric.unit)}
                </div>

                {!isStatic && (
                  <div className="text-xs text-[var(--text-muted)]">
                    Target:{' '}
                    <span className="font-mono tabular-nums text-[var(--text-secondary)]">
                      {renderMetricValue(resolvedTarget, metric.label, true, metric.unit)}
                    </span>
                  </div>
                )}
              </div>

              {!isStatic && (
                <div className="h-2 w-full rounded-full bg-[var(--track-bg)] border border-[var(--border-hairline)] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-transform duration-300 origin-left ${
                      isComplete ? 'bg-[var(--accent)]' : 'bg-sky-600 dark:bg-sky-400'
                    }`}
                    style={{ transform: `scaleX(${Math.max(0, Math.min(1, percent / 100))})` }}
                  />
                </div>
              )}
            </div>
          );
        })}
        </div>
      )}

      {isEditMode && fitnessData.metrics.length > 0 && (
        <button
          type="button"
          onClick={() => setMetricModalState({ open: true, editing: null })}
          className="w-full py-2.5 rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--bg-raised)]/40 hover:bg-[var(--bg-raised)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span>Add fitness metric</span>
        </button>
      )}

      <FitnessDatesModal
        open={datesModalOpen}
        birthDate={fitnessData.birthDate ?? ''}
        targetDate={fitnessData.targetDate}
        onClose={() => setDatesModalOpen(false)}
        onSave={handleSaveDates}
      />

      <FitnessMetricModal
        open={metricModalState.open}
        initial={metricModalState.editing}
        nextId={nextMetricId}
        onClose={() => setMetricModalState({ open: false, editing: null })}
        onSave={handleSaveMetric}
      />

      <ConfirmDialog
        open={deletingMetric !== null}
        title="Delete Fitness Metric"
        description={`Remove "${deletingMetric?.label ?? ''}" from Fitness Progress?`}
        onCancel={() => setDeletingMetric(null)}
        onConfirm={handleDeleteMetric}
      />
    </div>
  );
};

export default FitnessProgress;
