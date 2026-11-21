import { useState, useEffect, useRef } from 'react';
import { useMediaQuery } from './hooks/useMediaQuery';
import { AuthProvider, useAuth } from './context/AuthContext';
import { VisionDataProvider, useVisionData } from './context/VisionDataContext';
import { DEFAULT_WIDGETS_EXISTING } from './data/defaults';
import LoginScreen from './components/auth/LoginScreen';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
import Clock from './components/shared/Clock';
import Calendar from './components/shared/Calendar';
import DynamicMilestone from './components/mission-milestone/DynamicMilestone';
import { CountdownEditorModal } from './components/mission-milestone/CountdownEditorModal';
import VisionAllMissions from './components/mission-milestone/VisionAllMissionsAndMilestones';
import FitnessProgress from './components/fitness/FitnessProgress';
import Journaling from './components/journaling/Journaling';
import PrayerTimesCard from './components/prayer/PrayerTimesCard';
import { VisionThemeToggle } from './components/mission-milestone/VisionThemeToggle';
import { SettingsModal } from './components/settings/SettingsModal';
import { ConfirmDialog } from './components/shared/Modal';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  LayersIcon,
  ActivityIcon,
  PenLineIcon,
  EditIcon,
  CheckIcon,
  SettingsIcon,
  LogOutIcon,
  PlusIcon,
  AlertCircleIcon,
  ClockIcon,
} from './components/shared/Icons';
import type { CountdownMilestone } from './types/vision';

interface DashboardShellProps {
  isDarkMode: boolean;
  onToggleTheme: (dark: boolean) => void;
  onExitDemo?: () => void;
}

const getInitials = (name?: string | null, email?: string | null): string => {
  const src = (name || email || 'U').trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return src.slice(0, 2).toUpperCase();
};

const DashboardShell: React.FC<DashboardShellProps> = ({
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
  const [deletingCountdown, setDeletingCountdown] = useState<CountdownMilestone | null>(null);

  const widgets = settings.widgets ?? DEFAULT_WIDGETS_EXISTING;
  const weekendHighlight = settings.weekendHighlight ?? 'friday';

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

  const renderCountdownCards = (prefix: 'mobile' | 'desktop') => {
    const isGrid = prefix === 'mobile';
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
                  key={`${prefix}-${milestone.id}`}
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
  };

  const calendarSection = (
    <section className="surface-card p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-medium text-[var(--text-primary)]">
          {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
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

  const clockSection = (
    <section className="surface-card p-6 flex items-center justify-center min-h-[168px]">
      <Clock />
    </section>
  );

  const missionsSection = (
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

  const fitnessSection = (
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

  const journalingSection = (
    <section className="surface-card p-4 sm:p-6">
      <h2 className="section-heading mb-4">
        <PenLineIcon />
        <span>Journaling</span>
      </h2>
      <Journaling />
    </section>
  );

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
              /* Account Menu */
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
        ) : !isDesktop ? (
          <div className="space-y-4 sm:space-y-6">
            <div
              className={`grid grid-cols-1 ${
                widgets.prayerTimes ? 'md:grid-cols-2' : ''
              } gap-4 sm:gap-6 items-stretch`}
            >
              {clockSection}
              {widgets.prayerTimes && <PrayerTimesCard />}
            </div>

            {widgets.calendar && calendarSection}
            {renderCountdownCards('mobile')}
            {missionsSection}
            {widgets.fitness && fitnessSection}
            {widgets.journaling && journalingSection}
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-6 items-start">
            {/* Primary Column */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
              <div
                className={`grid ${
                  widgets.prayerTimes ? 'grid-cols-2' : 'grid-cols-1'
                } gap-6 items-stretch`}
              >
                {clockSection}
                {widgets.prayerTimes && <PrayerTimesCard />}
              </div>

              {widgets.calendar && calendarSection}
              {missionsSection}
              {widgets.journaling && journalingSection}
            </div>

            {/* Secondary Column */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-6">
              {renderCountdownCards('desktop')}
              {widgets.fitness && <div className="sticky top-20">{fitnessSection}</div>}
            </div>
          </div>
        )}
      </main>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <CountdownEditorModal
        open={countdownModalState.open}
        initial={countdownModalState.editing}
        onClose={() => setCountdownModalState({ open: false, editing: null })}
        onSave={handleSaveCountdown}
      />

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

interface AuthGateProps {
  isDarkMode: boolean;
  onToggleTheme: (dark: boolean) => void;
}

const AuthenticatedView: React.FC<AuthGateProps> = ({ isDarkMode, onToggleTheme }) => {
  const { loading, needsOnboarding } = useVisionData();

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center text-sm text-[var(--text-muted)] font-mono">
        Loading workspace…
      </div>
    );
  }

  if (needsOnboarding) {
    return <OnboardingFlow isDarkMode={isDarkMode} onToggleTheme={onToggleTheme} />;
  }

  return <DashboardShell isDarkMode={isDarkMode} onToggleTheme={onToggleTheme} />;
};

const AuthGate: React.FC<AuthGateProps> = ({ isDarkMode, onToggleTheme }) => {
  const { user, loading } = useAuth();
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    if (user) {
      setIsDemoMode(false);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center text-sm text-[var(--text-muted)] font-mono">
        Loading Z Vision…
      </div>
    );
  }

  if (!user && isDemoMode) {
    return (
      <VisionDataProvider demoMode={true}>
        <DashboardShell
          isDarkMode={isDarkMode}
          onToggleTheme={onToggleTheme}
          onExitDemo={() => setIsDemoMode(false)}
        />
      </VisionDataProvider>
    );
  }

  if (!user) {
    return (
      <LoginScreen
        isDark={isDarkMode}
        onToggleTheme={onToggleTheme}
        onTryDemo={() => setIsDemoMode(true)}
      />
    );
  }

  return (
    <VisionDataProvider>
      <AuthenticatedView isDarkMode={isDarkMode} onToggleTheme={onToggleTheme} />
    </VisionDataProvider>
  );
};

function App() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedTheme =
          localStorage.getItem('z_vision_app_theme') ||
          sessionStorage.getItem('z_vision_app_theme');
        if (savedTheme === 'light') return false;
        if (savedTheme === 'dark') return true;
      } catch (e) {
        console.error(e);
      }
    }
    return true;
  });

  useEffect(() => {
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      try {
        localStorage.setItem('z_vision_app_theme', 'dark');
      } catch {
        // ignore storage errors
      }
      themeMeta?.setAttribute('content', '#050507');
    } else {
      document.documentElement.classList.remove('dark');
      try {
        localStorage.setItem('z_vision_app_theme', 'light');
      } catch {
        // ignore storage errors
      }
      themeMeta?.setAttribute('content', '#deddd7');
    }
  }, [isDarkMode]);

  return (
    <AuthProvider>
      <AuthGate isDarkMode={isDarkMode} onToggleTheme={setIsDarkMode} />
    </AuthProvider>
  );
}

export default App;
