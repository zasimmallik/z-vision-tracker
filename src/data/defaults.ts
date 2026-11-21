import type {
  AppSettings,
  CountdownMilestone,
  DashboardWidgets,
  FitnessData,
  OnboardingChoices,
  PrayerSettings,
  VisionData,
} from '../types/vision';

export const DEFAULT_WIDGETS_EXISTING: DashboardWidgets = {
  prayerTimes: true,
  fitness: true,
  journaling: true,
  calendar: true,
};

export const DEFAULT_WIDGETS_NEW_USER: DashboardWidgets = {
  prayerTimes: true,
  fitness: true,
  journaling: true,
  calendar: true,
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

export const DEFAULT_PRAYER_SETTINGS: PrayerSettings = {
  ...PRAYER_CITY_PRESETS[5],
  timezone: detectBrowserTimezone(),
};

export const DEFAULT_SETTINGS: AppSettings = {
  appTitle: 'Z Vision',
  appLogoText: 'Z',
  prayer: DEFAULT_PRAYER_SETTINGS,
  widgets: DEFAULT_WIDGETS_NEW_USER,
  weekendHighlight: 'sat-sun',
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
    },
  };
};

export const createStarterTemplate = (
  choices: OnboardingChoices
): {
  vision: VisionData;
  countdowns: CountdownMilestone[];
  fitness: FitnessData;
  settings: AppSettings;
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
    },
  };
};
