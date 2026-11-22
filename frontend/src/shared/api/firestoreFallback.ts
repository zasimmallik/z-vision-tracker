import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  initializeFirestore,
  orderBy,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore';
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
  type DashboardLayout,
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
import { app } from '../lib/firebase';

let cachedDb: Firestore | null = null;

const getDb = (): Firestore => {
  if (cachedDb) return cachedDb;
  if (!app) throw new Error('Firebase app is not initialized.');
  try {
    cachedDb = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    cachedDb = getFirestore(app);
  }
  return cachedDb;
};

const sanitizeForFirestore = <T>(value: T): T => {
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

const dashboardDocRef = (
  uid: string,
  docId: 'vision' | 'countdowns' | 'fitness' | 'settings' | 'ramadan' | 'calories'
) => doc(getDb(), 'users', uid, 'dashboard', docId);

const journalCollectionRef = (uid: string) =>
  collection(getDb(), 'users', uid, 'journal');

const calorieLogsCollectionRef = (uid: string) =>
  collection(getDb(), 'users', uid, 'calorieLogs');

interface LocalPrefsCache {
  layout?: DashboardLayout;
  ramadanWidget?: boolean;
  caloriesWidget?: boolean;
  ramadan?: RamadanData;
  caloriesConfig?: CalorieConfig;
  calorieLogs?: Record<string, DailyCalorieLog>;
}

const getLocalCacheKey = (uid: string) => `zvision:fallbackCache:v1:${uid}`;

const readLocalCache = (uid: string): LocalPrefsCache => {
  try {
    const raw = window.localStorage.getItem(getLocalCacheKey(uid));
    if (!raw) return {};
    return JSON.parse(raw) as LocalPrefsCache;
  } catch {
    return {};
  }
};

const writeLocalCache = (uid: string, patch: Partial<LocalPrefsCache>) => {
  try {
    const prev = readLocalCache(uid);
    window.localStorage.setItem(
      getLocalCacheKey(uid),
      JSON.stringify({ ...prev, ...patch })
    );
  } catch {
    // ignore storage failures
  }
};

const clearLocalCache = (uid: string) => {
  try {
    window.localStorage.removeItem(getLocalCacheKey(uid));
  } catch {
    // ignore
  }
};

const normalizeWidgets = (
  raw?: Partial<DashboardWidgets>,
  cache?: LocalPrefsCache,
  fallback: DashboardWidgets = DEFAULT_WIDGETS_EXISTING
): DashboardWidgets => ({
  prayerTimes:
    typeof raw?.prayerTimes === 'boolean' ? raw.prayerTimes : fallback.prayerTimes,
  ramadan:
    typeof raw?.ramadan === 'boolean'
      ? raw.ramadan
      : typeof cache?.ramadanWidget === 'boolean'
        ? cache.ramadanWidget
        : fallback.ramadan,
  fitness: typeof raw?.fitness === 'boolean' ? raw.fitness : fallback.fitness,
  calories:
    typeof raw?.calories === 'boolean'
      ? raw.calories
      : typeof cache?.caloriesWidget === 'boolean'
        ? cache.caloriesWidget
        : fallback.calories,
  journaling:
    typeof raw?.journaling === 'boolean' ? raw.journaling : fallback.journaling,
  calendar: typeof raw?.calendar === 'boolean' ? raw.calendar : fallback.calendar,
});

const normalizeWeekendHighlight = (
  raw?: unknown,
  fallback: WeekendHighlight = 'friday'
): WeekendHighlight => {
  if (raw === 'friday' || raw === 'sat-sun' || raw === 'none') return raw;
  return fallback;
};

const commitChunkedOps = async (
  ops: Array<
    | { type: 'set'; ref: DocumentReference; data: Record<string, unknown> }
    | { type: 'delete'; ref: DocumentReference }
  >,
  chunkSize = 400
): Promise<void> => {
  const firestore = getDb();
  for (let i = 0; i < ops.length; i += chunkSize) {
    const chunk = ops.slice(i, i + chunkSize);
    const batch = writeBatch(firestore);
    for (const op of chunk) {
      if (op.type === 'set') {
        batch.set(op.ref, op.data);
      } else {
        batch.delete(op.ref);
      }
    }
    await batch.commit();
  }
};

export const firestoreFallback = {
  async getWorkspace(uid: string): Promise<WorkspaceSnapshot> {
    const localCache = readLocalCache(uid);

    const [visionSnap, countdownsSnap, fitnessSnap, settingsSnap, journalSnap] =
      await Promise.all([
        getDoc(dashboardDocRef(uid, 'vision')),
        getDoc(dashboardDocRef(uid, 'countdowns')),
        getDoc(dashboardDocRef(uid, 'fitness')),
        getDoc(dashboardDocRef(uid, 'settings')),
        getDocs(query(journalCollectionRef(uid), orderBy('createdAt', 'desc'))),
      ]);

    if (!visionSnap.exists()) {
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

    const rawSettings = (settingsSnap.data() ?? {}) as Partial<AppSettings>;
    const widgets = normalizeWidgets(rawSettings.widgets, localCache, DEFAULT_WIDGETS_EXISTING);
    const settings: AppSettings = {
      appTitle: rawSettings.appTitle || DEFAULT_SETTINGS.appTitle,
      appLogoText: rawSettings.appLogoText || DEFAULT_SETTINGS.appLogoText,
      prayer: {
        ...DEFAULT_PRAYER_SETTINGS,
        ...(rawSettings.prayer ?? {}),
      },
      widgets,
      weekendHighlight: normalizeWeekendHighlight(rawSettings.weekendHighlight, 'friday'),
      layout: reconcileLayout(rawSettings.layout ?? localCache.layout, widgets),
    };

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

    // Optional new docs (safe if legacy cloud rules haven't been updated yet)
    let ramadan: RamadanData = localCache.ramadan ?? DEFAULT_RAMADAN_DATA;
    try {
      const rSnap = await getDoc(dashboardDocRef(uid, 'ramadan'));
      if (rSnap.exists()) {
        const rd = rSnap.data() as Partial<RamadanData>;
        ramadan = {
          hijriYear:
            typeof rd.hijriYear === 'number'
              ? rd.hijriYear
              : DEFAULT_RAMADAN_DATA.hijriYear,
          hijriOffset: typeof rd.hijriOffset === 'number' ? rd.hijriOffset : 0,
          fastedDays:
            rd.fastedDays && typeof rd.fastedDays === 'object' ? rd.fastedDays : {},
        };
      }
    } catch {
      // Fall back to local cache / default if cloud rules aren't updated yet
    }

    let caloriesConfig: CalorieConfig =
      localCache.caloriesConfig ?? DEFAULT_CALORIE_CONFIG;
    try {
      const calSnap = await getDoc(dashboardDocRef(uid, 'calories'));
      if (calSnap.exists()) {
        const cd = calSnap.data() as Partial<CalorieConfig>;
        caloriesConfig = {
          goals: cd.goals ?? DEFAULT_CALORIE_CONFIG.goals,
          presets: Array.isArray(cd.presets)
            ? cd.presets
            : DEFAULT_CALORIE_CONFIG.presets,
        };
      }
    } catch {
      // Fall back to local cache / default
    }

    let calorieLogs: Record<string, DailyCalorieLog> = localCache.calorieLogs ?? {};
    try {
      const logsSnap = await getDocs(calorieLogsCollectionRef(uid));
      const cloudLogs: Record<string, DailyCalorieLog> = {};
      logsSnap.forEach((docSnap) => {
        const d = docSnap.data() as Partial<DailyCalorieLog>;
        const dateKey = typeof d.date === 'string' ? d.date : docSnap.id;
        cloudLogs[dateKey] = {
          date: dateKey,
          entries: Array.isArray(d.entries) ? d.entries : [],
        };
      });
      calorieLogs = { ...calorieLogs, ...cloudLogs };
    } catch {
      // Fall back to local cache
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
  },

  async initializeWorkspace(
    uid: string,
    choices: OnboardingChoices
  ): Promise<WorkspaceSnapshot> {
    const payload =
      choices.templateMode === 'blank'
        ? createBlankTemplate(choices)
        : createStarterTemplate(choices);
    const now = Date.now();

    writeLocalCache(uid, {
      layout: payload.settings.layout,
      ramadanWidget: payload.settings.widgets?.ramadan,
      caloriesWidget: payload.settings.widgets?.calories,
      ramadan: payload.ramadan,
      caloriesConfig: payload.caloriesConfig,
    });

    const coreSettings = {
      appTitle: payload.settings.appTitle,
      appLogoText: payload.settings.appLogoText,
      prayer: payload.settings.prayer,
      widgets: {
        prayerTimes: payload.settings.widgets?.prayerTimes ?? true,
        fitness: payload.settings.widgets?.fitness ?? true,
        journaling: payload.settings.widgets?.journaling ?? true,
        calendar: payload.settings.widgets?.calendar ?? true,
      },
      weekendHighlight: payload.settings.weekendHighlight,
      updatedAt: now,
    };

    await commitChunkedOps([
      {
        type: 'set',
        ref: dashboardDocRef(uid, 'vision'),
        data: sanitizeForFirestore({ ...payload.vision, updatedAt: now }),
      },
      {
        type: 'set',
        ref: dashboardDocRef(uid, 'countdowns'),
        data: sanitizeForFirestore({ items: payload.countdowns, updatedAt: now }),
      },
      {
        type: 'set',
        ref: dashboardDocRef(uid, 'fitness'),
        data: sanitizeForFirestore({ ...payload.fitness, updatedAt: now }),
      },
      {
        type: 'set',
        ref: dashboardDocRef(uid, 'settings'),
        data: sanitizeForFirestore(coreSettings),
      },
    ]);

    try {
      await this.saveSettings(uid, payload.settings);
      await this.saveRamadan(uid, payload.ramadan);
      await this.saveCaloriesConfig(uid, payload.caloriesConfig);
    } catch {
      // Safe fallback to local cache if cloud rules are legacy
    }

    return {
      exists: true,
      vision: payload.vision,
      countdowns: payload.countdowns,
      fitness: payload.fitness,
      settings: payload.settings,
      ramadan: payload.ramadan,
      caloriesConfig: payload.caloriesConfig,
      journal: [],
      calorieLogs: { [toLocalYmd()]: { date: toLocalYmd(), entries: [] } },
    };
  },

  async saveVision(uid: string, vision: VisionData): Promise<void> {
    await setDoc(
      dashboardDocRef(uid, 'vision'),
      sanitizeForFirestore({ ...vision, updatedAt: Date.now() })
    );
  },

  async saveCountdowns(uid: string, items: CountdownMilestone[]): Promise<void> {
    await setDoc(
      dashboardDocRef(uid, 'countdowns'),
      sanitizeForFirestore({ items, updatedAt: Date.now() })
    );
  },

  async saveFitness(uid: string, fitness: FitnessData): Promise<void> {
    await setDoc(
      dashboardDocRef(uid, 'fitness'),
      sanitizeForFirestore({ ...fitness, updatedAt: Date.now() })
    );
  },

  async saveSettings(uid: string, settings: AppSettings): Promise<AppSettings> {
    const widgets = normalizeWidgets(settings.widgets, undefined, DEFAULT_WIDGETS_EXISTING);
    const normalized: AppSettings = {
      ...settings,
      widgets,
      layout: reconcileLayout(settings.layout, widgets),
    };

    writeLocalCache(uid, {
      layout: normalized.layout,
      ramadanWidget: widgets.ramadan,
      caloriesWidget: widgets.calories,
    });

    try {
      await setDoc(
        dashboardDocRef(uid, 'settings'),
        sanitizeForFirestore({ ...normalized, updatedAt: Date.now() })
      );
    } catch {
      // Fallback for legacy deployed firestore.rules that disallow layout/ramadan/calories keys
      await setDoc(
        dashboardDocRef(uid, 'settings'),
        sanitizeForFirestore({
          appTitle: normalized.appTitle,
          appLogoText: normalized.appLogoText,
          prayer: normalized.prayer,
          widgets: {
            prayerTimes: widgets.prayerTimes,
            fitness: widgets.fitness,
            journaling: widgets.journaling,
            calendar: widgets.calendar,
          },
          ...(normalized.weekendHighlight
            ? { weekendHighlight: normalized.weekendHighlight }
            : {}),
          updatedAt: Date.now(),
        })
      );
    }

    return normalized;
  },

  async saveRamadan(uid: string, ramadan: RamadanData): Promise<void> {
    writeLocalCache(uid, { ramadan });
    try {
      await setDoc(
        dashboardDocRef(uid, 'ramadan'),
        sanitizeForFirestore({ ...ramadan, updatedAt: Date.now() })
      );
    } catch {
      // Kept in localCache if legacy rules reject new doc ID
    }
  },

  async saveCaloriesConfig(uid: string, config: CalorieConfig): Promise<void> {
    writeLocalCache(uid, { caloriesConfig: config });
    try {
      await setDoc(
        dashboardDocRef(uid, 'calories'),
        sanitizeForFirestore({ ...config, updatedAt: Date.now() })
      );
    } catch {
      // Kept in localCache if legacy rules reject new doc ID
    }
  },

  async getCalorieLog(uid: string, date: string): Promise<DailyCalorieLog> {
    const local = readLocalCache(uid).calorieLogs?.[date];
    try {
      const snap = await getDoc(doc(calorieLogsCollectionRef(uid), date));
      if (snap.exists()) {
        const d = snap.data() as Partial<DailyCalorieLog>;
        return { date, entries: Array.isArray(d.entries) ? d.entries : [] };
      }
    } catch {
      // Fall back to local cache
    }
    return local ?? { date, entries: [] };
  },

  async saveCalorieLog(uid: string, log: DailyCalorieLog): Promise<void> {
    const prev = readLocalCache(uid).calorieLogs ?? {};
    writeLocalCache(uid, { calorieLogs: { ...prev, [log.date]: log } });
    try {
      await setDoc(
        doc(calorieLogsCollectionRef(uid), log.date),
        sanitizeForFirestore({ ...log, updatedAt: Date.now() })
      );
    } catch {
      // Kept in localCache if legacy rules reject new subcollection
    }
  },

  async createJournalEntry(uid: string, content: string): Promise<JournalEntry> {
    const newDoc = doc(journalCollectionRef(uid));
    const createdAt = Date.now();
    const trimmed = content.trim();
    await setDoc(
      newDoc,
      sanitizeForFirestore({
        content: trimmed,
        createdAt,
      })
    );
    return {
      id: newDoc.id,
      content: trimmed,
      createdAt,
    };
  },

  async updateJournalEntry(
    uid: string,
    entryId: string,
    content: string
  ): Promise<JournalEntry> {
    const ref = doc(journalCollectionRef(uid), entryId);
    const snap = await getDoc(ref);
    const existing = snap.exists() ? (snap.data() as { createdAt?: number }) : {};
    const updatedAt = Date.now();
    const trimmed = content.trim();
    await updateDoc(
      ref,
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
  },

  async deleteJournalEntry(uid: string, entryId: string): Promise<void> {
    await deleteDoc(doc(journalCollectionRef(uid), entryId));
  },

  async exportBackup(uid: string): Promise<VisionBackupPayload> {
    const ws = await this.getWorkspace(uid);
    return {
      version: 2,
      exportedAt: new Date().toISOString(),
      vision: ws.vision,
      countdowns: ws.countdowns,
      fitness: ws.fitness,
      settings: ws.settings,
      journal: ws.journal,
      ramadan: ws.ramadan,
      caloriesConfig: ws.caloriesConfig,
      calorieLogs: ws.calorieLogs,
    };
  },

  async importBackup(
    uid: string,
    payload: VisionBackupPayload,
    replaceJournal: boolean
  ): Promise<WorkspaceSnapshot> {
    const now = Date.now();
    const ops: Array<
      | { type: 'set'; ref: DocumentReference; data: Record<string, unknown> }
      | { type: 'delete'; ref: DocumentReference }
    > = [
      {
        type: 'set',
        ref: dashboardDocRef(uid, 'vision'),
        data: sanitizeForFirestore({ ...payload.vision, updatedAt: now }),
      },
      {
        type: 'set',
        ref: dashboardDocRef(uid, 'countdowns'),
        data: sanitizeForFirestore({ items: payload.countdowns, updatedAt: now }),
      },
      {
        type: 'set',
        ref: dashboardDocRef(uid, 'fitness'),
        data: sanitizeForFirestore({ ...payload.fitness, updatedAt: now }),
      },
    ];

    if (replaceJournal) {
      const existing = await getDocs(journalCollectionRef(uid));
      existing.forEach((docSnap) => {
        ops.push({ type: 'delete', ref: docSnap.ref });
      });
    }

    for (const entry of payload.journal) {
      if (entry && typeof entry.content === 'string' && entry.content.trim()) {
        const ref =
          replaceJournal && entry.id
            ? doc(journalCollectionRef(uid), String(entry.id))
            : doc(journalCollectionRef(uid));
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

    await commitChunkedOps(ops);
    await this.saveSettings(uid, payload.settings);
    if (payload.ramadan) await this.saveRamadan(uid, payload.ramadan);
    if (payload.caloriesConfig) await this.saveCaloriesConfig(uid, payload.caloriesConfig);
    if (payload.calorieLogs) {
      for (const log of Object.values(payload.calorieLogs)) {
        await this.saveCalorieLog(uid, log);
      }
    }

    return this.getWorkspace(uid);
  },

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
      widgets: normalizeWidgets(current.settings.widgets, undefined, DEFAULT_WIDGETS_EXISTING),
      weekendHighlight: normalizeWeekendHighlight(current.settings.weekendHighlight, 'sat-sun'),
      prayer: current.settings.prayer,
    };

    const payload =
      mode === 'blank' ? createBlankTemplate(choices) : createStarterTemplate(choices);

    const ops: Array<
      | { type: 'set'; ref: DocumentReference; data: Record<string, unknown> }
      | { type: 'delete'; ref: DocumentReference }
    > = [
      {
        type: 'set',
        ref: dashboardDocRef(uid, 'vision'),
        data: sanitizeForFirestore({ ...payload.vision, updatedAt: now }),
      },
      {
        type: 'set',
        ref: dashboardDocRef(uid, 'countdowns'),
        data: sanitizeForFirestore({ items: payload.countdowns, updatedAt: now }),
      },
      {
        type: 'set',
        ref: dashboardDocRef(uid, 'fitness'),
        data: sanitizeForFirestore({ ...payload.fitness, updatedAt: now }),
      },
    ];

    if (clearJournal) {
      const existing = await getDocs(journalCollectionRef(uid));
      existing.forEach((docSnap) => {
        ops.push({ type: 'delete', ref: docSnap.ref });
      });
      writeLocalCache(uid, { calorieLogs: {} });
    }

    await commitChunkedOps(ops);
    await this.saveSettings(uid, payload.settings);
    await this.saveRamadan(uid, payload.ramadan);
    await this.saveCaloriesConfig(uid, payload.caloriesConfig);

    return this.getWorkspace(uid);
  },

  async deleteWorkspace(uid: string): Promise<void> {
    clearLocalCache(uid);
    const journalSnap = await getDocs(journalCollectionRef(uid));
    const ops: Array<
      | { type: 'set'; ref: DocumentReference; data: Record<string, unknown> }
      | { type: 'delete'; ref: DocumentReference }
    > = [
      { type: 'delete', ref: dashboardDocRef(uid, 'vision') },
      { type: 'delete', ref: dashboardDocRef(uid, 'countdowns') },
      { type: 'delete', ref: dashboardDocRef(uid, 'fitness') },
      { type: 'delete', ref: dashboardDocRef(uid, 'settings') },
    ];
    journalSnap.forEach((docSnap) => {
      ops.push({ type: 'delete', ref: docSnap.ref });
    });

    await commitChunkedOps(ops);

    try {
      const logsSnap = await getDocs(calorieLogsCollectionRef(uid));
      const extraOps: Array<{ type: 'delete'; ref: DocumentReference }> = [
        { type: 'delete', ref: dashboardDocRef(uid, 'ramadan') },
        { type: 'delete', ref: dashboardDocRef(uid, 'calories') },
      ];
      logsSnap.forEach((docSnap) => {
        extraOps.push({ type: 'delete', ref: docSnap.ref });
      });
      await commitChunkedOps(extraOps);
    } catch {
      // Ignore if legacy rules don't expose new collections
    }
  },
};
