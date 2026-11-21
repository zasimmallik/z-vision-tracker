import React from 'react';
import { SunIcon, MoonIcon } from '../shared/Icons';

interface VisionThemeToggleProps {
  isDark: boolean;
  onToggle: (dark: boolean) => void;
  className?: string;
}

export const VisionThemeToggle: React.FC<VisionThemeToggleProps> = ({
  isDark,
  onToggle,
  className = '',
}) => {
  return (
    <div
      className={`inline-flex items-center p-1 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-raised)] select-none ${className}`}
      role="group"
      aria-label="Color theme"
    >
      <button
        type="button"
        onClick={() => onToggle(false)}
        className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium cursor-pointer transition-[background-color,color,border-color] duration-150 ${
          !isDark
            ? 'bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-hairline)] shadow-[0_1px_2px_rgba(20,20,22,0.06)]'
            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-transparent'
        }`}
        aria-pressed={!isDark}
      >
        <SunIcon className="w-3.5 h-3.5 shrink-0" />
        <span>Light</span>
      </button>

      <button
        type="button"
        onClick={() => onToggle(true)}
        className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium cursor-pointer transition-[background-color,color,border-color] duration-150 ${
          isDark
            ? 'bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-hairline)]'
            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-transparent'
        }`}
        aria-pressed={isDark}
      >
        <MoonIcon className="w-3.5 h-3.5 shrink-0" />
        <span>Dark</span>
      </button>
    </div>
  );
};

export default VisionThemeToggle;
