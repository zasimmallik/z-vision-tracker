import React, { useMemo, useState } from 'react';
import {
  calculateTimeRemaining,
  formatStatusLabel,
  stripDecorativeSymbols,
  type Milestone,
  type MilestoneCategory,
  type MilestoneStatus,
  type Mission,
} from '@z-vision/shared';
import { useNow } from '../../shared/hooks/useNow';
import { useVisionData } from '../../app/providers/VisionDataContext';
import { VisionThemeToggle } from '../../shared/components/VisionThemeToggle';
import {
  VisionHeaderModal,
  MissionEditorModal,
  MilestoneEditorModal,
} from './VisionEditors';
import { ConfirmDialog } from '../../shared/components/Modal';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  EditIcon,
  PlusIcon,
  TrashIcon,
} from '../../shared/components/Icons';

const resolveMilestoneCategory = (milestone: Milestone): MilestoneCategory => {
  if (milestone.category) return milestone.category;
  const lower = milestone.title.toLowerCase();
  if (/\b(mrr|arr|revenue)\b/i.test(milestone.title)) return 'revenue';
  if (lower.includes('net worth') || lower.includes('savings runway')) return 'net-worth';
  return 'default';
};

const getMilestoneCategoryStyles = (
  category: MilestoneCategory,
  isCompleted: boolean
) => {
  if (isCompleted) {
    return {
      title: 'text-[var(--text-muted)] line-through font-normal',
      indexBadge:
        'bg-[var(--bg-raised)] border-[var(--border-hairline)] text-[var(--text-muted)]',
      dot: 'bg-[var(--text-muted)]',
    };
  }

  switch (category) {
    case 'revenue':
      return {
        title: 'text-lime-700 dark:text-lime-300 font-medium',
        indexBadge:
          'bg-lime-500/10 border-lime-600/25 dark:border-lime-400/25 text-lime-700 dark:text-lime-300',
        dot: 'bg-lime-600 dark:bg-lime-400',
      };
    case 'net-worth':
      return {
        title: 'text-emerald-700 dark:text-emerald-400 font-medium',
        indexBadge:
          'bg-emerald-500/10 border-emerald-600/25 dark:border-emerald-400/25 text-emerald-700 dark:text-emerald-400',
        dot: 'bg-emerald-600 dark:bg-emerald-400',
      };
    case 'life':
      return {
        title: 'text-indigo-800 dark:text-indigo-300 font-medium',
        indexBadge:
          'bg-indigo-500/10 border-indigo-700/25 dark:border-indigo-400/30 text-indigo-800 dark:text-indigo-300',
        dot: 'bg-indigo-700 dark:bg-indigo-400',
      };
    case 'relocation':
      return {
        title: 'text-sky-700 dark:text-sky-400 font-medium',
        indexBadge:
          'bg-sky-500/10 border-sky-600/25 dark:border-sky-400/25 text-sky-700 dark:text-sky-400',
        dot: 'bg-sky-600 dark:bg-sky-400',
      };
    case 'default':
    default:
      return {
        title: 'text-[var(--text-primary)] font-medium',
        indexBadge:
          'bg-[var(--bg-raised)] border-[var(--border-hairline)] text-[var(--text-muted)]',
        dot: 'bg-[var(--text-muted)]',
      };
  }
};

const businessDotColors = [
  'bg-emerald-600 dark:bg-emerald-400',
  'bg-sky-600 dark:bg-sky-400',
  'bg-amber-600 dark:bg-amber-400',
  'bg-indigo-600 dark:bg-indigo-400',
  'bg-rose-600 dark:bg-rose-400',
  'bg-teal-600 dark:bg-teal-400',
];

const nextStatus = (current: MilestoneStatus): MilestoneStatus => {
  switch (current) {
    case 'upcoming':
      return 'in-progress';
    case 'in-progress':
      return 'completed';
    case 'completed':
      return 'upcoming';
  }
};

