import { z } from 'zod';
import {
  DEFAULT_CALORIE_CONFIG,
  DEFAULT_PRAYER_SETTINGS,
  DEFAULT_RAMADAN_DATA,
  DEFAULT_SETTINGS,
  DEFAULT_WIDGETS_EXISTING,
  EMPTY_FITNESS,
  EMPTY_VISION,
  reconcileLayout,
} from '../data/defaults.js';
import type {
  AppSettings,
  CalorieConfig,
  CountdownMilestone,
  DailyCalorieLog,
  DashboardCardId,
  DashboardLayout,
  DashboardWidgets,
  FitnessData,
  JournalEntry,
  OnboardingChoices,
  PrayerSettings,
  RamadanData,
  VisionBackupPayload,
  VisionData,
} from '../types/vision.js';

export const milestoneIconSchema = z.enum(['clock', 'target', 'zap']);

export const milestoneColorSchema = z.enum([
  'white',
  'light-blue',
  'blue',
  'dark-blue',
  'green',
  'cyan',
  'purple',
]);

export const countdownMilestoneSchema: z.ZodType<CountdownMilestone> = z.object({
  id: z.string().min(1).max(128),
  name: z.string().min(1).max(200),
  startDate: z.string().max(100).optional(),
  endDate: z.string().min(1).max(100),
  icon: milestoneIconSchema,
  color: milestoneColorSchema,
});

export const countdownsUpdateSchema = z.object({
  items: z.array(countdownMilestoneSchema).max(100),
});

export const milestoneStatusSchema = z.enum(['in-progress', 'upcoming', 'completed']);

export const milestoneCategorySchema = z.enum([
  'default',
  'revenue',
  'net-worth',
  'life',
  'relocation',
]);

export const milestoneSchema = z.object({
  id: z.number().nonnegative(),
  title: z.string().min(1).max(1000),
  status: milestoneStatusSchema,
  deadline: z.string().max(300),
  category: milestoneCategorySchema.optional(),
  points: z.array(z.string().max(2000)).max(200).optional(),
  details: z.string().max(5000).optional(),
});

export const missionSchema = z.object({
  id: z.number().nonnegative(),
  title: z.string().min(1).max(300),
  period: z.string().max(300),
  duration: z.object({
    years: z.number().nonnegative().optional(),
    months: z.number().nonnegative(),
    days: z.number().nonnegative().optional(),
    weeks: z.number().nonnegative().optional(),
    totalMonths: z.number().nonnegative().optional(),
    totalWeeks: z.number().nonnegative().optional(),
    totalDays: z.number().nonnegative().optional(),
  }),
  milestones: z.array(milestoneSchema).max(200),
});

export const visionDataSchema: z.ZodType<VisionData> = z.object({
  title: z.string().max(300),
  subtitle: z.string().max(500),
  visionPeriod: z.string().max(300),
  endDate: z.string().max(100),
  businesses: z.array(z.string().max(200)).max(100),
  missions: z.array(missionSchema).max(200),
});

export const fitnessMetricDirectionSchema = z.enum(['increase', 'decrease', 'static']);

export const fitnessMetricSchema = z.object({
  id: z.union([z.string().min(1).max(128), z.number()]),
  label: z.string().min(1).max(120),
  current: z.union([z.string().max(100), z.number()]),
  target: z.union([z.string().max(100), z.number()]),
  unit: z.string().max(40).optional(),
  direction: fitnessMetricDirectionSchema.optional(),
});

export const fitnessDataSchema: z.ZodType<FitnessData> = z.object({
  title: z.string().max(200).optional(),
  birthDate: z.string().max(100).optional(),
  targetDate: z.string().max(100),
  metrics: z.array(fitnessMetricSchema).max(100),
});

export const prayerCalculationMethodSchema = z.enum([
  'Karachi',
  'MuslimWorldLeague',
  'NorthAmerica',
  'UmmAlQura',
  'Egyptian',
  'Turkey',
  'Singapore',
  'Dubai',
  'Qatar',
  'Kuwait',
  'MoonsightingCommittee',
  'Tehran',
]);

export const prayerMadhabSchema = z.enum(['Hanafi', 'Shafi']);

