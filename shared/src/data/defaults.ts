import { getCurrentHijriYear } from '../utils/ramadanCalendar.js';
import type {
  AppSettings,
  CalorieConfig,
  CountdownMilestone,
  DashboardCardId,
  DashboardLayout,
  DashboardWidgets,
  FitnessData,
  OnboardingChoices,
  PrayerSettings,
  RamadanData,
  VisionData,
} from '../types/vision.js';

export const DEFAULT_WIDGETS_EXISTING: DashboardWidgets = {
  prayerTimes: true,
  ramadan: false,
  fitness: true,
  calories: false,
  journaling: true,
  calendar: true,
};

export const DEFAULT_WIDGETS_NEW_USER: DashboardWidgets = {
  prayerTimes: true,
  ramadan: false,
  fitness: true,
  calories: true,
  journaling: true,
  calendar: true,
};

export const DEFAULT_MOBILE_ORDER: DashboardCardId[] = [
  'clock',
  'prayerTimes',
  'countdowns',
  'calendar',
  'missions',
  'fitness',
  'journaling',
  'ramadan',
  'calories',
];

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  primary: ['clock', 'prayerTimes', 'calendar', 'missions', 'journaling', 'ramadan'],
  secondary: ['countdowns', 'fitness', 'calories'],
  mobile: [...DEFAULT_MOBILE_ORDER],
};

const ALL_CARD_IDS: DashboardCardId[] = [
  'clock',
  'prayerTimes',
  'ramadan',
  'calendar',
  'countdowns',
  'missions',
  'fitness',
  'calories',
  'journaling',
];

export const isCardEnabled = (
  id: DashboardCardId,
  widgets: DashboardWidgets
): boolean => {
  switch (id) {
    case 'prayerTimes':
      return widgets.prayerTimes;
    case 'ramadan':
      return widgets.ramadan;
    case 'calendar':
      return widgets.calendar;
    case 'fitness':
      return widgets.fitness;
    case 'calories':
      return widgets.calories;
    case 'journaling':
      return widgets.journaling;
    case 'clock':
    case 'countdowns':
    case 'missions':
    default:
      return true;
  }
};

export const reconcileLayout = (
  layout: Partial<DashboardLayout> | undefined,
  widgets: DashboardWidgets = DEFAULT_WIDGETS_EXISTING
): Required<DashboardLayout> => {
  const seen = new Set<DashboardCardId>();
  const primary: DashboardCardId[] = [];
  const secondary: DashboardCardId[] = [];

  const validIdSet = new Set<string>(ALL_CARD_IDS);

  const pushUnique = (target: DashboardCardId[], list?: unknown[]) => {
    if (!Array.isArray(list)) return;
    for (const raw of list) {
      if (typeof raw !== 'string' || !validIdSet.has(raw)) continue;
      const id = raw as DashboardCardId;
      if (seen.has(id) || !isCardEnabled(id, widgets)) continue;
      seen.add(id);
      target.push(id);
    }
  };

  pushUnique(primary, layout?.primary);
  pushUnique(secondary, layout?.secondary);

  // Place any missing enabled cards into their default column
  for (const id of DEFAULT_DASHBOARD_LAYOUT.primary) {
    if (!seen.has(id) && isCardEnabled(id, widgets)) {
      seen.add(id);
      primary.push(id);
    }
  }
  for (const id of DEFAULT_DASHBOARD_LAYOUT.secondary) {
    if (!seen.has(id) && isCardEnabled(id, widgets)) {
      seen.add(id);
      secondary.push(id);
    }
  }

  const mobileSeen = new Set<DashboardCardId>();
  const mobile: DashboardCardId[] = [];

  if (Array.isArray(layout?.mobile) && layout.mobile.length > 0) {
    for (const raw of layout.mobile) {
      if (typeof raw !== 'string' || !validIdSet.has(raw)) continue;
      const id = raw as DashboardCardId;
      if (mobileSeen.has(id) || !isCardEnabled(id, widgets)) continue;
      mobileSeen.add(id);
      mobile.push(id);
    }
  }

  for (const id of DEFAULT_MOBILE_ORDER) {
    if (!mobileSeen.has(id) && isCardEnabled(id, widgets)) {
      mobileSeen.add(id);
      mobile.push(id);
    }
  }

  return { primary, secondary, mobile };
};

