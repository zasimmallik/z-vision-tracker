import type { Firestore } from 'firebase-admin/firestore';
import {
  DEFAULT_CALORIE_CONFIG,
  DEFAULT_PRAYER_SETTINGS,
  DEFAULT_RAMADAN_DATA,
  DEFAULT_SETTINGS,
  DEFAULT_WIDGETS_EXISTING,
  EMPTY_FITNESS,
  EMPTY_VISION,
  createBlankTemplate,
  createStarterTemplate,
  reconcileLayout,
  toLocalYmd,
  type AppSettings,
  type CalorieConfig,
  type CountdownMilestone,
  type DailyCalorieLog,
  type DashboardWidgets,
  type FitnessData,
  type JournalEntry,
  type OnboardingChoices,
  type RamadanData,
  type VisionBackupPayload,
  type VisionData,
  type WeekendHighlight,
  type WorkspaceSnapshot,
} from '@z-vision/shared';
import { commitInChunks, type BatchOp } from './firestoreBatch.js';
import { AppError } from './middleware.js';

export const sanitizeForFirestore = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val !== undefined) {
        out[key] = sanitizeForFirestore(val);
      }
    }
    return out as T;
  }
  return value;
};

const normalizeWidgets = (
  raw?: Partial<DashboardWidgets>,
  fallback: DashboardWidgets = DEFAULT_WIDGETS_EXISTING
): DashboardWidgets => ({
  prayerTimes: typeof raw?.prayerTimes === 'boolean' ? raw.prayerTimes : fallback.prayerTimes,
  ramadan: typeof raw?.ramadan === 'boolean' ? raw.ramadan : fallback.ramadan,
  fitness: typeof raw?.fitness === 'boolean' ? raw.fitness : fallback.fitness,
  calories: typeof raw?.calories === 'boolean' ? raw.calories : fallback.calories,
  journaling: typeof raw?.journaling === 'boolean' ? raw.journaling : fallback.journaling,
  calendar: typeof raw?.calendar === 'boolean' ? raw.calendar : fallback.calendar,
});

const normalizeWeekendHighlight = (
  raw?: unknown,
  fallback: WeekendHighlight = 'friday'
): WeekendHighlight => {
  if (raw === 'friday' || raw === 'sat-sun' || raw === 'none') {
    return raw;
  }
  return fallback;
};

export interface WorkspaceRepository {
  getWorkspace(uid: string): Promise<WorkspaceSnapshot>;
  initializeWorkspace(uid: string, choices: OnboardingChoices): Promise<WorkspaceSnapshot>;
  saveVision(uid: string, vision: VisionData): Promise<void>;
  saveCountdowns(uid: string, items: CountdownMilestone[]): Promise<void>;
  saveFitness(uid: string, fitness: FitnessData): Promise<void>;
  saveSettings(uid: string, settings: AppSettings): Promise<AppSettings>;
  saveRamadan(uid: string, ramadan: RamadanData): Promise<void>;
  saveCaloriesConfig(uid: string, config: CalorieConfig): Promise<void>;
  getCalorieLog(uid: string, date: string): Promise<DailyCalorieLog>;
  saveCalorieLog(uid: string, log: DailyCalorieLog): Promise<void>;
  createJournalEntry(uid: string, content: string): Promise<JournalEntry>;
  updateJournalEntry(uid: string, entryId: string, content: string): Promise<JournalEntry>;
  deleteJournalEntry(uid: string, entryId: string): Promise<void>;
  exportBackup(uid: string): Promise<VisionBackupPayload>;
  importBackup(uid: string, payload: VisionBackupPayload, replaceJournal: boolean): Promise<WorkspaceSnapshot>;
  resetWorkspace(uid: string, mode: 'blank' | 'starter', clearJournal: boolean): Promise<WorkspaceSnapshot>;
  deleteWorkspace(uid: string): Promise<void>;
}

