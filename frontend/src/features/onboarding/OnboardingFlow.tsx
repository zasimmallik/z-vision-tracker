import React, { useMemo, useState } from 'react';
import {
  DEFAULT_WIDGETS_NEW_USER,
  getDefaultPrayerSettings,
  type DashboardWidgets,
  type OnboardingChoices,
  type PrayerSettings,
  type WeekendHighlight,
} from '@z-vision/shared';
import { useAuth } from '../../app/providers/AuthContext';
import { useVisionData } from '../../app/providers/VisionDataContext';
import { VisionThemeToggle } from '../../shared/components/VisionThemeToggle';
import { PrayerLocationPicker } from '../prayer/PrayerLocationPicker';
import {
  AlertCircleIcon,
  CheckIcon,
  LogOutIcon,
} from '../../shared/components/Icons';

interface OnboardingFlowProps {
  isDarkMode: boolean;
  onToggleTheme: (dark: boolean) => void;
}

const defaultEndDateStr = () => `${new Date().getFullYear() + 5}-12-31`;

const deriveInitialMonogram = (
  displayName: string | null | undefined,
  email: string | null | undefined
): string => {
  const source = (displayName || email || 'V').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 1).toUpperCase() || 'V';
};

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ isDarkMode, onToggleTheme }) => {
  const { user, signOutUser } = useAuth();
  const { completeOnboarding, isDemoMode } = useVisionData();

  const initialName = useMemo(() => {
    const first = user?.displayName?.trim().split(/\s+/)[0];
    return first ? `${first}'s Vision` : 'My Vision';
  }, [user?.displayName]);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [appTitle, setAppTitle] = useState(initialName);
  const [appLogoText, setAppLogoText] = useState(() =>
    deriveInitialMonogram(user?.displayName, user?.email)
  );
  const [visionTitle, setVisionTitle] = useState('My 5-Year Vision');
  const [endDateStr, setEndDateStr] = useState(defaultEndDateStr);
  const [templateMode, setTemplateMode] = useState<'blank' | 'starter'>('blank');
  const [widgets, setWidgets] = useState<DashboardWidgets>(DEFAULT_WIDGETS_NEW_USER);
  const [weekendHighlight, setWeekendHighlight] = useState<WeekendHighlight>('sat-sun');
  const [prayer, setPrayer] = useState<PrayerSettings>(() => getDefaultPrayerSettings());

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildChoices = (overrideMode?: 'blank' | 'starter'): OnboardingChoices => ({
    appTitle: appTitle.trim() || 'My Vision',
    appLogoText: appLogoText.trim().slice(0, 3) || 'V',
    visionTitle: visionTitle.trim() || 'My 5-Year Vision',
    visionEndDate: `${endDateStr || defaultEndDateStr()}T23:59:59`,
    templateMode: overrideMode ?? templateMode,
    widgets,
    weekendHighlight,
    prayer,
  });

  const handleFinish = async (overrideMode?: 'blank' | 'starter') => {
    setSubmitting(true);
    setError(null);
    try {
      await completeOnboarding(buildChoices(overrideMode));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create your workspace.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col text-[var(--text-primary)]">
      <header className="h-14 border-b border-[var(--border-hairline)] bg-[var(--bg-chrome)] backdrop-blur-md">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-md bg-[var(--text-primary)] text-[var(--bg-card)] flex items-center justify-center text-sm font-semibold select-none shrink-0">
              {appLogoText.slice(0, 2) || 'Z'}
            </div>
            <span className="text-base font-semibold tracking-[-0.01em] truncate">
              Z Vision Setup
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {user?.email && (
              <span className="hidden sm:inline text-xs text-[var(--text-muted)] truncate max-w-[200px]">
                {user.email}
              </span>
            )}
            <VisionThemeToggle isDark={isDarkMode} onToggle={onToggleTheme} />
            {!isDemoMode && (
              <button
                type="button"
                onClick={() => void signOutUser()}
                className="btn-icon"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOutIcon />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="surface-card w-full max-w-xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-mono text-[var(--accent)]">Step {step} of 3</p>
              <h1 className="text-xl font-semibold tracking-[-0.015em] text-[var(--text-primary)]">
                {step === 1
                  ? 'Personalize your workspace'
                  : step === 2
                    ? 'Choose your starting format'
                    : 'Select your dashboard modules'}
              </h1>
            </div>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleFinish('blank')}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] underline cursor-pointer shrink-0"
            >
              Skip setup
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {[1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`h-1 rounded-full transition-colors ${
                  idx <= step ? 'bg-[var(--accent)]' : 'bg-[var(--track-bg)]'
                }`}
              />
            ))}
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--semantic-negative-soft)] border border-[var(--semantic-negative-border)] text-xs text-[var(--semantic-negative)]">
              <AlertCircleIcon className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-secondary)]">
                Welcome{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}. Your data is private to your workspace and can be edited anytime directly on the dashboard.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="ob-title">
                    Workspace Title
                  </label>
                  <input
                    id="ob-title"
                    type="text"
                    value={appTitle}
                    onChange={(e) => setAppTitle(e.target.value)}
                    placeholder="My Vision"
                    className="field-input px-3 py-2"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="ob-logo">
                    Badge (1–3 chars)
                  </label>
                  <input
                    id="ob-logo"
                    type="text"
                    maxLength={3}
                    value={appLogoText}
                    onChange={(e) => setAppLogoText(e.target.value)}
                    className="field-input px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="ob-vision">
                    Primary Vision Headline
                  </label>
                  <input
                    id="ob-vision"
                    type="text"
                    value={visionTitle}
                    onChange={(e) => setVisionTitle(e.target.value)}
                    placeholder="My 5-Year Vision"
                    className="field-input px-3 py-2"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="ob-end">
                    Target Horizon Date
                  </label>
                  <input
                    id="ob-end"
                    type="date"
                    value={endDateStr}
                    onChange={(e) => setEndDateStr(e.target.value)}
                    className="field-input px-3 py-2 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setTemplateMode('blank')}
                className={`w-full text-left p-4 rounded-xl border transition-colors cursor-pointer space-y-1 ${
                  templateMode === 'blank'
                    ? 'bg-[var(--accent-soft)] border-[var(--accent-border)]'
                    : 'bg-[var(--bg-raised)] border-[var(--border-hairline)] hover:border-[var(--border-strong)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    Start Fresh (Blank Workspace)
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-hairline)] text-[var(--accent)]">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Open an empty personal tracker using the Z-Vision layout so you add only your own countdowns, missions, and metrics.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTemplateMode('starter')}
                className={`w-full text-left p-4 rounded-xl border transition-colors cursor-pointer space-y-1 ${
                  templateMode === 'starter'
                    ? 'bg-[var(--accent-soft)] border-[var(--accent-border)]'
                    : 'bg-[var(--bg-raised)] border-[var(--border-hairline)] hover:border-[var(--border-strong)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    Generic Example Template
                  </span>
                  {templateMode === 'starter' && (
                    <CheckIcon className="w-4 h-4 text-[var(--accent)]" />
                  )}
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Pre-populates neutral placeholder countdowns, 2 sample phases, and 4 example fitness metrics you can customize or replace anytime.
                </p>
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(
                  [
                    {
                      key: 'calendar',
                      title: 'Calendar',
                      desc: 'Monthly calendar view with weekend highlight',
                    },
                    {
                      key: 'fitness',
                      title: 'Fitness Progress',
                      desc: 'Track measurements, workouts & target dates',
                    },
                    {
                      key: 'calories',
                      title: 'Calorie Tracker',
                      desc: 'Daily kcal, macros, meal logs & quick presets',
                    },
                    {
                      key: 'journaling',
                      title: 'Daily Journaling',
                      desc: 'Private cloud-synced reflections & notes',
                    },
                    {
                      key: 'prayerTimes',
                      title: 'Prayer Times',
                      desc: 'Daily Salah timings & next-prayer countdown',
                    },
                    {
                      key: 'ramadan',
                      title: 'Ramadan Calendar',
                      desc: '30-day Sehri/Iftar schedule & fasting checklist',
                    },
                  ] as { key: keyof DashboardWidgets; title: string; desc: string }[]
                ).map((item) => {
                  const enabled = widgets[item.key];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        setWidgets((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                      }
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-colors flex items-start justify-between gap-2.5 ${
                        enabled
                          ? 'bg-[var(--accent-soft)] border-[var(--accent-border)]'
                          : 'bg-[var(--bg-raised)] border-[var(--border-hairline)] opacity-75'
                      }`}
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="text-xs font-medium text-[var(--text-primary)]">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)] leading-snug">
                          {item.desc}
                        </div>
                      </div>
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 ${
                          enabled
                            ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-fg)]'
                            : 'border-[var(--border-strong)]'
                        }`}
                      >
                        {enabled && <CheckIcon className="w-3 h-3" />}
                      </span>
                    </button>
                  );
                })}
              </div>

              {widgets.calendar && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="ob-weekend">
                    Calendar Weekend Highlight
                  </label>
                  <select
                    id="ob-weekend"
                    value={weekendHighlight}
                    onChange={(e) => setWeekendHighlight(e.target.value as WeekendHighlight)}
                    className="field-input px-3 py-2"
                  >
                    <option value="sat-sun">Saturday &amp; Sunday</option>
                    <option value="friday">Friday</option>
                    <option value="none">No weekend highlight</option>
                  </select>
                </div>
              )}

              {(widgets.prayerTimes || widgets.ramadan) && (
                <div className="surface-raised p-3.5 space-y-2.5">
                  <PrayerLocationPicker value={prayer} onChange={setPrayer} compact />
                </div>
              )}
            </div>
          )}

          <div className="pt-2 flex items-center justify-between gap-3">
            {step > 1 ? (
              <button
                type="button"
                disabled={submitting}
                onClick={() => setStep((prev) => (prev === 3 ? 2 : 1))}
                className="h-9 px-4 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-raised)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                Back
              </button>
            ) : (
              <span />
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev === 1 ? 2 : 3))}
                className="btn-primary h-9 px-5 text-xs"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleFinish()}
                className="btn-primary h-9 px-5 text-xs"
              >
                {submitting ? 'Creating workspace…' : 'Launch my dashboard'}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default OnboardingFlow;
