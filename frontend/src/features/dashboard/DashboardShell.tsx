import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import {
  DEFAULT_WIDGETS_EXISTING,
  reconcileLayout,
  type CountdownMilestone,
  type DashboardCardId,
  type DashboardLayout,
} from '@z-vision/shared';
import { useAuth } from '../../app/providers/AuthContext';
import { useVisionData } from '../../app/providers/VisionDataContext';
import { useMediaQuery } from '../../shared/hooks/useMediaQuery';
import Clock from '../../shared/components/Clock';
import Calendar from '../../shared/components/Calendar';
import { VisionThemeToggle } from '../../shared/components/VisionThemeToggle';
import { ConfirmDialog } from '../../shared/components/Modal';
import DynamicMilestone from '../countdowns/DynamicMilestone';
import VisionAllMissions from '../roadmap/VisionAllMissionsAndMilestones';
import FitnessProgress from '../fitness/FitnessProgress';
import Journaling from '../journaling/Journaling';
import PrayerTimesCard from '../prayer/PrayerTimesCard';
import { SortableDashboardCard } from './SortableDashboardCard';
import {
  ActivityIcon,
  AlertCircleIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  EditIcon,
  LayersIcon,
  LogOutIcon,
  PenLineIcon,
  PlusIcon,
  RotateCcwIcon,
  SettingsIcon,
} from '../../shared/components/Icons';

const SettingsModal = lazy(() => import('../settings/SettingsModal'));
const CountdownEditorModal = lazy(
  () => import('../countdowns/CountdownEditorModal')
);
const RamadanCalendarCard = lazy(
  () => import('../ramadan/RamadanCalendarCard')
);
const CalorieTrackerCard = lazy(() => import('../calories/CalorieTrackerCard'));

interface DashboardShellProps {
  isDarkMode: boolean;
  onToggleTheme: (dark: boolean) => void;
  onExitDemo?: () => void;
}

const CARD_LABELS: Record<DashboardCardId, string> = {
  clock: 'Clock',
  prayerTimes: 'Prayer times',
  ramadan: 'Ramadan calendar',
  calendar: 'Calendar',
  countdowns: 'Countdowns',
  missions: 'Missions & milestones',
  fitness: 'Fitness progress',
  calories: 'Calorie tracker',
  journaling: 'Journaling',
};

const BOTTOM_PREFERENCE_CARDS = new Set<DashboardCardId>(['ramadan', 'calories']);

const splitTrailingBottomCards = (list: DashboardCardId[]) => {
  let splitIdx = list.length;
  while (splitIdx > 0 && BOTTOM_PREFERENCE_CARDS.has(list[splitIdx - 1])) {
    splitIdx--;
  }
  return {
    main: list.slice(0, splitIdx),
    trailing: list.slice(splitIdx),
  };
};

const buildMobileFlatCards = (layout: DashboardLayout): DashboardCardId[] => {
  const primaryParts = splitTrailingBottomCards(layout.primary);
  const secondaryParts = splitTrailingBottomCards(layout.secondary);
  return [
    ...primaryParts.main,
    ...secondaryParts.main,
    ...primaryParts.trailing,
    ...secondaryParts.trailing,
  ];
};

const isClockPrayerPair = (a: DashboardCardId, b: DashboardCardId): boolean =>
  (a === 'clock' && b === 'prayerTimes') || (a === 'prayerTimes' && b === 'clock');

const getInitials = (name?: string | null, email?: string | null): string => {
  const src = (name || email || 'U').trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return src.slice(0, 2).toUpperCase();
};

const DroppableColumn: React.FC<{
  id: 'primary' | 'secondary';
  className: string;
  children: React.ReactNode;
}> = ({ id, className, children }) => {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={className}>
      {children}
    </div>
  );
};