export class FirestoreWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly db: Firestore) {}

  private dashboardDoc(
    uid: string,
    docId: 'vision' | 'countdowns' | 'fitness' | 'settings' | 'ramadan' | 'calories'
  ) {
    return this.db.collection('users').doc(uid).collection('dashboard').doc(docId);
  }

  private journalCollection(uid: string) {
    return this.db.collection('users').doc(uid).collection('journal');
  }

  private calorieLogsCollection(uid: string) {
    return this.db.collection('users').doc(uid).collection('calorieLogs');
  }

  private normalizeSettings(raw?: Partial<AppSettings>): AppSettings {
    const widgets = normalizeWidgets(raw?.widgets, DEFAULT_WIDGETS_EXISTING);
    return {
      appTitle: raw?.appTitle || DEFAULT_SETTINGS.appTitle,
      appLogoText: raw?.appLogoText || DEFAULT_SETTINGS.appLogoText,
      prayer: {
        ...DEFAULT_PRAYER_SETTINGS,
        ...(raw?.prayer ?? {}),
      },
      widgets,
      weekendHighlight: normalizeWeekendHighlight(raw?.weekendHighlight, 'friday'),
      layout: reconcileLayout(raw?.layout, widgets),
    };
  }

  async getWorkspace(uid: string): Promise<WorkspaceSnapshot> {
    const [
      visionSnap,
      countdownsSnap,
      fitnessSnap,
      settingsSnap,
      ramadanSnap,
      caloriesSnap,
      journalSnap,
      calorieLogsSnap,
    ] = await Promise.all([
      this.dashboardDoc(uid, 'vision').get(),
      this.dashboardDoc(uid, 'countdowns').get(),
      this.dashboardDoc(uid, 'fitness').get(),
      this.dashboardDoc(uid, 'settings').get(),
      this.dashboardDoc(uid, 'ramadan').get(),
      this.dashboardDoc(uid, 'calories').get(),
      this.journalCollection(uid).orderBy('createdAt', 'desc').get(),
      this.calorieLogsCollection(uid).orderBy('date', 'desc').limit(90).get(),
    ]);

    if (!visionSnap.exists) {
      return {
        exists: false,
        vision: EMPTY_VISION,
        countdowns: [],
        fitness: EMPTY_FITNESS,
        settings: DEFAULT_SETTINGS,
        ramadan: DEFAULT_RAMADAN_DATA,
        caloriesConfig: DEFAULT_CALORIE_CONFIG,
        journal: [],
        calorieLogs: {},
      };
    }

    const vData = (visionSnap.data() ?? {}) as Partial<VisionData>;
    const vision: VisionData = {
      title: vData.title ?? EMPTY_VISION.title,
      subtitle: vData.subtitle ?? '',
      visionPeriod: vData.visionPeriod ?? '',
      endDate: vData.endDate ?? EMPTY_VISION.endDate,
      businesses: Array.isArray(vData.businesses) ? vData.businesses : [],
      missions: Array.isArray(vData.missions) ? vData.missions : [],
    };

    const cData = (countdownsSnap.data() ?? {}) as { items?: CountdownMilestone[] };
    const countdowns = Array.isArray(cData.items) ? cData.items : [];

    const fData = (fitnessSnap.data() ?? {}) as Partial<FitnessData>;
    const fitness: FitnessData = {
      title: fData.title ?? EMPTY_FITNESS.title,
      birthDate: fData.birthDate,
      targetDate: fData.targetDate ?? EMPTY_FITNESS.targetDate,
      metrics: Array.isArray(fData.metrics) ? fData.metrics : [],
    };

    const settings = this.normalizeSettings(
      (settingsSnap.data() as Partial<AppSettings> | undefined) ?? undefined
    );

    const rData = (ramadanSnap.data() ?? {}) as Partial<RamadanData>;
    const ramadan: RamadanData = ramadanSnap.exists
      ? {
          hijriYear:
            typeof rData.hijriYear === 'number'
              ? rData.hijriYear
              : DEFAULT_RAMADAN_DATA.hijriYear,
          hijriOffset:
            typeof rData.hijriOffset === 'number' ? rData.hijriOffset : 0,
          fastedDays:
            rData.fastedDays && typeof rData.fastedDays === 'object'
              ? rData.fastedDays
              : {},
        }
      : DEFAULT_RAMADAN_DATA;

    const calData = (caloriesSnap.data() ?? {}) as Partial<CalorieConfig>;
    const caloriesConfig: CalorieConfig = caloriesSnap.exists
      ? {
          goals: calData.goals ?? DEFAULT_CALORIE_CONFIG.goals,
          presets: Array.isArray(calData.presets)
            ? calData.presets
            : DEFAULT_CALORIE_CONFIG.presets,
        }
      : DEFAULT_CALORIE_CONFIG;

    const journal: JournalEntry[] = journalSnap.docs.map((docSnap) => {
      const d = docSnap.data() as {
        content?: string;
        createdAt?: number;
        updatedAt?: number;
      };
      return {
        id: docSnap.id,
        content: d.content ?? '',
        createdAt: typeof d.createdAt === 'number' ? d.createdAt : Date.now(),
        updatedAt: typeof d.updatedAt === 'number' ? d.updatedAt : undefined,
      };
    });

    const calorieLogs: Record<string, DailyCalorieLog> = {};
    for (const docSnap of calorieLogsSnap.docs) {
      const d = docSnap.data() as Partial<DailyCalorieLog>;
      const dateKey = typeof d.date === 'string' ? d.date : docSnap.id;
      calorieLogs[dateKey] = {
        date: dateKey,
        entries: Array.isArray(d.entries) ? d.entries : [],
      };
    }

    return {
      exists: true,
      vision,
      countdowns,
      fitness,
      settings,
      ramadan,
      caloriesConfig,
      journal,
      calorieLogs,
    };
  }

  async initializeWorkspace(
    uid: string,
    choices: OnboardingChoices
  ): Promise<WorkspaceSnapshot> {
    const payload =
      choices.templateMode === 'blank'
        ? createBlankTemplate(choices)
        : createStarterTemplate(choices);
    const now = Date.now();

    await commitInChunks(this.db, [
      {
        type: 'set',
        ref: this.dashboardDoc(uid, 'vision'),
        data: sanitizeForFirestore({ ...payload.vision, updatedAt: now }),
      },
      {
        type: 'set',
        ref: this.dashboardDoc(uid, 'countdowns'),
        data: sanitizeForFirestore({ items: payload.countdowns, updatedAt: now }),
      },
      {
        type: 'set',
        ref: this.dashboardDoc(uid, 'fitness'),
        data: sanitizeForFirestore({ ...payload.fitness, updatedAt: now }),
      },
      {
        type: 'set',
        ref: this.dashboardDoc(uid, 'settings'),
        data: sanitizeForFirestore({ ...payload.settings, updatedAt: now }),
      },
      {
        type: 'set',
        ref: this.dashboardDoc(uid, 'ramadan'),
        data: sanitizeForFirestore({ ...payload.ramadan, updatedAt: now }),
      },
      {
        type: 'set',
        ref: this.dashboardDoc(uid, 'calories'),
        data: sanitizeForFirestore({ ...payload.caloriesConfig, updatedAt: now }),
      },
    ]);

    return {
      exists: true,
      vision: payload.vision,
      countdowns: payload.countdowns,
      fitness: payload.fitness,
      settings: payload.settings,
      ramadan: payload.ramadan,
      caloriesConfig: payload.caloriesConfig,
      journal: [],
      calorieLogs: {
        [toLocalYmd()]: { date: toLocalYmd(), entries: [] },
      },
    };
  }

  async saveVision(uid: string, vision: VisionData): Promise<void> {
    await this.dashboardDoc(uid, 'vision').set(
      sanitizeForFirestore({ ...vision, updatedAt: Date.now() })
    );
  }

  async saveCountdowns(uid: string, items: CountdownMilestone[]): Promise<void> {
    await this.dashboardDoc(uid, 'countdowns').set(
      sanitizeForFirestore({ items, updatedAt: Date.now() })
    );
  }

  async saveFitness(uid: string, fitness: FitnessData): Promise<void> {
    await this.dashboardDoc(uid, 'fitness').set(
      sanitizeForFirestore({ ...fitness, updatedAt: Date.now() })
    );
  }

  async saveSettings(uid: string, settings: AppSettings): Promise<AppSettings> {
    const normalized = this.normalizeSettings(settings);
    await this.dashboardDoc(uid, 'settings').set(
      sanitizeForFirestore({ ...normalized, updatedAt: Date.now() })
    );
    return normalized;
  }

  async saveRamadan(uid: string, ramadan: RamadanData): Promise<void> {
    await this.dashboardDoc(uid, 'ramadan').set(
      sanitizeForFirestore({ ...ramadan, updatedAt: Date.now() })
    );
  }

  async saveCaloriesConfig(uid: string, config: CalorieConfig): Promise<void> {
    await this.dashboardDoc(uid, 'calories').set(
      sanitizeForFirestore({ ...config, updatedAt: Date.now() })
    );
  }

  async getCalorieLog(uid: string, date: string): Promise<DailyCalorieLog> {
    const snap = await this.calorieLogsCollection(uid).doc(date).get();
    if (!snap.exists) {
      return { date, entries: [] };
    }
    const data = snap.data() as Partial<DailyCalorieLog>;
    return {
      date,
      entries: Array.isArray(data.entries) ? data.entries : [],
    };
  }

  async saveCalorieLog(uid: string, log: DailyCalorieLog): Promise<void> {
    await this.calorieLogsCollection(uid)
      .doc(log.date)
      .set(sanitizeForFirestore({ ...log, updatedAt: Date.now() }));
  }

  async createJournalEntry(uid: string, content: string): Promise<JournalEntry> {
    const docRef = this.journalCollection(uid).doc();
    const createdAt = Date.now();
    const trimmed = content.trim();
    await docRef.set(
      sanitizeForFirestore({
        content: trimmed,
        createdAt,
      })
    );
    return {
      id: docRef.id,
      content: trimmed,
      createdAt,
    };
  }

  async updateJournalEntry(
    uid: string,
    entryId: string,
    content: string
  ): Promise<JournalEntry> {
    const docRef = this.journalCollection(uid).doc(entryId);
    const snap = await docRef.get();
    if (!snap.exists) {
      throw new AppError(404, 'Journal entry not found.');
    }
    const existing = snap.data() as { createdAt?: number };
    const updatedAt = Date.now();
    const trimmed = content.trim();
    await docRef.update(
      sanitizeForFirestore({
        content: trimmed,
        updatedAt,
      })
    );
    return {
      id: entryId,
      content: trimmed,
      createdAt: typeof existing.createdAt === 'number' ? existing.createdAt : updatedAt,
      updatedAt,
    };
  }

  async deleteJournalEntry(uid: string, entryId: string): Promise<void> {
    await this.journalCollection(uid).doc(entryId).delete();
  }

  async exportBackup(uid: string): Promise<VisionBackupPayload> {
    const [snapshot, allLogsSnap] = await Promise.all([
      this.getWorkspace(uid),
      this.calorieLogsCollection(uid).get(),
    ]);

    const calorieLogs: Record<string, DailyCalorieLog> = {};
    for (const docSnap of allLogsSnap.docs) {
      const d = docSnap.data() as Partial<DailyCalorieLog>;
      const dateKey = typeof d.date === 'string' ? d.date : docSnap.id;
      calorieLogs[dateKey] = {
        date: dateKey,
        entries: Array.isArray(d.entries) ? d.entries : [],
      };
    }

    return {
      version: 2,
      exportedAt: new Date().toISOString(),
      vision: snapshot.vision,
      countdowns: snapshot.countdowns,
      fitness: snapshot.fitness,
      settings: snapshot.settings,
      journal: snapshot.journal,
      ramadan: snapshot.ramadan,
      caloriesConfig: snapshot.caloriesConfig,
      calorieLogs,
    };
  }

  async importBackup(
    uid: string,
    payload: VisionBackupPayload,
    replaceJournal: boolean
  ): Promise<WorkspaceSnapshot> {
    const now = Date.now();
    const ops: BatchOp[] = [];

    const normalizedSettings = this.normalizeSettings(payload.settings);
    const ramadan = payload.ramadan ?? DEFAULT_RAMADAN_DATA;
    const caloriesConfig = payload.caloriesConfig ?? DEFAULT_CALORIE_CONFIG;

    ops.push(
      {
        type: 'set',
        ref: this.dashboardDoc(uid, 'vision'),
        data: sanitizeForFirestore({ ...payload.vision, updatedAt: now }),
      },
      {
        type: 'set',
        ref: this.dashboardDoc(uid, 'countdowns'),
        data: sanitizeForFirestore({ items: payload.countdowns, updatedAt: now }),
      },
      {
        type: 'set',
        ref: this.dashboardDoc(uid, 'fitness'),
        data: sanitizeForFirestore({ ...payload.fitness, updatedAt: now }),
      },
      {
        type: 'set',
        ref: this.dashboardDoc(uid, 'settings'),
        data: sanitizeForFirestore({ ...normalizedSettings, updatedAt: now }),
      },
      {
        type: 'set',
        ref: this.dashboardDoc(uid, 'ramadan'),
        data: sanitizeForFirestore({ ...ramadan, updatedAt: now }),
      },
      {
        type: 'set',
        ref: this.dashboardDoc(uid, 'calories'),
        data: sanitizeForFirestore({ ...caloriesConfig, updatedAt: now }),
      }
    );

    if (replaceJournal) {
      const existingJournal = await this.journalCollection(uid).get();
      for (const docSnap of existingJournal.docs) {
        ops.push({ type: 'delete', ref: docSnap.ref });
      }
    }

    for (const entry of payload.journal) {
      if (entry && typeof entry.content === 'string' && entry.content.trim()) {
        const ref =
          replaceJournal && entry.id
            ? this.journalCollection(uid).doc(String(entry.id))
            : this.journalCollection(uid).doc();
        ops.push({
          type: 'set',
          ref,
          data: sanitizeForFirestore({
            content: entry.content.trim(),
            createdAt: typeof entry.createdAt === 'number' ? entry.createdAt : now,
            updatedAt: typeof entry.updatedAt === 'number' ? entry.updatedAt : undefined,
          }),
        });
      }
    }

    if (payload.calorieLogs) {
      for (const [dateKey, log] of Object.entries(payload.calorieLogs)) {
        ops.push({
          type: 'set',
          ref: this.calorieLogsCollection(uid).doc(dateKey),
          data: sanitizeForFirestore({ ...log, updatedAt: now }),
        });
      }
    }

    await commitInChunks(this.db, ops);
    return this.getWorkspace(uid);
  }

  async resetWorkspace(
    uid: string,
    mode: 'blank' | 'starter',
    clearJournal: boolean
  ): Promise<WorkspaceSnapshot> {
    const current = await this.getWorkspace(uid);
    const now = Date.now();
    const choices: OnboardingChoices = {
      appTitle: current.settings.appTitle,
      appLogoText: current.settings.appLogoText,
      visionTitle: 'My 5-Year Vision',
      visionEndDate: EMPTY_VISION.endDate,
      templateMode: mode,
      widgets: normalizeWidgets(current.settings.widgets, DEFAULT_WIDGETS_EXISTING),
      weekendHighlight: normalizeWeekendHighlight(
        current.settings.weekendHighlight,
        'sat-sun'
      ),
      prayer: current.settings.prayer,
    };

    const payload =
      mode === 'blank' ? createBlankTemplate(choices) : createStarterTemplate(choices);

    const ops: BatchOp[] = [
      {
        type: 'set',
        ref: this.dashboardDoc(uid, 'vision'),
        data: sanitizeForFirestore({ ...payload.vision, updatedAt: now }),
      },
      {
        type: 'set',
        ref: this.dashboardDoc(uid, 'countdowns'),
        data: sanitizeForFirestore({ items: payload.countdowns, updatedAt: now }),
      },
      {
        type: 'set',
        ref: this.dashboardDoc(uid, 'fitness'),
        data: sanitizeForFirestore({ ...payload.fitness, updatedAt: now }),
      },
      {
        type: 'set',
        ref: this.dashboardDoc(uid, 'settings'),
        data: sanitizeForFirestore({ ...payload.settings, updatedAt: now }),
      },
      {
        type: 'set',
        ref: this.dashboardDoc(uid, 'ramadan'),
        data: sanitizeForFirestore({ ...payload.ramadan, updatedAt: now }),
      },
      {
        type: 'set',
        ref: this.dashboardDoc(uid, 'calories'),
        data: sanitizeForFirestore({ ...payload.caloriesConfig, updatedAt: now }),
      },
    ];

    if (clearJournal) {
      const existingSnap = await this.journalCollection(uid).get();
      for (const docSnap of existingSnap.docs) {
        ops.push({ type: 'delete', ref: docSnap.ref });
      }
      const logsSnap = await this.calorieLogsCollection(uid).get();
      for (const docSnap of logsSnap.docs) {
        ops.push({ type: 'delete', ref: docSnap.ref });
      }
    }

    await commitInChunks(this.db, ops);
    return this.getWorkspace(uid);
  }

  async deleteWorkspace(uid: string): Promise<void> {
    const [journalSnap, calorieLogsSnap] = await Promise.all([
      this.journalCollection(uid).get(),
      this.calorieLogsCollection(uid).get(),
    ]);

    const ops: BatchOp[] = [
      { type: 'delete', ref: this.dashboardDoc(uid, 'vision') },
      { type: 'delete', ref: this.dashboardDoc(uid, 'countdowns') },
      { type: 'delete', ref: this.dashboardDoc(uid, 'fitness') },
      { type: 'delete', ref: this.dashboardDoc(uid, 'settings') },
      { type: 'delete', ref: this.dashboardDoc(uid, 'ramadan') },
      { type: 'delete', ref: this.dashboardDoc(uid, 'calories') },
    ];

    for (const docSnap of journalSnap.docs) {
      ops.push({ type: 'delete', ref: docSnap.ref });
    }
    for (const docSnap of calorieLogsSnap.docs) {
      ops.push({ type: 'delete', ref: docSnap.ref });
    }

    await commitInChunks(this.db, ops);
  }
}