export const detectBrowserTimezone = (): string => {
  if (typeof Intl !== 'undefined') {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) return tz;
    } catch {
      // ignore timezone detection error
    }
  }
  return 'UTC';
};

export const PRAYER_CITY_PRESETS: PrayerSettings[] = [
  {
    cityName: 'Makkah',
    latitude: 21.4225,
    longitude: 39.8262,
    timezone: 'Asia/Riyadh',
    calculationMethod: 'UmmAlQura',
    madhab: 'Shafi',
  },
  {
    cityName: 'Madinah',
    latitude: 24.4672,
    longitude: 39.6112,
    timezone: 'Asia/Riyadh',
    calculationMethod: 'UmmAlQura',
    madhab: 'Shafi',
  },
  {
    cityName: 'Istanbul',
    latitude: 41.0082,
    longitude: 28.9784,
    timezone: 'Europe/Istanbul',
    calculationMethod: 'Turkey',
    madhab: 'Hanafi',
  },
  {
    cityName: 'Dhaka',
    latitude: 23.8103,
    longitude: 90.4125,
    timezone: 'Asia/Dhaka',
    calculationMethod: 'Karachi',
    madhab: 'Hanafi',
  },
  {
    cityName: 'Barishal',
    latitude: 22.701,
    longitude: 90.3535,
    timezone: 'Asia/Dhaka',
    calculationMethod: 'Karachi',
    madhab: 'Hanafi',
  },
  {
    cityName: 'London',
    latitude: 51.5074,
    longitude: -0.1278,
    timezone: 'Europe/London',
    calculationMethod: 'MuslimWorldLeague',
    madhab: 'Shafi',
  },
  {
    cityName: 'New York',
    latitude: 40.7128,
    longitude: -74.006,
    timezone: 'America/New_York',
    calculationMethod: 'NorthAmerica',
    madhab: 'Shafi',
  },
  {
    cityName: 'Dubai',
    latitude: 25.2048,
    longitude: 55.2708,
    timezone: 'Asia/Dubai',
    calculationMethod: 'Dubai',
    madhab: 'Shafi',
  },
  {
    cityName: 'Cairo',
    latitude: 30.0444,
    longitude: 31.2357,
    timezone: 'Africa/Cairo',
    calculationMethod: 'Egyptian',
    madhab: 'Shafi',
  },
  {
    cityName: 'Jakarta',
    latitude: -6.2088,
    longitude: 106.8456,
    timezone: 'Asia/Jakarta',
    calculationMethod: 'Singapore',
    madhab: 'Shafi',
  },
  {
    cityName: 'Kuala Lumpur',
    latitude: 3.139,
    longitude: 101.6869,
    timezone: 'Asia/Kuala_Lumpur',
    calculationMethod: 'Singapore',
    madhab: 'Shafi',
  },
  {
    cityName: 'Silicon Valley',
    latitude: 37.3382,
    longitude: -121.8863,
    timezone: 'America/Los_Angeles',
    calculationMethod: 'NorthAmerica',
    madhab: 'Hanafi',
  },
];

export const getDefaultPrayerSettings = (
  timeZone: string = detectBrowserTimezone()
): PrayerSettings => {
  const exact = PRAYER_CITY_PRESETS.find((p) => p.timezone === timeZone);
  if (exact) return { ...exact };
  // Fall back to London with its matching Europe/London timezone so coords & tz never mismatch
  return { ...PRAYER_CITY_PRESETS[5] };
};

export const DEFAULT_PRAYER_SETTINGS: PrayerSettings = getDefaultPrayerSettings();

export const DEFAULT_SETTINGS: AppSettings = {
  appTitle: 'Z Vision',
  appLogoText: 'Z',
  prayer: DEFAULT_PRAYER_SETTINGS,
  widgets: DEFAULT_WIDGETS_NEW_USER,
  weekendHighlight: 'sat-sun',
  layout: reconcileLayout(DEFAULT_DASHBOARD_LAYOUT, DEFAULT_WIDGETS_NEW_USER),
};