export const DashboardShell: React.FC<DashboardShellProps> = ({
  isDarkMode,
  onToggleTheme,
  onExitDemo,
}) => {
  const { user, signInWithGoogle, signOutUser } = useAuth();
  const {
    countdowns,
    settings,
    loading,
    isDemoMode,
    syncStatus,
    errorMessage,
    clearError,
    isEditMode,
    setIsEditMode,
    updateCountdowns,
    updateLayout,
    resetLayout,
  } = useVisionData();

  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [initialStartDate] = useState<string>(() => new Date().toISOString());

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  const [countdownModalState, setCountdownModalState] = useState<{
    open: boolean;
    editing: CountdownMilestone | null;
  }>({ open: false, editing: null });
  const [deletingCountdown, setDeletingCountdown] = useState<CountdownMilestone | null>(
    null
  );

  const widgets = useMemo(
    () => ({
      ...DEFAULT_WIDGETS_EXISTING,
      ...(settings.widgets ?? {}),
    }),
    [settings.widgets]
  );

  const resolvedLayout = useMemo(
    () => reconcileLayout(settings.layout, widgets),
    [settings.layout, widgets]
  );

  const [dragLayout, setDragLayout] = useState<DashboardLayout | null>(null);
  const [activeCardId, setActiveCardId] = useState<DashboardCardId | null>(null);
  const activeLayout = dragLayout ?? resolvedLayout;

  const weekendHighlight = settings.weekendHighlight ?? 'friday';

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    document.title = settings.appTitle || 'Z Vision';
  }, [settings.appTitle]);

  useEffect(() => {
    if (!accountMenuOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAccountMenuOpen(false);
    };
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [accountMenuOpen]);

  const handleMonthChange = (direction: 'next' | 'prev') => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    setSelectedMonth(newDate);
  };

  const isCurrentMonth = (() => {
    const now = new Date();
    return (
      selectedMonth.getFullYear() === now.getFullYear() &&
      selectedMonth.getMonth() === now.getMonth()
    );
  })();

  const handleSaveCountdown = async (saved: CountdownMilestone) => {
    const exists = countdowns.some((c) => c.id === saved.id);
    const next = exists
      ? countdowns.map((c) => (c.id === saved.id ? saved : c))
      : [...countdowns, saved];
    await updateCountdowns(next);
  };

  const handleMoveCountdown = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= countdowns.length) return;
    const copy = [...countdowns];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    void updateCountdowns(copy);
  };

  const handleConfirmDeleteCountdown = async () => {
    if (!deletingCountdown) return;
    await updateCountdowns(countdowns.filter((c) => c.id !== deletingCountdown.id));
    setDeletingCountdown(null);
  };

  const findColumnOfCard = (
    layout: DashboardLayout,
    cardId: string
  ): 'primary' | 'secondary' | null => {
    if (cardId === 'primary' || cardId === 'secondary') return cardId;
    if (layout.primary.includes(cardId as DashboardCardId)) return 'primary';
    if (layout.secondary.includes(cardId as DashboardCardId)) return 'secondary';
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.id as DashboardCardId);
    setDragLayout(resolvedLayout);
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (!isDesktop) return;
    const { active, over } = event;
    if (!over) return;

    const current = dragLayout ?? resolvedLayout;
    const activeId = active.id as DashboardCardId;
    const overId = String(over.id);

    const activeCol = findColumnOfCard(current, activeId);
    const overCol = findColumnOfCard(current, overId);

    if (!activeCol || !overCol || activeCol === overCol) return;

    const sourceList = [...current[activeCol]];
    const destList = [...current[overCol]];
    const activeIdx = sourceList.indexOf(activeId);
    if (activeIdx === -1) return;

    sourceList.splice(activeIdx, 1);
    const overIdx = destList.indexOf(overId as DashboardCardId);
    const insertIdx = overIdx >= 0 ? overIdx : destList.length;
    destList.splice(insertIdx, 0, activeId);

    setDragLayout({
      ...current,
      [activeCol]: sourceList,
      [overCol]: destList,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const base = dragLayout ?? resolvedLayout;
    setActiveCardId(null);
    setDragLayout(null);

    if (!over) {
      if (dragLayout) void updateLayout(base);
      return;
    }

    const activeId = active.id as DashboardCardId;
    const overId = String(over.id);

    if (!isDesktop) {
      const flat = buildMobileFlatCards(base);
      const oldIdx = flat.indexOf(activeId);
      const newIdx = flat.indexOf(overId as DashboardCardId);
      if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
        const reordered = arrayMove(flat, oldIdx, newIdx);
        const nextPrimary = reordered.filter((id) => base.primary.includes(id));
        const nextSecondary = reordered.filter((id) => base.secondary.includes(id));
        void updateLayout({ primary: nextPrimary, secondary: nextSecondary });
      }
      return;
    }

    const activeCol = findColumnOfCard(base, activeId);
    const overCol = findColumnOfCard(base, overId);

    if (!activeCol || !overCol) {
      void updateLayout(base);
      return;
    }

    if (activeCol === overCol) {
      const list = base[activeCol];
      const oldIdx = list.indexOf(activeId);
      const newIdx = list.indexOf(overId as DashboardCardId);
      if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
        const nextLayout: DashboardLayout = {
          ...base,
          [activeCol]: arrayMove(list, oldIdx, newIdx),
        };
        void updateLayout(nextLayout);
        return;
      }
    }

    void updateLayout(base);
  };

  const handleMoveCardButton = (
    col: 'primary' | 'secondary',
    idx: number,
    delta: -1 | 1
  ) => {
    const list = [...resolvedLayout[col]];
    const target = idx + delta;
    if (target < 0 || target >= list.length) return;
    [list[idx], list[target]] = [list[target], list[idx]];
    void updateLayout({
      ...resolvedLayout,
      [col]: list,
    });
  };

  const handleMoveCardColumn = (fromCol: 'primary' | 'secondary', cardId: DashboardCardId) => {
    const toCol = fromCol === 'primary' ? 'secondary' : 'primary';
    void updateLayout({
      ...resolvedLayout,
      [fromCol]: resolvedLayout[fromCol].filter((id) => id !== cardId),
      [toCol]: [...resolvedLayout[toCol], cardId],
    });
  };

  const renderCardBody = (cardId: DashboardCardId): React.ReactNode => {
    switch (cardId) {
      case 'clock':
        return (
          <section className="surface-card p-6 flex items-center justify-center min-h-[168px] h-full">
            <Clock />
          </section>
        );
      case 'prayerTimes':
        return (
          <section className="surface-card p-5 h-full">
            <PrayerTimesCard embedded />
          </section>
        );
      case 'ramadan':
        return (
          <section className="surface-card p-5">
            <Suspense
              fallback={<div className="h-48 rounded-xl bg-[var(--bg-raised)]" />}
            >
              <RamadanCalendarCard />
            </Suspense>
          </section>
        );
      case 'calendar':
        return (
          <section className="surface-card p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-[15px] font-medium text-[var(--text-primary)]">
                {selectedMonth.toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </h2>
              <div className="flex items-center gap-1.5">
                {!isCurrentMonth && (
                  <button
                    type="button"
                    onClick={() => setSelectedMonth(new Date())}
                    className="h-8 px-2.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-raised)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] cursor-pointer transition-[color,border-color,background-color] duration-150"
                  >
                    Today
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleMonthChange('prev')}
                  className="btn-icon"
                  aria-label="Previous month"
                >
                  <ChevronLeftIcon />
                </button>
                <button
                  type="button"
                  onClick={() => handleMonthChange('next')}
                  className="btn-icon"
                  aria-label="Next month"
                >
                  <ChevronRightIcon />
                </button>
              </div>
            </div>
            <Calendar selectedMonth={selectedMonth} weekendHighlight={weekendHighlight} />
          </section>
        );
      case 'countdowns': {
        const isGrid = !isDesktop;
        return (
          <div className="space-y-3">
            {isEditMode && countdowns.length > 0 && (
              <button
                type="button"
                onClick={() => setCountdownModalState({ open: true, editing: null })}
                className="w-full py-2.5 px-3 rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-raised)]/40 hover:bg-[var(--bg-raised)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>Add countdown</span>
              </button>
            )}

            {countdowns.length === 0 ? (
              <div className="surface-card p-5 text-center space-y-3">
                <div className="mx-auto w-9 h-9 rounded-lg bg-[var(--bg-raised)] border border-[var(--border-hairline)] flex items-center justify-center text-[var(--text-muted)]">
                  <ClockIcon className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    No countdowns yet
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Add key target dates to track live remaining years, weeks, and days.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCountdownModalState({ open: true, editing: null })}
                  className="btn-primary h-9 px-4 text-xs"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  <span>Add your first countdown</span>
                </button>
              </div>
            ) : (
              <div className={isGrid ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'space-y-4'}>
                {countdowns.map((milestone, index) => {
                  const isLastOdd =
                    isGrid && index === countdowns.length - 1 && countdowns.length % 2 === 1;
                  return (
                    <div
                      key={milestone.id}
                      className={isLastOdd ? 'sm:col-span-2' : ''}
                    >
                      <DynamicMilestone
                        title={milestone.name}
                        startDate={milestone.startDate || initialStartDate}
                        endDate={milestone.endDate}
                        icon={milestone.icon}
                        color={milestone.color}
                        showTotalWeeksSummary={true}
                        isEditMode={isEditMode}
                        canMoveUp={index > 0}
                        canMoveDown={index < countdowns.length - 1}
                        onMoveUp={() => handleMoveCountdown(index, -1)}
                        onMoveDown={() => handleMoveCountdown(index, 1)}
                        onEdit={() =>
                          setCountdownModalState({ open: true, editing: milestone })
                        }
                        onDelete={() => setDeletingCountdown(milestone)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      }
      case 'missions':
        return (
          <section className="surface-card p-4 sm:p-6">
            <h2 className="section-heading mb-4 sm:mb-5">
              <LayersIcon />
              <span>Missions &amp; milestones</span>
            </h2>
            <div className="scrollbar-hide lg:max-h-[42rem] lg:overflow-y-auto lg:pr-1">
              <VisionAllMissions
                isDark={isDarkMode}
                onToggleTheme={onToggleTheme}
                showInlineToggle={false}
              />
            </div>
          </section>
        );
      case 'fitness':
        return (
          <section className="surface-card p-4 sm:p-6">
            <h2 className="section-heading mb-4">
              <ActivityIcon />
              <span>Fitness progress</span>
            </h2>
            <div className="scrollbar-hide lg:overflow-y-auto lg:max-h-[calc(100vh-11rem)]">
              <FitnessProgress />
            </div>
          </section>
        );
      case 'calories':
        return (
          <section className="surface-card p-4 sm:p-6">
            <Suspense
              fallback={<div className="h-48 rounded-xl bg-[var(--bg-raised)]" />}
            >
              <CalorieTrackerCard />
            </Suspense>
          </section>
        );
      case 'journaling':
        return (
          <section className="surface-card p-4 sm:p-6">
            <h2 className="section-heading mb-4">
              <PenLineIcon />
              <span>Journaling</span>
            </h2>
            <Journaling />
          </section>
        );
    }
  };

  const mobileFlatCards = buildMobileFlatCards(activeLayout);

  const renderSortableItem = (
    cardId: DashboardCardId,
    idx: number,
    total: number,
    stretchHeight: boolean,
    col?: 'primary' | 'secondary'
  ) => (
    <SortableDashboardCard
      key={cardId}
      id={cardId}
      label={CARD_LABELS[cardId]}
      isEditMode={isEditMode}
      canMoveUp={idx > 0}
      canMoveDown={idx < total - 1}
      stretchHeight={stretchHeight}
      showColumnMove={Boolean(col && isDesktop)}
      columnTargetLabel={col === 'primary' ? 'Right col' : 'Left col'}
      onMoveUp={() => {
        if (col) {
          handleMoveCardButton(col, idx, -1);
        } else {
          const next = arrayMove(mobileFlatCards, idx, idx - 1);
          void updateLayout({
            primary: next.filter((id) => activeLayout.primary.includes(id)),
            secondary: next.filter((id) => activeLayout.secondary.includes(id)),
          });
        }
      }}
      onMoveDown={() => {
        if (col) {
          handleMoveCardButton(col, idx, 1);
        } else {
          const next = arrayMove(mobileFlatCards, idx, idx + 1);
          void updateLayout({
            primary: next.filter((id) => activeLayout.primary.includes(id)),
            secondary: next.filter((id) => activeLayout.secondary.includes(id)),
          });
        }
      }}
      onMoveColumn={col ? () => handleMoveCardColumn(col, cardId) : undefined}
    >
      {renderCardBody(cardId)}
    </SortableDashboardCard>
  );

  const renderCardSequence = (
    items: DashboardCardId[],
    col?: 'primary' | 'secondary'
  ): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    for (let i = 0; i < items.length; ) {
      if (i + 1 < items.length && isClockPrayerPair(items[i], items[i + 1])) {
        const firstId = items[i];
        const secondId = items[i + 1];
        nodes.push(
          <div
            key={`pair-${firstId}-${secondId}`}
            className={
              isDesktop
                ? 'grid grid-cols-2 gap-6 items-stretch'
                : 'grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-stretch'
            }
          >
            {renderSortableItem(firstId, i, items.length, true, col)}
            {renderSortableItem(secondId, i + 1, items.length, true, col)}
          </div>
        );
        i += 2;
      } else {
        nodes.push(renderSortableItem(items[i], i, items.length, false, col));
        i += 1;
      }
    }
    return nodes;
  };

  return (
    <div className="min-h-[100dvh] text-[var(--text-primary)]">
      {/* Header */}
      <header className="sticky top-0 z-50 h-14 border-b border-[var(--border-hairline)] bg-[var(--bg-chrome)] backdrop-blur-md">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-7 h-7 rounded-md bg-[var(--text-primary)] text-[var(--bg-card)] flex items-center justify-center text-sm font-semibold select-none shrink-0">
              {settings.appLogoText || 'Z'}
            </div>
            <span className="text-base font-semibold tracking-[-0.01em] text-[var(--text-primary)] truncate">
              {settings.appTitle || 'Z Vision'}
            </span>
            {syncStatus !== 'idle' && (
              <span
                className={`hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                  syncStatus === 'error'
                    ? 'bg-[var(--semantic-negative-soft)] border-[var(--semantic-negative-border)] text-[var(--semantic-negative)]'
                    : syncStatus === 'saving'
                      ? 'bg-[var(--semantic-warning-soft)] border-[var(--semantic-warning-border)] text-[var(--semantic-warning)]'
                      : 'bg-[var(--accent-soft)] border-[var(--accent-border)] text-[var(--accent)]'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {syncStatus === 'saving'
                  ? 'Saving'
                  : syncStatus === 'saved'
                    ? 'Synced'
                    : 'Sync error'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {isEditMode && (
              <button
                type="button"
                onClick={() => void resetLayout()}
                title="Reset card layout to default"
                className="hidden sm:inline-flex h-9 px-2.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-raised)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] cursor-pointer items-center gap-1.5 transition-colors"
              >
                <RotateCcwIcon className="w-3.5 h-3.5" />
                <span>Reset layout</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsEditMode((prev) => !prev)}
              aria-pressed={isEditMode}
              className={`h-9 px-2.5 sm:px-3 rounded-lg border text-xs font-medium cursor-pointer inline-flex items-center gap-1.5 transition-colors ${
                isEditMode
                  ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-fg)]'
                  : 'bg-[var(--bg-raised)] border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
              }`}
            >
              {isEditMode ? (
                <>
                  <CheckIcon className="w-3.5 h-3.5" />
                  <span>Done</span>
                </>
              ) : (
                <>
                  <EditIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Edit</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="btn-icon"
              aria-label="Dashboard settings"
              title="Settings & Backup"
            >
              <SettingsIcon />
            </button>

            <VisionThemeToggle isDark={isDarkMode} onToggle={onToggleTheme} />

            {isDemoMode ? (
              <button
                type="button"
                onClick={() => void signInWithGoogle()}
                className="btn-primary h-9 px-3 text-xs"
              >
                Sign in
              </button>
            ) : (
              <div className="relative" ref={accountMenuRef}>
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((prev) => !prev)}
                  aria-expanded={accountMenuOpen}
                  aria-label="Account menu"
                  title={user?.email ?? 'Account'}
                  className="w-9 h-9 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-raised)] hover:border-[var(--border-strong)] flex items-center justify-center overflow-hidden cursor-pointer transition-colors"
                >
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName ?? 'User avatar'}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      {getInitials(user?.displayName, user?.email)}
                    </span>
                  )}
                </button>

                {accountMenuOpen && (
                  <div className="surface-card absolute right-0 mt-2 w-60 p-2 shadow-xl z-50 space-y-1">
                    <div className="px-2.5 py-2 border-b border-[var(--border-hairline)]">
                      {user?.displayName && (
                        <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                          {user.displayName}
                        </p>
                      )}
                      <p className="text-[11px] text-[var(--text-muted)] truncate">
                        {user?.email}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        setSettingsOpen(true);
                      }}
                      className="w-full px-2.5 py-2 rounded-lg text-left text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)] cursor-pointer flex items-center gap-2"
                    >
                      <SettingsIcon className="w-3.5 h-3.5" />
                      <span>Workspace settings</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        void signOutUser();
                      }}
                      className="w-full px-2.5 py-2 rounded-lg text-left text-xs text-[var(--semantic-negative)] hover:bg-[var(--semantic-negative-soft)] cursor-pointer flex items-center gap-2"
                    >
                      <LogOutIcon className="w-3.5 h-3.5" />
                      <span>Sign out</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {isDemoMode && (
        <div className="border-b border-[var(--accent-border)] bg-[var(--accent-soft)]">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-[var(--text-primary)]">
              <strong className="font-medium text-[var(--accent)]">Interactive Demo</strong>
              {' — '}edits stay in this browser session.
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void signInWithGoogle()}
                className="font-medium text-[var(--accent)] hover:underline cursor-pointer"
              >
                Sign in with Google to save
              </button>
              {onExitDemo && (
                <button
                  type="button"
                  onClick={onExitDemo}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  Exit demo
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isEditMode && (
        <div className="border-b border-[var(--border-hairline)] bg-[var(--bg-raised)]/60">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
            <span>
              Edit mode active — drag card handles to rearrange or move between columns, or click card items to edit.
            </span>
            <button
              type="button"
              onClick={() => void resetLayout()}
              className="sm:hidden inline-flex items-center gap-1 text-[var(--accent)] font-medium cursor-pointer"
            >
              <RotateCcwIcon className="w-3 h-3" />
              <span>Reset layout</span>
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 pt-3">
          <div
            role="alert"
            className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-[var(--semantic-negative-soft)] border border-[var(--semantic-negative-border)] text-xs text-[var(--semantic-negative)]"
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircleIcon className="w-4 h-4 shrink-0" />
              <span className="truncate">{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={clearError}
              className="underline shrink-0 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <main className="max-w-[1440px] mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-10">
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
              <div className="h-44 rounded-2xl bg-[var(--bg-raised)]" />
              <div className="h-72 rounded-2xl bg-[var(--bg-raised)]" />
            </div>
            <div className="lg:col-span-5 xl:col-span-4 space-y-4">
              <div className="h-36 rounded-2xl bg-[var(--bg-raised)]" />
              <div className="h-36 rounded-2xl bg-[var(--bg-raised)]" />
            </div>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            {!isDesktop ? (
              <SortableContext
                items={mobileFlatCards}
                strategy={rectSortingStrategy}
              >
                <div className="space-y-4 sm:space-y-6">
                  {renderCardSequence(mobileFlatCards)}
                </div>
              </SortableContext>
            ) : (
              <div className="grid grid-cols-12 gap-6 items-start">
                <DroppableColumn
                  id="primary"
                  className="lg:col-span-7 xl:col-span-8 space-y-6 min-h-[120px]"
                >
                  <SortableContext
                    items={activeLayout.primary}
                    strategy={rectSortingStrategy}
                  >
                    {renderCardSequence(activeLayout.primary, 'primary')}
                  </SortableContext>
                </DroppableColumn>

                <DroppableColumn
                  id="secondary"
                  className="lg:col-span-5 xl:col-span-4 space-y-6 min-h-[120px]"
                >
                  <SortableContext
                    items={activeLayout.secondary}
                    strategy={rectSortingStrategy}
                  >
                    {renderCardSequence(activeLayout.secondary, 'secondary')}
                  </SortableContext>
                </DroppableColumn>
              </div>
            )}

            <DragOverlay>
              {activeCardId ? (
                <div className="surface-card p-4 opacity-95 shadow-2xl border-[var(--accent-border)]">
                  <div className="text-xs font-mono font-medium text-[var(--accent)]">
                    Moving: {CARD_LABELS[activeCardId]}
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </main>

      <Suspense fallback={null}>
        {settingsOpen && (
          <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        )}
        {countdownModalState.open && (
          <CountdownEditorModal
            open={countdownModalState.open}
            initial={countdownModalState.editing}
            onClose={() => setCountdownModalState({ open: false, editing: null })}
            onSave={handleSaveCountdown}
          />
        )}
      </Suspense>

      <ConfirmDialog
        open={deletingCountdown !== null}
        title="Delete Countdown"
        description={`Remove "${deletingCountdown?.name ?? ''}" from your dashboard?`}
        onCancel={() => setDeletingCountdown(null)}
        onConfirm={handleConfirmDeleteCountdown}
      />
    </div>
  );
};

export default DashboardShell;
