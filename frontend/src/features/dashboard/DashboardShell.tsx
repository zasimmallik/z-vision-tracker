import React, {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  TouchSensor,
  closestCorners,
  defaultDropAnimationSideEffects,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DropAnimation,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  DEFAULT_MOBILE_ORDER,
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
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  CompassIcon,
  EditIcon,
  FlameIcon,
  GripVerticalIcon,
  LayersIcon,
  LogOutIcon,
  MoonStarIcon,
  PenLineIcon,
  PlusIcon,
  RotateCcwIcon,
  SettingsIcon,
  TargetIcon,
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

const renderCardIcon = (cardId: DashboardCardId): React.ReactNode => {
  switch (cardId) {
    case 'clock':
      return <ClockIcon className="w-4 h-4" />;
    case 'prayerTimes':
      return <CompassIcon className="w-4 h-4" />;
    case 'ramadan':
      return <MoonStarIcon className="w-4 h-4" />;
    case 'calendar':
      return <CalendarIcon className="w-4 h-4" />;
    case 'countdowns':
      return <TargetIcon className="w-4 h-4" />;
    case 'missions':
      return <LayersIcon className="w-4 h-4" />;
    case 'fitness':
      return <ActivityIcon className="w-4 h-4" />;
    case 'calories':
      return <FlameIcon className="w-4 h-4" />;
    case 'journaling':
      return <PenLineIcon className="w-4 h-4" />;
  }
};

const dropAnimation: DropAnimation = {
  duration: 240,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.35',
      },
    },
  }),
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
  label: string;
  isDraggingActive: boolean;
  isEmpty: boolean;
  className: string;
  children: React.ReactNode;
}> = ({ id, label, isDraggingActive, isEmpty, className, children }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`${className} dnd-column-dropzone ${
        isOver && isDraggingActive
          ? 'dnd-column-dropzone-active'
          : isDraggingActive && isEmpty
            ? 'dnd-column-dropzone-empty'
            : ''
      }`}
    >
      {children}
      {isEmpty && isDraggingActive && (
        <div className="dnd-drop-placeholder min-h-[120px] flex items-center justify-center p-6 text-xs font-mono text-[var(--accent)]">
          Drop card into {label}
        </div>
      )}
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
  const [missionsFolded, setMissionsFolded] = useState(false);
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
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const measuringConfig = useMemo(
    () => ({
      droppable: {
        strategy: MeasuringStrategy.Always,
      },
    }),
    []
  );

  const collisionDetection: CollisionDetection = useCallback((args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      const cardCollisions = pointerCollisions.filter(
        (c) => c.id !== 'primary' && c.id !== 'secondary'
      );
      return cardCollisions.length > 0 ? cardCollisions : pointerCollisions;
    }

    const rectCollisions = rectIntersection(args);
    if (rectCollisions.length > 0) {
      const cardCollisions = rectCollisions.filter(
        (c) => c.id !== 'primary' && c.id !== 'secondary'
      );
      return cardCollisions.length > 0 ? cardCollisions : rectCollisions;
    }

    return closestCorners(args);
  }, []);

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

  const mobileCards = useMemo<DashboardCardId[]>(() => {
    if (activeLayout.mobile && activeLayout.mobile.length > 0) {
      return activeLayout.mobile;
    }
    const enabled = new Set<DashboardCardId>([
      ...activeLayout.primary,
      ...activeLayout.secondary,
    ]);
    return DEFAULT_MOBILE_ORDER.filter((id) => enabled.has(id));
  }, [activeLayout]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.id as DashboardCardId);
    setDragLayout(resolvedLayout);
  };

  const handleDragCancel = () => {
    setActiveCardId(null);
    setDragLayout(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (!isDesktop) return;
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as DashboardCardId;
    const overId = String(over.id);
    if (activeId === overId) return;

    setDragLayout((prev) => {
      const current = prev ?? resolvedLayout;
      const activeCol = findColumnOfCard(current, activeId);
      const overCol = findColumnOfCard(current, overId);

      if (!activeCol || !overCol || activeCol === overCol) return prev;

      const sourceList = [...current[activeCol]];
      const destList = [...current[overCol]];
      const activeIdx = sourceList.indexOf(activeId);
      if (activeIdx === -1) return prev;

      sourceList.splice(activeIdx, 1);

      const overIdx = destList.indexOf(overId as DashboardCardId);
      let insertIdx: number;
      if (overIdx === -1) {
        insertIdx = destList.length;
      } else {
        const activeTop =
          active.rect.current.translated?.top ?? active.rect.current.initial?.top ?? 0;
        const isBelowOverItem =
          Boolean(over.rect) && activeTop > over.rect.top + over.rect.height / 2;
        insertIdx = isBelowOverItem ? overIdx + 1 : overIdx;
      }

      destList.splice(insertIdx, 0, activeId);

      return {
        ...current,
        [activeCol]: sourceList,
        [overCol]: destList,
      };
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
      const currentMobile =
        base.mobile && base.mobile.length > 0 ? base.mobile : mobileCards;
      const oldIdx = currentMobile.indexOf(activeId);
      const newIdx = currentMobile.indexOf(overId as DashboardCardId);
      if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
        const reordered = arrayMove(currentMobile, oldIdx, newIdx);
        void updateLayout({
          ...base,
          mobile: reordered,
        });
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

  const handleMoveMobileCardButton = (idx: number, delta: -1 | 1) => {
    const target = idx + delta;
    if (target < 0 || target >= mobileCards.length) return;
    const reordered = arrayMove(mobileCards, idx, target);
    void updateLayout({
      ...resolvedLayout,
      mobile: reordered,
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
            <div
              className={`flex items-center justify-between gap-2 ${
                missionsFolded ? '' : 'mb-4 sm:mb-5'
              }`}
            >
              <h2 className="section-heading">
                <LayersIcon />
                <span>Missions &amp; milestones</span>
              </h2>
              <button
                type="button"
                onClick={() => setMissionsFolded((prev) => !prev)}
                aria-expanded={!missionsFolded}
                aria-label={
                  missionsFolded
                    ? 'Expand Missions & milestones'
                    : 'Collapse Missions & milestones'
                }
                title={missionsFolded ? 'Expand card' : 'Fold card'}
                className="btn-icon w-8 h-8"
              >
                <ChevronDownIcon
                  className={`w-4 h-4 transition-transform duration-200 ${
                    missionsFolded ? '-rotate-90' : 'rotate-0'
                  }`}
                />
              </button>
            </div>
            {!missionsFolded && (
              <div className="scrollbar-hide max-h-[32rem] sm:max-h-[38rem] lg:max-h-[42rem] overflow-y-auto overscroll-contain pr-0.5 lg:pr-1">
                <VisionAllMissions
                  isDark={isDarkMode}
                  onToggleTheme={onToggleTheme}
                  showInlineToggle={false}
                />
              </div>
            )}
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
          handleMoveMobileCardButton(idx, -1);
        }
      }}
      onMoveDown={() => {
        if (col) {
          handleMoveCardButton(col, idx, 1);
        } else {
          handleMoveMobileCardButton(idx, 1);
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
            collisionDetection={collisionDetection}
            measuring={measuringConfig}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            {!isDesktop ? (
              <SortableContext
                items={mobileCards}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4 sm:space-y-6">
                  {renderCardSequence(mobileCards)}
                </div>
              </SortableContext>
            ) : (
              <div className="grid grid-cols-12 gap-6 items-start">
                <DroppableColumn
                  id="primary"
                  label="Left column"
                  isDraggingActive={activeCardId !== null}
                  isEmpty={activeLayout.primary.length === 0}
                  className="lg:col-span-7 xl:col-span-8 space-y-6 min-h-[140px]"
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
                  label="Right column"
                  isDraggingActive={activeCardId !== null}
                  isEmpty={activeLayout.secondary.length === 0}
                  className="lg:col-span-5 xl:col-span-4 space-y-6 min-h-[140px]"
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

            <DragOverlay dropAnimation={dropAnimation}>
              {activeCardId ? (
                <div className="dnd-overlay-card px-4 py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent)] flex items-center justify-center shrink-0">
                      {renderCardIcon(activeCardId)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                        {CARD_LABELS[activeCardId]}
                      </p>
                      <p className="text-[11px] font-mono text-[var(--accent)]">
                        Release to place
                      </p>
                    </div>
                  </div>
                  <GripVerticalIcon className="w-4 h-4 text-[var(--accent)] shrink-0" />
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
