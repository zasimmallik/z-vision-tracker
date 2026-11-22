import React, { useMemo } from 'react';
import {
  calculateTimeRemaining,
  formatDateRange,
  stripDecorativeSymbols,
  type MilestoneColor,
  type MilestoneIcon,
} from '@z-vision/shared';
import { useNow } from '../../shared/hooks/useNow';
import {
  ClockIcon,
  TargetIcon,
  FlagIcon,
  AlertCircleIcon,
  EditIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '../../shared/components/Icons';

interface DynamicMilestoneProps {
  title: string;
  startDate: string | Date;
  endDate: string | Date;
  icon?: MilestoneIcon;
  color?: MilestoneColor;
  showTotalWeeksSummary?: boolean;
  density?: 0 | 1 | 2 | 3;
  isEditMode?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

type MilestonePalette = {
  title: string;
  icon: string;
  border: string;
  tag: string;
};

const getMilestonePalette = (
  color: DynamicMilestoneProps['color'],
  cleanTitle: string
): MilestonePalette => {
  let resolved = color;
  if (!resolved) {
    const lower = cleanTitle.toLowerCase();
    if (lower.includes('vision')) resolved = 'green';
    else resolved = 'white';
  }

  switch (resolved) {
    case 'light-blue':
    case 'cyan':
      return {
        title: 'text-sky-600 dark:text-[#7dd3fc]',
        icon: 'text-sky-500 dark:text-[#7dd3fc]',
        border: 'border-sky-500/55 dark:border-[#7dd3fc]/50',
        tag: 'text-sky-600 dark:text-[#7dd3fc]',
      };
    case 'blue':
      return {
        title: 'text-blue-700 dark:text-[#3b82f6]',
        icon: 'text-blue-600 dark:text-[#3b82f6]',
        border: 'border-blue-600/55 dark:border-[#3b82f6]/55',
        tag: 'text-blue-700 dark:text-[#3b82f6]',
      };
    case 'dark-blue':
    case 'purple':
      return {
        title: 'text-blue-950 dark:text-[#2563eb]',
        icon: 'text-blue-900 dark:text-[#1d4ed8]',
        border: 'border-blue-900/60 dark:border-[#1d4ed8]/70',
        tag: 'text-blue-950 dark:text-[#2563eb]',
      };
    case 'green':
      return {
        title: 'text-emerald-700 dark:text-emerald-400',
        icon: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-700/45 dark:border-emerald-400/45',
        tag: 'text-emerald-700 dark:text-emerald-400',
      };
    case 'white':
    default:
      return {
        title: 'text-[var(--text-primary)]',
        icon: 'text-[var(--text-secondary)]',
        border: 'border-zinc-500/35 dark:border-white/25',
        tag: 'text-[var(--text-muted)]',
      };
  }
};

const DynamicMilestone: React.FC<DynamicMilestoneProps> = ({
  title,
  startDate,
  endDate,
  icon = 'clock',
  color,
  showTotalWeeksSummary = false,
  isEditMode = false,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
}) => {
  const now = useNow(60_000);
  const timeRemaining = useMemo(
    () => calculateTimeRemaining(endDate, now),
    [endDate, now]
  );

  const cleanTitle = stripDecorativeSymbols(title);
  const isFlagship = color === 'green' || cleanTitle.toLowerCase().includes('vision');
  const palette = getMilestonePalette(color, cleanTitle);

  const renderIcon = () => {
    const cls = `w-4 h-4 shrink-0 ${palette.icon}`;
    switch (icon) {
      case 'target':
        return <TargetIcon className={cls} />;
      case 'zap':
        return <FlagIcon className={cls} />;
      case 'clock':
      default:
        return <ClockIcon className={cls} />;
    }
  };

  const timeUnits = [
    { label: 'Years', value: timeRemaining.years, show: timeRemaining.years > 0 },
    { label: 'Months', value: timeRemaining.months, show: timeRemaining.months > 0 || timeRemaining.years > 0 },
    { label: 'Weeks', value: timeRemaining.weeks, show: true },
    { label: 'Days', value: timeRemaining.days, show: true },
    { label: 'Hours', value: timeRemaining.hours, show: true },
  ].filter((unit) => unit.show);

  return (
    <article className={`surface-card p-4 flex flex-col gap-3 ${palette.border}`}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className={`flex items-center gap-2 text-sm font-medium min-w-0 ${palette.title}`}>
            {renderIcon()}
            <span className="truncate">{cleanTitle}</span>
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            {isFlagship && !isEditMode && (
              <span className={`text-xs font-mono shrink-0 ${palette.tag}`}>Primary</span>
            )}
            {isEditMode && (
              <div className="flex items-center gap-1">
                {onMoveUp && (
                  <button
                    type="button"
                    onClick={onMoveUp}
                    disabled={!canMoveUp}
                    className="p-1 rounded border border-[var(--border-hairline)] bg-[var(--bg-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    aria-label={`Move ${cleanTitle} up`}
                    title="Move up"
                  >
                    <ArrowUpIcon className="w-3.5 h-3.5" />
                  </button>
                )}
                {onMoveDown && (
                  <button
                    type="button"
                    onClick={onMoveDown}
                    disabled={!canMoveDown}
                    className="p-1 rounded border border-[var(--border-hairline)] bg-[var(--bg-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    aria-label={`Move ${cleanTitle} down`}
                    title="Move down"
                  >
                    <ArrowDownIcon className="w-3.5 h-3.5" />
                  </button>
                )}
                {onEdit && (
                  <button
                    type="button"
                    onClick={onEdit}
                    className="p-1 rounded border border-[var(--border-hairline)] bg-[var(--bg-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] cursor-pointer"
                    aria-label={`Edit ${cleanTitle}`}
                    title="Edit countdown"
                  >
                    <EditIcon className="w-3.5 h-3.5" />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={onDelete}
                    className="p-1 rounded border border-[var(--border-hairline)] bg-[var(--bg-raised)] text-[var(--text-muted)] hover:text-[var(--semantic-negative)] hover:border-[var(--semantic-negative-border)] cursor-pointer"
                    aria-label={`Delete ${cleanTitle}`}
                    title="Delete countdown"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <p className="text-xs font-mono text-[var(--text-secondary)] pl-6">
          {formatDateRange(startDate, endDate)}
        </p>
      </div>

      {showTotalWeeksSummary && !timeRemaining.isExpired && (
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-3 py-2 rounded-lg bg-[var(--bg-raised)] border border-[var(--border-hairline)] text-xs">
          <div className="font-mono tabular-nums text-[var(--text-primary)] font-medium">
            {timeRemaining.years > 0 ? `${timeRemaining.years}y ` : ''}
            {timeRemaining.months > 0
              ? `${timeRemaining.months}m`
              : timeRemaining.years === 0
                ? '0m'
                : ''}
            <span className="font-sans font-normal text-[var(--text-secondary)] ml-1.5">
              remaining
            </span>
          </div>
          <div className="font-mono tabular-nums text-[var(--text-primary)] shrink-0">
            <span>{timeRemaining.totalWeeks}</span>
            <span className="text-[var(--text-secondary)] font-sans ml-0.5 mr-2">weeks</span>
            <span>{timeRemaining.totalDays}</span>
            <span className="text-[var(--text-secondary)] font-sans ml-0.5">days</span>
          </div>
        </div>
      )}

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
            <div
              className={`text-[15px] leading-tight font-mono tabular-nums font-medium ${
                timeRemaining.isExpired ? 'text-[var(--semantic-negative)]' : 'text-[var(--text-primary)]'
              }`}
            >
              {timeRemaining.isExpired ? '0' : unit.value}
            </div>
            <div className="text-[11px] leading-none text-[var(--text-secondary)]">
              {unit.label}
            </div>
          </div>
        ))}
      </div>

      {timeRemaining.isExpired && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--semantic-negative-soft)] border border-[var(--semantic-negative-border)] text-xs text-[var(--semantic-negative)]">
          <AlertCircleIcon className="w-4 h-4 shrink-0" />
          <span>Milestone passed</span>
        </div>
      )}
    </article>
  );
};

export default DynamicMilestone;