export const prayerSettingsSchema: z.ZodType<PrayerSettings> = z.object({
  cityName: z.string().max(100),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().max(100),
  calculationMethod: prayerCalculationMethodSchema,
  madhab: prayerMadhabSchema,
});

export const dashboardCardIdSchema: z.ZodType<DashboardCardId> = z.enum([
  'clock',
  'prayerTimes',
  'ramadan',
  'calendar',
  'countdowns',
  'missions',
  'fitness',
  'calories',
  'journaling',
]);

export const dashboardWidgetsSchema: z.ZodType<DashboardWidgets> = z.object({
  prayerTimes: z.boolean(),
  ramadan: z.boolean(),
  fitness: z.boolean(),
  calories: z.boolean(),
  journaling: z.boolean(),
  calendar: z.boolean(),
});

export const dashboardLayoutSchema: z.ZodType<DashboardLayout> = z.object({
  primary: z.array(dashboardCardIdSchema).max(15),
  secondary: z.array(dashboardCardIdSchema).max(15),
  mobile: z.array(dashboardCardIdSchema).max(15).optional(),
});

export const weekendHighlightSchema = z.enum(['friday', 'sat-sun', 'none']);

export const appSettingsSchema: z.ZodType<AppSettings> = z.object({
  appTitle: z.string().min(1).max(100),
  appLogoText: z.string().min(1).max(32),
  prayer: prayerSettingsSchema,
  widgets: dashboardWidgetsSchema.optional(),
  weekendHighlight: weekendHighlightSchema.optional(),
  layout: dashboardLayoutSchema.optional(),
});

export const ramadanDataSchema: z.ZodType<RamadanData> = z.object({
  hijriYear: z.number().int().min(1400).max(1600),
  hijriOffset: z.number().int().min(-2).max(2),
  fastedDays: z.record(z.string().max(32), z.boolean()),
});

export const mealTypeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);

export const calorieGoalsSchema = z.object({
  dailyCalories: z.number().int().min(500).max(15000),
  proteinGrams: z.number().min(0).max(1000),
  carbsGrams: z.number().min(0).max(1500),
  fatGrams: z.number().min(0).max(500),
});

export const calorieFoodPresetSchema = z.object({
  id: z.string().min(1).max(128),
  name: z.string().min(1).max(150),
  calories: z.number().min(0).max(10000),
  protein: z.number().min(0).max(1000).optional(),
  carbs: z.number().min(0).max(1500).optional(),
  fat: z.number().min(0).max(500).optional(),
  defaultMeal: mealTypeSchema.optional(),
});

export const calorieConfigSchema: z.ZodType<CalorieConfig> = z.object({
  goals: calorieGoalsSchema,
  presets: z.array(calorieFoodPresetSchema).max(100),
});

export const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

export const calorieLogEntrySchema = z.object({
  id: z.string().min(1).max(128),
  name: z.string().min(1).max(150),
  meal: mealTypeSchema,
  calories: z.number().min(0).max(10000),
  protein: z.number().min(0).max(1000).optional(),
  carbs: z.number().min(0).max(1500).optional(),
  fat: z.number().min(0).max(500).optional(),
  createdAt: z.number().nonnegative(),
});

export const dailyCalorieLogSchema: z.ZodType<DailyCalorieLog> = z.object({
  date: dateKeySchema,
  entries: z.array(calorieLogEntrySchema).max(200),
});

export const journalCreateSchema = z.object({
  content: z.string().trim().min(1).max(20000),
});

export const journalEntrySchema: z.ZodType<JournalEntry> = z.object({
  id: z.string().min(1).max(128),
  content: z.string().min(1).max(20000),
  createdAt: z.number().nonnegative(),
  updatedAt: z.number().nonnegative().optional(),
});

export const onboardingChoicesSchema: z.ZodType<OnboardingChoices> = z.object({
  appTitle: z.string().min(1).max(100),
  appLogoText: z.string().min(1).max(32),
  visionTitle: z.string().max(300),
  visionEndDate: z.string().max(100),
  templateMode: z.enum(['blank', 'starter']),
  widgets: dashboardWidgetsSchema,
  weekendHighlight: weekendHighlightSchema,
  prayer: prayerSettingsSchema,
});

export const resetWorkspaceSchema = z.object({
  mode: z.enum(['blank', 'starter']),
  clearJournal: z.boolean().optional().default(false),
});