export const DEFAULT_RAMADAN_DATA: RamadanData = {
  hijriYear: getCurrentHijriYear(new Date(), DEFAULT_PRAYER_SETTINGS.timezone),
  hijriOffset: 0,
  fastedDays: {},
};

export const DEFAULT_CALORIE_CONFIG: CalorieConfig = {
  goals: {
    dailyCalories: 2200,
    proteinGrams: 150,
    carbsGrams: 220,
    fatGrams: 70,
  },
  presets: [
    {
      id: 'preset-eggs',
      name: '2 Boiled Eggs',
      calories: 155,
      protein: 13,
      carbs: 1,
      fat: 11,
      defaultMeal: 'breakfast',
    },
    {
      id: 'preset-oats',
      name: 'Oatmeal & Banana',
      calories: 320,
      protein: 10,
      carbs: 58,
      fat: 6,
      defaultMeal: 'breakfast',
    },
    {
      id: 'preset-chicken',
      name: 'Grilled Chicken (150g)',
      calories: 250,
      protein: 46,
      carbs: 0,
      fat: 5,
      defaultMeal: 'lunch',
    },
    {
      id: 'preset-dates',
      name: '3 Dates & Water',
      calories: 70,
      protein: 1,
      carbs: 18,
      fat: 0,
      defaultMeal: 'snack',
    },
    {
      id: 'preset-rice-dal',
      name: 'Rice & Lentils Bowl',
      calories: 430,
      protein: 16,
      carbs: 74,
      fat: 7,
      defaultMeal: 'dinner',
    },
  ],
};

const futureEndDateIso = (yearsAhead: number): string => {
  const year = new Date().getFullYear() + yearsAhead;
  return `${year}-12-31T23:59:59`;
};

export const EMPTY_VISION: VisionData = {
  title: 'My Personal Vision',
  subtitle: 'Define your horizon, key pillars, and missions',
  visionPeriod: '',
  endDate: futureEndDateIso(5),
  businesses: [],
  missions: [],
};

export const EMPTY_FITNESS: FitnessData = {
  title: 'Fitness Progress',
  targetDate: futureEndDateIso(1),
  metrics: [],
};

