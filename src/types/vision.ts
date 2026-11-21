export type MilestoneIcon = 'clock' | 'target' | 'zap';

export type MilestoneColor =
  | 'white'
  | 'light-blue'
  | 'blue'
  | 'dark-blue'
  | 'green'
  | 'cyan'
  | 'purple';

export interface CountdownMilestone {
  id: string;
  name: string;
  startDate?: string;
  endDate: string;
  icon: MilestoneIcon;
  color: MilestoneColor;
}

export interface Duration {
  years?: number;
  months: number;
  days?: number;
  weeks?: number;
  totalMonths?: number;
  totalWeeks?: number;
  totalDays?: number;
}

export type MilestoneStatus = 'in-progress' | 'upcoming' | 'completed';

export interface Milestone {
  id: number;
  title: string;
  status: MilestoneStatus;
  deadline: string;
  points?: string[];
  details?: string;
}

export interface Mission {
  id: number;
  title: string;
  period: string;
  duration: Duration;
  milestones: Milestone[];
}

export interface VisionData {
  title: string;
  subtitle: string;
  visionPeriod: string;
  endDate: string;
  businesses: string[];
  missions: Mission[];
}

export type FitnessMetricDirection = 'increase' | 'decrease' | 'static';

export interface FitnessMetric {
  id: string | number;
  label: string;
  current: string | number;
  target: string | number;
  unit?: string;
  direction?: FitnessMetricDirection;
}

export interface FitnessData {
  title?: string;
  birthDate?: string;
  targetDate: string;
  metrics: FitnessMetric[];
}

export interface JournalEntry {
  id: string;
  content: string;
  createdAt: number;
  updatedAt?: number;
}

export type PrayerCalculationMethodKey =
  | 'Karachi'
  | 'MuslimWorldLeague'
  | 'NorthAmerica'
  | 'UmmAlQura'
  | 'Egyptian'
  | 'Turkey'
  | 'Singapore'
  | 'Dubai'
  | 'Qatar'
  | 'Kuwait'
  | 'MoonsightingCommittee'
  | 'Tehran';

export type PrayerMadhabKey = 'Hanafi' | 'Shafi';

export interface PrayerSettings {
  cityName: string;
  latitude: number;
  longitude: number;
  timezone: string;
  calculationMethod: PrayerCalculationMethodKey;
  madhab: PrayerMadhabKey;
}

export type WeekendHighlight = 'friday' | 'sat-sun' | 'none';

export interface DashboardWidgets {
  prayerTimes: boolean;
  fitness: boolean;
  journaling: boolean;
  calendar: boolean;
}

export interface AppSettings {
  appTitle: string;
  appLogoText: string;
  prayer: PrayerSettings;
  widgets?: DashboardWidgets;
  weekendHighlight?: WeekendHighlight;
}

export interface OnboardingChoices {
  appTitle: string;
  appLogoText: string;
  visionTitle: string;
  visionEndDate: string;
  templateMode: 'blank' | 'starter';
  widgets: DashboardWidgets;
  weekendHighlight: WeekendHighlight;
  prayer: PrayerSettings;
}

export interface VisionBackupPayload {
  version: 1;
  exportedAt: string;
  vision: VisionData;
  countdowns: CountdownMilestone[];
  fitness: FitnessData;
  settings: AppSettings;
  journal: JournalEntry[];
}