export interface VisionAllMissionsProps {
  isDark?: boolean;
  onToggleTheme?: (dark: boolean) => void;
  showInlineToggle?: boolean;
}

const AllZMissionAndMilestone: React.FC<VisionAllMissionsProps> = ({
  isDark: externalIsDark,
  onToggleTheme,
  showInlineToggle = false,
}) => {
  const { vision: missionData, loading, isEditMode, updateVision } = useVisionData();
  const [expandedMilestone, setExpandedMilestone] = useState<number | null>(null);
  const now = useNow(60_000);

  const [headerModalOpen, setHeaderModalOpen] = useState(false);
  const [missionModalState, setMissionModalState] = useState<{
    open: boolean;
    editing: Mission | null;
  }>({ open: false, editing: null });
  const [milestoneModalState, setMilestoneModalState] = useState<{
    open: boolean;
    missionId: number | null;
    editing: Milestone | null;
  }>({ open: false, missionId: null, editing: null });
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: 'mission'; missionId: number; label: string }
    | { kind: 'milestone'; missionId: number; milestoneId: number; label: string }
    | null
  >(null);

  const timeRemaining = useMemo(
    () =>
      missionData?.endDate ? calculateTimeRemaining(missionData.endDate, now) : null,
    [missionData?.endDate, now]
  );

  const [internalIsDark, setInternalIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme =
        localStorage.getItem('z_vision_app_theme') ||
        sessionStorage.getItem('z_vision_app_theme');
      if (savedTheme === 'light') return false;
      if (savedTheme === 'dark') return true;
    }
    return true;
  });

  const isDark = externalIsDark !== undefined ? externalIsDark : internalIsDark;

  const handleToggleTheme = (dark: boolean) => {
    if (externalIsDark === undefined) {
      setInternalIsDark(dark);
      if (typeof window !== 'undefined') {
        localStorage.setItem('z_vision_app_theme', dark ? 'dark' : 'light');
      }
    }
    onToggleTheme?.(dark);
  };

  const toggleMilestone = (id: number) => {
    setExpandedMilestone((prev) => (prev === id ? null : id));
  };

  const handleCycleStatus = (missionId: number, milestoneId: number) => {
    const nextMissions = missionData.missions.map((mission) => {
      if (mission.id !== missionId) return mission;
      return {
        ...mission,
        milestones: mission.milestones.map((m) =>
          m.id === milestoneId ? { ...m, status: nextStatus(m.status) } : m
        ),
      };
    });
    void updateVision({ ...missionData, missions: nextMissions });
  };

  const handleMoveMission = (idx: number, delta: -1 | 1) => {
    const target = idx + delta;
    if (target < 0 || target >= missionData.missions.length) return;
    const nextMissions = [...missionData.missions];
    [nextMissions[idx], nextMissions[target]] = [nextMissions[target], nextMissions[idx]];
    void updateVision({ ...missionData, missions: nextMissions });
  };

  const handleMoveMilestone = (missionId: number, idx: number, delta: -1 | 1) => {
    const nextMissions = missionData.missions.map((mission) => {
      if (mission.id !== missionId) return mission;
      const target = idx + delta;
      if (target < 0 || target >= mission.milestones.length) return mission;
      const copy = [...mission.milestones];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return { ...mission, milestones: copy };
    });
    void updateVision({ ...missionData, missions: nextMissions });
  };

  const nextMissionId = useMemo(
    () => missionData.missions.reduce((max, m) => Math.max(max, m.id), 0) + 1,
    [missionData.missions]
  );

  const nextMilestoneId = useMemo(() => {
    let max = 0;
    for (const mission of missionData.missions) {
      for (const m of mission.milestones) {
        if (m.id > max) max = m.id;
      }
    }
    return max + 1;
  }, [missionData.missions]);

  const handleSaveMission = async (saved: Mission) => {
    const exists = missionData.missions.some((m) => m.id === saved.id);
    const nextMissions = exists
      ? missionData.missions.map((m) => (m.id === saved.id ? saved : m))
      : [...missionData.missions, saved];
    await updateVision({ ...missionData, missions: nextMissions });
  };

  const handleSaveMilestone = async (saved: Milestone) => {
    if (milestoneModalState.missionId === null) return;
    const nextMissions = missionData.missions.map((mission) => {
      if (mission.id !== milestoneModalState.missionId) return mission;
      const exists = mission.milestones.some((m) => m.id === saved.id);
      const nextMilestones = exists
        ? mission.milestones.map((m) => (m.id === saved.id ? saved : m))
        : [...mission.milestones, saved];
      return { ...mission, milestones: nextMilestones };
    });
    await updateVision({ ...missionData, missions: nextMissions });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === 'mission') {
      const nextMissions = missionData.missions.filter(
        (m) => m.id !== deleteTarget.missionId
      );
      await updateVision({ ...missionData, missions: nextMissions });
    } else {
      const nextMissions = missionData.missions.map((mission) => {
        if (mission.id !== deleteTarget.missionId) return mission;
        return {
          ...mission,
          milestones: mission.milestones.filter(
            (ml) => ml.id !== deleteTarget.milestoneId
          ),
        };
      });
      await updateVision({ ...missionData, missions: nextMissions });
    }
    setDeleteTarget(null);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 rounded-lg bg-[var(--bg-raised)]" />
        <div className="h-40 rounded-lg bg-[var(--bg-raised)]" />
      </div>
    );
  }

  const getDateStatus = (dateStr: string) => {
    const targetDate = new Date(dateStr);
    if (Number.isNaN(targetDate.getTime())) return 'normal';
    const today = new Date();
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 0 && diffDays <= 7) return 'soon';
    return 'normal';
  };

  const cleanTitle = stripDecorativeSymbols(missionData.title);
  const cleanSubtitle = stripDecorativeSymbols(missionData.subtitle);

  return (
    <div className="space-y-6">
      {showInlineToggle && (
        <div className="flex justify-end">
          <VisionThemeToggle isDark={isDark} onToggle={handleToggleTheme} />
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-medium tracking-[-0.015em] text-[var(--accent)]">
              {cleanTitle}
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">{cleanSubtitle}</p>
          </div>

          {isEditMode && (
            <button
              type="button"
              onClick={() => setHeaderModalOpen(true)}
              className="h-8 px-2.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-raised)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <EditIcon className="w-3.5 h-3.5" />
              <span>Edit vision</span>
            </button>
          )}
        </div>

        {timeRemaining && !timeRemaining.isInvalid && (
          <div className="surface-raised p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <div className="text-xs text-[var(--text-muted)] mb-0.5">
                  Horizon remaining
                </div>
                <div className="text-2xl font-mono tabular-nums font-medium text-[var(--text-primary)] leading-none">
                  {timeRemaining.years}y {timeRemaining.months}m
                </div>
              </div>
              <div className="w-px h-8 bg-[var(--border-hairline)]" />
              <div className="flex items-center gap-5">
                <div>
                  <div className="text-xs text-[var(--text-muted)] mb-0.5">Weeks</div>
                  <div className="text-sm font-mono tabular-nums font-medium text-[var(--text-primary)]">
                    {timeRemaining.totalWeeks ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[var(--text-muted)] mb-0.5">Days</div>
                  <div className="text-sm font-mono tabular-nums font-medium text-[var(--text-primary)]">
                    {timeRemaining.totalDays ?? 0}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-1.5 lg:w-80 shrink-0">
              {[
                { label: 'Years', value: timeRemaining.years, show: timeRemaining.years > 0 },
                {
                  label: 'Months',
                  value: timeRemaining.months,
                  show: timeRemaining.months > 0 || timeRemaining.years > 0,
                },
                { label: 'Weeks', value: timeRemaining.weeks, show: true },
                { label: 'Days', value: timeRemaining.days, show: true },
                { label: 'Hours', value: timeRemaining.hours, show: true },
              ]
                .filter((u) => u.show)
                .map((unit) => (
                  <div
                    key={unit.label}
                    className="rounded-md bg-[var(--bg-card)] border border-[var(--border-hairline)] py-2 px-1 text-center"
                  >
                    <div className="text-sm font-mono tabular-nums font-medium text-[var(--text-primary)] leading-tight">
                      {unit.value}
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] leading-none mt-0.5">
                      {unit.label}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {missionData.businesses.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {missionData.businesses.map((business, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-[var(--border-hairline)] bg-[var(--bg-raised)] text-xs text-[var(--text-secondary)]"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    businessDotColors[index % businessDotColors.length]
                  }`}
                />
                <span>{stripDecorativeSymbols(business)}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {missionData.missions.length === 0 ? (
          <div className="surface-raised p-6 text-center space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                No missions added yet
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Break your vision down into phases, deadlines, and actionable milestones.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setMissionModalState({ open: true, editing: null })}
                className="btn-primary h-9 px-4 text-xs"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>Add your first mission</span>
              </button>
              <button
                type="button"
                onClick={() => setHeaderModalOpen(true)}
                className="h-9 px-3.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-card)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer inline-flex items-center gap-1.5"
              >
                <EditIcon className="w-3.5 h-3.5" />
                <span>Edit vision &amp; pillars</span>
              </button>
            </div>
          </div>
        ) : (
          missionData.missions.map((mission, missionIndex) => {
            const totalMilestones = mission.milestones?.length || 0;
            const completedCount =
              mission.milestones?.filter((m) => m.status === 'completed').length || 0;
            const percentComplete =
              totalMilestones > 0 ? Math.round((completedCount / totalMilestones) * 100) : 0;

            return (
              <div
                key={mission.id}
                className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-card)] overflow-hidden"
              >
                <div className="px-4 sm:px-5 py-4 border-b border-[var(--border-hairline)] bg-[var(--bg-raised)]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-[15px] font-medium text-[var(--text-primary)]">
                        {stripDecorativeSymbols(mission.title)}
                      </h3>
                      <span className="text-xs font-mono tabular-nums text-[var(--text-muted)]">
                        {mission.duration.years ? `${mission.duration.years}y ` : ''}
                        {mission.duration.months}m
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                      <CalendarIcon className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                      <span>{mission.period}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-full sm:w-44 shrink-0 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--text-muted)]">Progress</span>
                        <span className="font-mono tabular-nums text-[var(--text-secondary)]">
                          {completedCount}/{totalMilestones} · {percentComplete}%
                        </span>
                      </div>
                      <div className="horizon-track">
                        <div
                          className="horizon-fill"
                          style={{ transform: `scaleX(${percentComplete / 100})` }}
                        />
                      </div>
                    </div>

                    {isEditMode && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveMission(missionIndex, -1)}
                          disabled={missionIndex === 0}
                          className="btn-icon w-7 h-7 disabled:opacity-30"
                          aria-label="Move mission up"
                        >
                          <ArrowUpIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveMission(missionIndex, 1)}
                          disabled={missionIndex === missionData.missions.length - 1}
                          className="btn-icon w-7 h-7 disabled:opacity-30"
                          aria-label="Move mission down"
                        >
                          <ArrowDownIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setMissionModalState({ open: true, editing: mission })
                          }
                          className="btn-icon w-7 h-7"
                          aria-label="Edit mission"
                        >
                          <EditIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              kind: 'mission',
                              missionId: mission.id,
                              label: stripDecorativeSymbols(mission.title),
                            })
                          }
                          className="btn-icon w-7 h-7 hover:text-[var(--semantic-negative)]"
                          aria-label="Delete mission"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="divide-y divide-[var(--border-hairline)]">
                  {mission.milestones.map((milestone, milestoneIndex) => {
                    const isExpanded = expandedMilestone === milestone.id;
                    const isCompleted = milestone.status === 'completed';
                    const isInProgress = milestone.status === 'in-progress';
                    const isSoon =
                      milestone.status === 'upcoming' &&
                      getDateStatus(milestone.deadline) === 'soon';
                    const category = resolveMilestoneCategory(milestone);
                    const categoryStyles = getMilestoneCategoryStyles(category, isCompleted);

                    return (
                      <div key={milestone.id}>
                        <div
                          className={`px-4 sm:px-5 py-3 flex items-start sm:items-center gap-3 transition-[background-color] duration-150 ${
                            isExpanded
                              ? 'bg-[var(--bg-raised)]'
                              : 'hover:bg-[var(--bg-raised)]/50'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleCycleStatus(mission.id, milestone.id)}
                            aria-label={`Cycle status for milestone ${milestone.id} (currently ${milestone.status})`}
                            title="Click to cycle status (Upcoming → In progress → Completed)"
                            className={`mt-0.5 sm:mt-0 w-5 h-5 rounded flex items-center justify-center border shrink-0 cursor-pointer transition-colors ${
                              isCompleted
                                ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-fg)]'
                                : isInProgress
                                  ? 'bg-[var(--semantic-warning-soft)] border-[var(--semantic-warning-border)]'
                                  : 'bg-transparent border-[var(--border-strong)] hover:border-[var(--accent)]'
                            }`}
                          >
                            {isCompleted && <CheckIcon className="w-3.5 h-3.5" />}
                            {isInProgress && (
                              <span className="w-2 h-2 rounded-full bg-[var(--semantic-warning)]" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleMilestone(milestone.id)}
                            aria-expanded={isExpanded}
                            className="flex-1 min-w-0 text-left flex items-start sm:items-center justify-between gap-3 cursor-pointer"
                          >
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-start sm:items-center gap-2">
                                <span
                                  className={`text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded border shrink-0 ${categoryStyles.indexBadge}`}
                                >
                                  #{String(milestone.id).padStart(2, '0')}
                                </span>
                                <span className={`text-sm leading-snug ${categoryStyles.title}`}>
                                  {stripDecorativeSymbols(milestone.title)}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs flex-wrap">
                                <span
                                  className={
                                    isSoon
                                      ? 'text-[var(--semantic-warning)]'
                                      : 'text-[var(--text-secondary)]'
                                  }
                                >
                                  {milestone.deadline}
                                </span>
                                <span
                                  className={`sm:hidden ${
                                    isCompleted
                                      ? 'text-[var(--accent)]'
                                      : isInProgress
                                        ? 'text-[var(--semantic-warning)]'
                                        : 'text-[var(--text-muted)]'
                                  }`}
                                >
                                  {formatStatusLabel(milestone.status)}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0 pt-0.5 sm:pt-0">
                              <span
                                className={`hidden sm:inline-flex items-center gap-1.5 text-xs ${
                                  isCompleted
                                    ? 'text-[var(--accent)]'
                                    : isInProgress
                                      ? 'text-[var(--semantic-warning)]'
                                      : 'text-[var(--text-muted)]'
                                }`}
                              >
                                {isInProgress && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--semantic-warning)]" />
                                )}
                                {formatStatusLabel(milestone.status)}
                              </span>

                              <ChevronDownIcon
                                className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 ${
                                  isExpanded ? 'rotate-180 text-[var(--text-primary)]' : ''
                                }`}
                              />
                            </div>
                          </button>

                          {isEditMode && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  handleMoveMilestone(mission.id, milestoneIndex, -1)
                                }
                                disabled={milestoneIndex === 0}
                                className="btn-icon w-7 h-7 disabled:opacity-30"
                                aria-label="Move milestone up"
                              >
                                <ArrowUpIcon className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleMoveMilestone(mission.id, milestoneIndex, 1)
                                }
                                disabled={milestoneIndex === mission.milestones.length - 1}
                                className="btn-icon w-7 h-7 disabled:opacity-30"
                                aria-label="Move milestone down"
                              >
                                <ArrowDownIcon className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setMilestoneModalState({
                                    open: true,
                                    missionId: mission.id,
                                    editing: milestone,
                                  })
                                }
                                className="btn-icon w-7 h-7"
                                aria-label="Edit milestone"
                              >
                                <EditIcon className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget({
                                    kind: 'milestone',
                                    missionId: mission.id,
                                    milestoneId: milestone.id,
                                    label: stripDecorativeSymbols(milestone.title),
                                  })
                                }
                                className="btn-icon w-7 h-7 hover:text-[var(--semantic-negative)]"
                                aria-label="Delete milestone"
                              >
                                <TrashIcon className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        {isExpanded && (
                          <div className="px-4 sm:px-5 pb-4 pt-1 sm:pl-12 bg-[var(--bg-raised)]/40">
                            <div className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-card)] p-4">
                              {milestone.points && milestone.points.length > 0 ? (
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                                    <span className={`w-1.5 h-1.5 rounded-full ${categoryStyles.dot}`} />
                                    <span>Key objectives</span>
                                  </div>
                                  <ul className="space-y-2">
                                    {milestone.points.map((point, index) => {
                                      const cleaned = stripDecorativeSymbols(point);
                                      return (
                                        <li
                                          key={index}
                                          className="flex items-start gap-2.5 text-sm leading-relaxed text-[var(--text-secondary)]"
                                        >
                                          <span
                                            className={`mt-2 w-1.5 h-1.5 rounded-full shrink-0 ${categoryStyles.dot}`}
                                          />
                                          <span>{cleaned || point}</span>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                                    <span className={`w-1.5 h-1.5 rounded-full ${categoryStyles.dot}`} />
                                    <span>Details</span>
                                  </div>
                                  <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                                    {milestone.details || 'No objectives added yet.'}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {isEditMode && (
                  <div className="px-4 sm:px-5 py-2.5 border-t border-[var(--border-hairline)] bg-[var(--bg-raised)]/30">
                    <button
                      type="button"
                      onClick={() =>
                        setMilestoneModalState({
                          open: true,
                          missionId: mission.id,
                          editing: null,
                        })
                      }
                      className="text-xs font-medium text-[var(--accent)] hover:underline cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <PlusIcon className="w-3.5 h-3.5" />
                      <span>Add milestone to {stripDecorativeSymbols(mission.title)}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}

        {isEditMode && missionData.missions.length > 0 && (
          <button
            type="button"
            onClick={() => setMissionModalState({ open: true, editing: null })}
            className="w-full py-3 rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-raised)]/40 hover:bg-[var(--bg-raised)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add new mission</span>
          </button>
        )}
      </div>

      <VisionHeaderModal
        open={headerModalOpen}
        vision={missionData}
        onClose={() => setHeaderModalOpen(false)}
        onSave={updateVision}
      />

      <MissionEditorModal
        open={missionModalState.open}
        initial={missionModalState.editing}
        nextId={nextMissionId}
        onClose={() => setMissionModalState({ open: false, editing: null })}
        onSave={handleSaveMission}
      />

      <MilestoneEditorModal
        open={milestoneModalState.open}
        initial={milestoneModalState.editing}
        nextId={nextMilestoneId}
        onClose={() =>
          setMilestoneModalState({ open: false, missionId: null, editing: null })
        }
        onSave={handleSaveMilestone}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title={deleteTarget?.kind === 'mission' ? 'Delete Mission' : 'Delete Milestone'}
        description={`Remove "${deleteTarget?.label ?? ''}"? This change syncs immediately.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default AllZMissionAndMilestone;