export const createBlankTemplate = (
  choices: OnboardingChoices
): {
  vision: VisionData;
  countdowns: CountdownMilestone[];
  fitness: FitnessData;
  settings: AppSettings;
  ramadan: RamadanData;
  caloriesConfig: CalorieConfig;
} => {
  const endDate = choices.visionEndDate || futureEndDateIso(5);
  const formattedEnd = new Date(endDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return {
    vision: {
      title: choices.visionTitle.trim() || 'My 5-Year Vision',
      subtitle: `Target horizon: ${formattedEnd}`,
      visionPeriod: `Between now and ${formattedEnd}`,
      endDate,
      businesses: [],
      missions: [],
    },
    countdowns: [],
    fitness: {
      title: 'Fitness Progress',
      targetDate: futureEndDateIso(1),
      metrics: [],
    },
    settings: {
      appTitle: choices.appTitle.trim() || 'My Vision',
      appLogoText: choices.appLogoText.trim().slice(0, 3) || 'V',
      prayer: choices.prayer,
      widgets: choices.widgets,
      weekendHighlight: choices.weekendHighlight,
      layout: reconcileLayout(DEFAULT_DASHBOARD_LAYOUT, choices.widgets),
    },
    ramadan: {
      hijriYear: getCurrentHijriYear(new Date(), choices.prayer.timezone),
      hijriOffset: 0,
      fastedDays: {},
    },
    caloriesConfig: DEFAULT_CALORIE_CONFIG,
  };
};

export const createStarterTemplate = (
  choices: OnboardingChoices
): {
  vision: VisionData;
  countdowns: CountdownMilestone[];
  fitness: FitnessData;
  settings: AppSettings;
  ramadan: RamadanData;
  caloriesConfig: CalorieConfig;
} => {
  const nowYear = new Date().getFullYear();
  const oneYearIso = `${nowYear + 1}-12-31T23:59:59`;
  const threeYearIso = `${nowYear + 3}-12-31T23:59:59`;
  const endDate = choices.visionEndDate || futureEndDateIso(5);
  const formattedEnd = new Date(endDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const sprintEnd = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  const sprintIso = `${sprintEnd.toISOString().slice(0, 10)}T23:59:59`;

  const countdowns: CountdownMilestone[] = [
    {
      id: 'cd-90-day-sprint',
      name: '90-Day Focus Sprint',
      endDate: sprintIso,
      icon: 'clock',
      color: 'white',
    },
    {
      id: 'cd-year-milestone',
      name: 'Year 1 Milestone',
      endDate: oneYearIso,
      icon: 'zap',
      color: 'light-blue',
    },
    {
      id: 'cd-primary-vision',
      name: choices.visionTitle.trim() || 'Primary Vision',
      endDate,
      icon: 'target',
      color: 'green',
    },
  ];

  const vision: VisionData = {
    title: choices.visionTitle.trim() || 'My 5-Year Vision',
    subtitle: `Between now and ${formattedEnd}`,
    visionPeriod: `Between now and ${formattedEnd}`,
    endDate,
    businesses: [
      'Core Career & Craft',
      'Independent Product / Side Venture',
      'Health, Reading & Continuous Learning',
    ],
    missions: [
      {
        id: 1,
        title: 'Phase 1: Foundations & Momentum',
        period: `Next 12 months (${nowYear}–${nowYear + 1})`,
        duration: {
          years: 1,
          months: 0,
        },
        milestones: [
          {
            id: 1,
            title: 'Establish core daily habits and deep-work routine',
            deadline: `By Q2 ${nowYear + 1}`,
            status: 'in-progress',
            category: 'default',
            points: [
              'Block 2 hours daily for focused skill building or shipping.',
              'Track weekly progress in the Journal section every Sunday.',
            ],
          },
          {
            id: 2,
            title: 'Ship first major portfolio project or venture MVP',
            deadline: `By December 31, ${nowYear + 1}`,
            status: 'upcoming',
            category: 'revenue',
            points: [
              'Define clear scope and publish v1 before year end.',
              'Collect real feedback and iterate weekly.',
            ],
          },
        ],
      },
      {
        id: 2,
        title: 'Phase 2: Scale & Financial Independence',
        period: `${nowYear + 2} – ${new Date(threeYearIso).getFullYear()}`,
        duration: {
          years: 2,
          months: 0,
        },
        milestones: [
          {
            id: 3,
            title: 'Grow primary career / venture impact and savings runway',
            deadline: `By December 31, ${nowYear + 3}`,
            status: 'upcoming',
            category: 'net-worth',
            points: [
              'Build 12-month emergency & investment runway.',
              'Automate recurring investments and skill compounding.',
            ],
          },
          {
            id: 4,
            title: 'Achieve long-term lifestyle & travel milestones',
            deadline: `By ${formattedEnd}`,
            status: 'upcoming',
            category: 'life',
            points: [
              'Customize or replace these sample goals anytime using Edit mode.',
            ],
          },
        ],
      },
    ],
  };

  const fitness: FitnessData = {
    title: 'Fitness Progress',
    targetDate: oneYearIso,
    metrics: [
      { id: 1, label: 'Weight', current: '74kg', target: '70kg', direction: 'decrease' },
      { id: 2, label: 'Body Fat', current: '20%', target: '15%', direction: 'decrease' },
      { id: 3, label: 'Weekly Workouts', current: 2, target: 4, unit: 'sessions', direction: 'increase' },
      { id: 4, label: 'Daily Steps', current: 6000, target: 10000, unit: 'steps', direction: 'increase' },
    ],
  };

  return {
    vision,
    countdowns,
    fitness,
    settings: {
      appTitle: choices.appTitle.trim() || 'My Vision',
      appLogoText: choices.appLogoText.trim().slice(0, 3) || 'V',
      prayer: choices.prayer,
      widgets: choices.widgets,
      weekendHighlight: choices.weekendHighlight,
      layout: reconcileLayout(DEFAULT_DASHBOARD_LAYOUT, choices.widgets),
    },
    ramadan: {
      hijriYear: getCurrentHijriYear(new Date(), choices.prayer.timezone),
      hijriOffset: 0,
      fastedDays: {},
    },
    caloriesConfig: DEFAULT_CALORIE_CONFIG,
  };
};
