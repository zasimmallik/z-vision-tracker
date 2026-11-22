import React from 'react';
import { useAuth } from '../../app/providers/AuthContext';
import { VisionThemeToggle } from '../../shared/components/VisionThemeToggle';
import {
  ActivityIcon,
  AlertCircleIcon,
  ClockIcon,
  LayersIcon,
  LockIcon,
} from '../../shared/components/Icons';

interface LoginScreenProps {
  isDark: boolean;
  onToggleTheme: (dark: boolean) => void;
  onTryDemo?: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({
  isDark,
  onToggleTheme,
  onTryDemo,
}) => {
  const { isConfigured, signingIn, error, signInWithGoogle, clearError } = useAuth();

  return (
    <div className="min-h-[100dvh] flex flex-col text-[var(--text-primary)]">
      <header className="h-14 border-b border-[var(--border-hairline)] bg-[var(--bg-chrome)] backdrop-blur-md">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-[var(--text-primary)] text-[var(--bg-card)] flex items-center justify-center text-sm font-semibold select-none">
              Z
            </div>
            <span className="text-base font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
              Z Vision
            </span>
          </div>
          <VisionThemeToggle isDark={isDark} onToggle={onToggleTheme} />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 gap-4">
        {!isConfigured ? (
          <div className="surface-card w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-[var(--semantic-warning)]">
              <AlertCircleIcon className="w-5 h-5 shrink-0" />
              <h1 className="text-base font-semibold text-[var(--text-primary)]">
                Firebase environment setup required
              </h1>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Add your Firebase Web SDK credentials to{' '}
              <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-[var(--bg-raised)]">
                frontend/.env.local
              </code>{' '}
              (or try the offline Interactive Demo below):
            </p>
            <pre className="surface-raised p-3 text-xs font-mono text-[var(--text-secondary)] overflow-x-auto leading-relaxed">
{`VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...`}
            </pre>
            {onTryDemo && (
              <button
                type="button"
                onClick={onTryDemo}
                className="btn-primary w-full h-10 text-sm"
              >
                Try Interactive Demo
              </button>
            )}
          </div>
        ) : (
          <div className="surface-card w-full max-w-lg p-6 sm:p-8 space-y-6">
            <div className="space-y-3 text-center">
              <div className="mx-auto w-11 h-11 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-hairline)] flex items-center justify-center text-[var(--accent)]">
                <LockIcon className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                Design and track your personal vision
              </h1>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-md mx-auto">
                Live countdowns, multi-year mission roadmaps, fitness &amp; calorie tracking, prayer &amp; Ramadan schedules, and daily journaling — tailored to your preferences.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="surface-raised p-3 flex items-start gap-2.5">
                <ClockIcon className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-[var(--text-primary)]">Live Countdowns</div>
                  <div className="text-[11px] text-[var(--text-muted)]">Custom horizons &amp; drag layout</div>
                </div>
              </div>
              <div className="surface-raised p-3 flex items-start gap-2.5">
                <LayersIcon className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-[var(--text-primary)]">Mission Roadmap</div>
                  <div className="text-[11px] text-[var(--text-muted)]">Phases, goals &amp; 1-click status</div>
                </div>
              </div>
              <div className="surface-raised p-3 flex items-start gap-2.5">
                <ActivityIcon className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-[var(--text-primary)]">Health &amp; Worship</div>
                  <div className="text-[11px] text-[var(--text-muted)]">Calories, fitness, prayer &amp; Ramadan</div>
                </div>
              </div>
              <div className="surface-raised p-3 flex items-start gap-2.5">
                <LockIcon className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-[var(--text-primary)]">Isolated Workspace</div>
                  <div className="text-[11px] text-[var(--text-muted)]">Your own private fresh app</div>
                </div>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3 rounded-lg bg-[var(--semantic-negative-soft)] border border-[var(--semantic-negative-border)] text-xs text-[var(--semantic-negative)]"
              >
                <AlertCircleIcon className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="leading-relaxed">{error}</p>
                  <button
                    type="button"
                    onClick={clearError}
                    className="underline cursor-pointer opacity-80 hover:opacity-100"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => void signInWithGoogle()}
                disabled={signingIn}
                className="btn-primary w-full h-11 text-sm"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="shrink-0"
                >
                  <path
                    fill="currentColor"
                    d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"
                  />
                </svg>
                <span>{signingIn ? 'Signing in…' : 'Continue with Google'}</span>
              </button>

              {onTryDemo && (
                <button
                  type="button"
                  onClick={onTryDemo}
                  className="w-full h-10 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-raised)] hover:bg-[var(--bg-hover)] text-sm font-medium text-[var(--text-primary)] cursor-pointer transition-colors"
                >
                  Try Interactive Demo
                </button>
              )}
            </div>

            <p className="text-center text-xs text-[var(--text-muted)]">
              Every Google account gets its own separate, private workspace. Edit and arrange cards directly inside the app.
            </p>
          </div>
        )}

        <footer className="text-center text-xs text-[var(--text-muted)] flex flex-wrap items-center justify-center gap-3">
          <span>Private per-account cloud sync</span>
          <span>·</span>
          <a
            href="https://github.com/zasimmallik/z-vision-tracker"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--text-primary)] underline underline-offset-2 transition-colors"
          >
            Source on GitHub
          </a>
        </footer>
      </main>
    </div>
  );
};

export default LoginScreen;
