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

export type MilestoneCategory =
  | 'default'
  | 'revenue'
  | 'net-worth'
  | 'life'
  | 'relocation';

export interface Milestone {
  id: number;
  title: string;
  status: MilestoneStatus;
  deadline: string;
  category?: MilestoneCategory;
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

export type DashboardCardId =
  | 'clock'
  | 'prayerTimes'
  | 'ramadan'
  | 'calendar'
  | 'countdowns'
  | 'missions'
  | 'fitness'
  | 'calories'
  | 'journaling';

export interface DashboardWidgets {
  prayerTimes: boolean;
  ramadan: boolean;
  fitness: boolean;
  calories: boolean;
  journaling: boolean;
  calendar: boolean;
}

export interface DashboardLayout {
  primary: DashboardCardId[];
  secondary: DashboardCardId[];
  mobile?: DashboardCardId[];
}

export interface AppSettings {
  appTitle: string;
  appLogoText: string;
  prayer: PrayerSettings;
  widgets?: DashboardWidgets;
  weekendHighlight?: WeekendHighlight;
  layout?: DashboardLayout;
}

export interface RamadanData {
  hijriYear: number;
  hijriOffset: number;
  fastedDays: Record<string, boolean>;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface CalorieGoals {
  dailyCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}

export interface CalorieFoodPreset {
  id: string;
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  defaultMeal?: MealType;
}

export interface CalorieConfig {
  goals: CalorieGoals;
  presets: CalorieFoodPreset[];
}

export interface CalorieLogEntry {
  id: string;
  name: string;
  meal: MealType;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  createdAt: number;
}

export interface DailyCalorieLog {
  date: string;
  entries: CalorieLogEntry[];
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

export interface WorkspaceSnapshot {
  exists: boolean;
  vision: VisionData;
  countdowns: CountdownMilestone[];
  fitness: FitnessData;
  settings: AppSettings;
  ramadan: RamadanData;
  caloriesConfig: CalorieConfig;
  journal: JournalEntry[];
  calorieLogs: Record<string, DailyCalorieLog>;
}

export interface VisionBackupPayload {
  version: 1 | 2;
  exportedAt: string;
  vision: VisionData;
  countdowns: CountdownMilestone[];
  fitness: FitnessData;
  settings: AppSettings;
  journal: JournalEntry[];
  ramadan?: RamadanData;
  caloriesConfig?: CalorieConfig;
  calorieLogs?: Record<string, DailyCalorieLog>;
}
