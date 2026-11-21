import React from 'react';

interface IconProps {
  className?: string;
}

const baseProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true as const,
};

export const SunIcon: React.FC<IconProps> = ({ className = 'w-4 h-4 shrink-0' }) => (
  <svg {...baseProps} className={className}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);

export const SunriseIcon: React.FC<IconProps> = ({ className = 'w-4 h-4 shrink-0' }) => (
  <svg {...baseProps} className={className}>
    <path d="M12 2v8M4.93 10.93l1.41 1.41M2 18h2M20 18h2M19.07 10.93l-1.41 1.41M22 22H2M8 6l4-4 4 4M16 18a4 4 0 0 0-8 0" />
  </svg>
);

export const SunsetIcon: React.FC<IconProps> = ({ className = 'w-4 h-4 shrink-0' }) => (
  <svg {...baseProps} className={className}>
    <path d="M12 10V2M4.93 10.93l1.41 1.41M2 18h2M20 18h2M19.07 10.93l-1.41 1.41M22 22H2M16 6l-4 4-4-4M16 18a4 4 0 0 0-8 0" />
  </svg>
);

export const MoonIcon: React.FC<IconProps> = ({ className = 'w-4 h-4 shrink-0' }) => (
  <svg {...baseProps} className={className}>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

export const CloudSunIcon: React.FC<IconProps> = ({ className = 'w-4 h-4 shrink-0' }) => (
  <svg {...baseProps} className={className}>
    <path d="M12 2v2M4.93 4.93l1.41 1.41M20 12h2M19.07 4.93l-1.41 1.41M15.947 12.65a4 4 0 0 0-5.925-4.128M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z" />
  </svg>
);

export const ClockIcon: React.FC<IconProps> = ({ className = 'w-4 h-4 shrink-0' }) => (
  <svg {...baseProps} className={className}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export const CalendarIcon: React.FC<IconProps> = ({ className = 'w-4 h-4 shrink-0' }) => (
  <svg {...baseProps} className={className}>
    <path d="M8 2v4M16 2v4" />
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <path d="M3 10h18" />
  </svg>
);

export const ChevronLeftIcon: React.FC<IconProps> = ({ className = 'w-4 h-4 shrink-0' }) => (
  <svg {...baseProps} className={className}>
    <path d="m15 18-6-6 6-6" />
  </svg>
);

export const ChevronRightIcon: React.FC<IconProps> = ({ className = 'w-4 h-4 shrink-0' }) => (
  <svg {...baseProps} className={className}>
    <path d="m9 18 6-6-6-6" />
  </svg>
);

export const ChevronDownIcon: React.FC<IconProps> = ({ className = 'w-4 h-4 shrink-0' }) => (
  <svg {...baseProps} className={className}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const TargetIcon: React.FC<IconProps> = ({ className = 'w-4 h-4 shrink-0' }) => (
  <svg {...baseProps} className={className}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

export const FlagIcon: React.FC<IconProps> = ({ className = 'w-4 h-4 shrink-0' }) => (
  <svg {...baseProps} className={className}>
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" x2="4" y1="22" y2="15" />
  </svg>
);

export const LayersIcon: React.FC<IconProps> = ({ className = 'w-4 h-4 shrink-0' }) => (
  <svg {...baseProps} className={className}>
    <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
    <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
    <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
  </svg>
);

export const ActivityIcon: React.FC<IconProps> = ({ className = 'w-4 h-4 shrink-0' }) => (
  <svg {...baseProps} className={className}>
    <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
  </svg>
);

export const PenLineIcon: React.FC<IconProps> = ({ className = 'w-4 h-4 shrink-0' }) => (
  <svg {...baseProps} className={className}>
    <path d="M12 20h9" />
    <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
  </svg>
);

export const TrashIcon: React.FC<IconProps> = ({ className = 'w-4 h-4 shrink-0' }) => (
  <svg {...baseProps} className={className}>
    <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);

export const CheckIcon: React.FC<IconProps> = ({ className = 'w-3.5 h-3.5 shrink-0' }) => (
  <svg {...baseProps} strokeWidth={2} className={className}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const AlertCircleIcon: React.FC<IconProps> = ({ className = 'w-4 h-4 shrink-0' }) => (
  <svg {...baseProps} className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="8" y2="12" />
    <line x1="12" x2="12.01" y1="16" y2="16" />
  </svg>
);

export const PlusIcon: React.FC<IconProps> = ({ className = 'w-4 h-4 shrink-0' }) => (
  <svg {...baseProps} className={className}>
    <path d="M5 12h14M12 5v14" />
  </svg>
);

export const EditIcon: React.FC<IconProps> = ({ className = 'w-4 h-4 shrink-0' }) => (
  <svg {...baseProps} className={className}>
    <path d="M12 20h9" />
    <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
  </svg>
);

export const XIcon: React.FC<IconProps> = ({ className = 'w-4 h-4 shrink-0' }) => (
  <svg {...baseProps} className={className}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const SettingsIcon: React.FC<IconProps> = ({ className = 'w-4 h-4 shrink-0' }) => (
  <svg {...baseProps} className={className}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const DownloadIcon: React.FC<IconProps> = ({ className = 'w-4 h-4 shrink-0' }) => (
  <svg {...baseProps} className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </svg>
);

export const UploadIcon: React.FC<IconProps> = ({ className = 'w-4 h-4 shrink-0' }) => (
  <svg {...baseProps} className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" x2="12" y1="3" y2="15" />
  </svg>
);

export const ArrowUpIcon: React.FC<IconProps> = ({ className = 'w-4 h-4 shrink-0' }) => (
  <svg {...baseProps} className={className}>
    <path d="m18 15-6-6-6 6" />
  </svg>
);

export const ArrowDownIcon: React.FC<IconProps> = ({ className = 'w-4 h-4 shrink-0' }) => (
  <svg {...baseProps} className={className}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const LogOutIcon: React.FC<IconProps> = ({ className = 'w-4 h-4 shrink-0' }) => (
  <svg {...baseProps} className={className}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" x2="9" y1="12" y2="12" />
  </svg>
);

export const MapPinIcon: React.FC<IconProps> = ({ className = 'w-4 h-4 shrink-0' }) => (
  <svg {...baseProps} className={className}>
    <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export const CloudCheckIcon: React.FC<IconProps> = ({ className = 'w-4 h-4 shrink-0' }) => (
  <svg {...baseProps} className={className}>
    <path d="M12 13v8l-4-4" />
    <path d="m12 21 4-4" />
    <path d="M4.393 15.269A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.436 8.284" />
  </svg>
);

export const RefreshCwIcon: React.FC<IconProps> = ({ className = 'w-4 h-4 shrink-0' }) => (
  <svg {...baseProps} className={className}>
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M8 16H3v5" />
  </svg>
);

export const LockIcon: React.FC<IconProps> = ({ className = 'w-4 h-4 shrink-0' }) => (
  <svg {...baseProps} className={className}>
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export const SearchIcon: React.FC<IconProps> = ({ className = 'w-4 h-4 shrink-0' }) => (
  <svg {...baseProps} className={className}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export const CompassIcon: React.FC<IconProps> = ({ className = 'w-4 h-4 shrink-0' }) => (
  <svg {...baseProps} className={className}>
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </svg>
);