export const importBackupRequestSchema = z.object({
  payload: z.unknown(),
  replaceJournal: z.boolean().optional().default(true),
});

export const validateBackupPayload = (raw: unknown): VisionBackupPayload => {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Backup file is not a valid JSON object.');
  }
  const obj = raw as Record<string, unknown>;

  if (!obj.vision || typeof obj.vision !== 'object') {
    throw new Error('Backup is missing "vision" data.');
  }
  const rawVision = obj.vision as Partial<VisionData>;
  const parsedVision = visionDataSchema.safeParse({
    title: rawVision.title,
    subtitle: typeof rawVision.subtitle === 'string' ? rawVision.subtitle : '',
    visionPeriod: typeof rawVision.visionPeriod === 'string' ? rawVision.visionPeriod : '',
    endDate: typeof rawVision.endDate === 'string' ? rawVision.endDate : EMPTY_VISION.endDate,
    businesses: Array.isArray(rawVision.businesses) ? rawVision.businesses : [],
    missions: rawVision.missions,
  });
  if (!parsedVision.success) {
    throw new Error(`Backup "vision" object is invalid: ${parsedVision.error.issues[0]?.message ?? 'invalid format'}`);
  }

  if (!Array.isArray(obj.countdowns)) {
    throw new Error('Backup is missing "countdowns" array.');
  }
  const parsedCountdowns = z.array(countdownMilestoneSchema).max(100).safeParse(obj.countdowns);
  if (!parsedCountdowns.success) {
    throw new Error(`Backup "countdowns" array is invalid: ${parsedCountdowns.error.issues[0]?.message ?? 'invalid item'}`);
  }

  if (!obj.fitness || typeof obj.fitness !== 'object') {
    throw new Error('Backup is missing "fitness" data.');
  }
  const rawFitness = obj.fitness as Partial<FitnessData>;
  const parsedFitness = fitnessDataSchema.safeParse({
    title: typeof rawFitness.title === 'string' ? rawFitness.title : EMPTY_FITNESS.title,
    birthDate: typeof rawFitness.birthDate === 'string' ? rawFitness.birthDate : undefined,
    targetDate: rawFitness.targetDate,
    metrics: rawFitness.metrics,
  });
  if (!parsedFitness.success) {
    throw new Error(`Backup "fitness" object is invalid: ${parsedFitness.error.issues[0]?.message ?? 'invalid format'}`);
  }

  const settingsRaw = (obj.settings as Partial<AppSettings> | undefined) ?? {};
  const rawPrayer = (settingsRaw.prayer ?? {}) as Partial<PrayerSettings>;
  const normalizedWidgets: DashboardWidgets = {
    prayerTimes:
      typeof settingsRaw.widgets?.prayerTimes === 'boolean'
        ? settingsRaw.widgets.prayerTimes
        : DEFAULT_WIDGETS_EXISTING.prayerTimes,
    ramadan:
      typeof settingsRaw.widgets?.ramadan === 'boolean'
        ? settingsRaw.widgets.ramadan
        : DEFAULT_WIDGETS_EXISTING.ramadan,
    fitness:
      typeof settingsRaw.widgets?.fitness === 'boolean'
        ? settingsRaw.widgets.fitness
        : DEFAULT_WIDGETS_EXISTING.fitness,
    calories:
      typeof settingsRaw.widgets?.calories === 'boolean'
        ? settingsRaw.widgets.calories
        : DEFAULT_WIDGETS_EXISTING.calories,
    journaling:
      typeof settingsRaw.widgets?.journaling === 'boolean'
        ? settingsRaw.widgets.journaling
        : DEFAULT_WIDGETS_EXISTING.journaling,
    calendar:
      typeof settingsRaw.widgets?.calendar === 'boolean'
        ? settingsRaw.widgets.calendar
        : DEFAULT_WIDGETS_EXISTING.calendar,
  };

  const parsedSettings = appSettingsSchema.safeParse({
    appTitle:
      typeof settingsRaw.appTitle === 'string' && settingsRaw.appTitle.trim()
        ? settingsRaw.appTitle.trim()
        : DEFAULT_SETTINGS.appTitle,
    appLogoText:
      typeof settingsRaw.appLogoText === 'string' && settingsRaw.appLogoText.trim()
        ? settingsRaw.appLogoText.trim().slice(0, 32)
        : DEFAULT_SETTINGS.appLogoText,
    prayer: {
      cityName:
        typeof rawPrayer.cityName === 'string'
          ? rawPrayer.cityName
          : DEFAULT_PRAYER_SETTINGS.cityName,
      latitude:
        typeof rawPrayer.latitude === 'number'
          ? rawPrayer.latitude
          : DEFAULT_PRAYER_SETTINGS.latitude,
      longitude:
        typeof rawPrayer.longitude === 'number'
          ? rawPrayer.longitude
          : DEFAULT_PRAYER_SETTINGS.longitude,
      timezone:
        typeof rawPrayer.timezone === 'string'
          ? rawPrayer.timezone
          : DEFAULT_PRAYER_SETTINGS.timezone,
      calculationMethod:
        rawPrayer.calculationMethod ?? DEFAULT_PRAYER_SETTINGS.calculationMethod,
      madhab: rawPrayer.madhab ?? DEFAULT_PRAYER_SETTINGS.madhab,
    },
    widgets: normalizedWidgets,
    weekendHighlight:
      settingsRaw.weekendHighlight === 'friday' ||
      settingsRaw.weekendHighlight === 'sat-sun' ||
      settingsRaw.weekendHighlight === 'none'
        ? settingsRaw.weekendHighlight
        : 'friday',
    layout: reconcileLayout(settingsRaw.layout, normalizedWidgets),
  });
  if (!parsedSettings.success) {
    throw new Error(`Backup "settings" object is invalid: ${parsedSettings.error.issues[0]?.message ?? 'invalid format'}`);
  }

  const rawJournal = Array.isArray(obj.journal) ? obj.journal : [];
  const journal: JournalEntry[] = [];
  for (const item of rawJournal) {
    const parsed = journalEntrySchema.safeParse(item);
    if (parsed.success && parsed.data.content.trim()) {
      journal.push({ ...parsed.data, content: parsed.data.content.trim() });
    }
  }

  let ramadan: RamadanData | undefined;
  if (obj.ramadan !== undefined) {
    const parsedRamadan = ramadanDataSchema.safeParse(obj.ramadan);
    if (!parsedRamadan.success) {
      throw new Error(`Backup "ramadan" object is invalid: ${parsedRamadan.error.issues[0]?.message ?? 'invalid format'}`);
    }
    ramadan = parsedRamadan.data;
  }

  let caloriesConfig: CalorieConfig | undefined;
  if (obj.caloriesConfig !== undefined) {
    const parsedCalCfg = calorieConfigSchema.safeParse(obj.caloriesConfig);
    if (!parsedCalCfg.success) {
      throw new Error(`Backup "caloriesConfig" is invalid: ${parsedCalCfg.error.issues[0]?.message ?? 'invalid format'}`);
    }
    caloriesConfig = parsedCalCfg.data;
  }

  let calorieLogs: Record<string, DailyCalorieLog> | undefined;
  if (obj.calorieLogs !== undefined && obj.calorieLogs !== null && typeof obj.calorieLogs === 'object') {
    const validatedLogs: Record<string, DailyCalorieLog> = {};
    for (const [dateKey, logVal] of Object.entries(obj.calorieLogs as Record<string, unknown>)) {
      const parsedLog = dailyCalorieLogSchema.safeParse(logVal);
      if (parsedLog.success && dateKeySchema.safeParse(dateKey).success) {
        validatedLogs[dateKey] = parsedLog.data;
      }
    }
    calorieLogs = validatedLogs;
  }

  return {
    version: obj.version === 1 ? 1 : 2,
    exportedAt:
      typeof obj.exportedAt === 'string' ? obj.exportedAt : new Date().toISOString(),
    vision: parsedVision.data,
    countdowns: parsedCountdowns.data,
    fitness: parsedFitness.data,
    settings: parsedSettings.data,
    journal,
    ramadan: ramadan ?? (obj.version === 2 ? DEFAULT_RAMADAN_DATA : undefined),
    caloriesConfig: caloriesConfig ?? (obj.version === 2 ? DEFAULT_CALORIE_CONFIG : undefined),
    calorieLogs,
  };
};
