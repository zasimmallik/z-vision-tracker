import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  createBlankTemplate,
  createStarterTemplate,
  DEFAULT_PRAYER_SETTINGS,
  DEFAULT_SETTINGS,
  DEFAULT_WIDGETS_EXISTING,
  EMPTY_FITNESS,
  EMPTY_VISION,
} from '../data/defaults';
import type {
  AppSettings,
  CountdownMilestone,
  DashboardWidgets,
  FitnessData,
  JournalEntry,
  OnboardingChoices,
  VisionBackupPayload,
  VisionData,
  WeekendHighlight,
} from '../types/vision';

const getDb = () => {
  if (!db) {
    throw new Error('Firestore is not initialized.');
  }
  return db;
};

/**
 * Recursively strips `undefined` object properties (and replaces `undefined` array
 * elements) because Cloud Firestore rejects documents containing `undefined`.
 */
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

const dashboardDocRef = (
  uid: string,
  docId: 'vision' | 'countdowns' | 'fitness' | 'settings'
) => doc(getDb(), 'users', uid, 'dashboard', docId);

const journalCollectionRef = (uid: string) =>
  collection(getDb(), 'users', uid, 'journal');

const normalizeWidgets = (
  raw?: Partial<DashboardWidgets>,
  fallback: DashboardWidgets = DEFAULT_WIDGETS_EXISTING
): DashboardWidgets => ({
  prayerTimes: typeof raw?.prayerTimes === 'boolean' ? raw.prayerTimes : fallback.prayerTimes,
  fitness: typeof raw?.fitness === 'boolean' ? raw.fitness : fallback.fitness,
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

export const checkUserHasDashboard = async (uid: string): Promise<boolean> => {
  const visionSnap = await getDoc(dashboardDocRef(uid, 'vision'));
  return visionSnap.exists();
};

export const initializeUserWorkspace = async (
  uid: string,
  choices: OnboardingChoices
): Promise<void> => {
  const firestore = getDb();
  const payload =
    choices.templateMode === 'blank'
      ? createBlankTemplate(choices)
      : createStarterTemplate(choices);

  const now = Date.now();
  const batch = writeBatch(firestore);

  batch.set(
    dashboardDocRef(uid, 'vision'),
    sanitizeForFirestore({ ...payload.vision, updatedAt: now })
  );
  batch.set(
    dashboardDocRef(uid, 'countdowns'),
    sanitizeForFirestore({ items: payload.countdowns, updatedAt: now })
  );
  batch.set(
    dashboardDocRef(uid, 'fitness'),
    sanitizeForFirestore({ ...payload.fitness, updatedAt: now })
  );
  batch.set(
    dashboardDocRef(uid, 'settings'),
    sanitizeForFirestore({ ...payload.settings, updatedAt: now })
  );

  await batch.commit();
};

export interface DashboardSubscriptionCallbacks {
  onVision: (vision: VisionData) => void;
  onCountdowns: (countdowns: CountdownMilestone[]) => void;
  onFitness: (fitness: FitnessData) => void;
  onSettings: (settings: AppSettings) => void;
  onJournal: (entries: JournalEntry[]) => void;
  onError: (error: Error) => void;
}

export const subscribeDashboard = (
  uid: string,
  callbacks: DashboardSubscriptionCallbacks
): Unsubscribe => {
  const unsubVision = onSnapshot(
    dashboardDocRef(uid, 'vision'),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as VisionData;
        callbacks.onVision({
          title: data.title ?? EMPTY_VISION.title,
          subtitle: data.subtitle ?? '',
          visionPeriod: data.visionPeriod ?? '',
          endDate: data.endDate ?? EMPTY_VISION.endDate,
          businesses: Array.isArray(data.businesses) ? data.businesses : [],
          missions: Array.isArray(data.missions) ? data.missions : [],
        });
      }
    },
    (err) => callbacks.onError(err)
  );

  const unsubCountdowns = onSnapshot(
    dashboardDocRef(uid, 'countdowns'),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as { items?: CountdownMilestone[] };
        callbacks.onCountdowns(Array.isArray(data.items) ? data.items : []);
      }
    },
    (err) => callbacks.onError(err)
  );

  const unsubFitness = onSnapshot(
    dashboardDocRef(uid, 'fitness'),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as FitnessData;
        callbacks.onFitness({
          title: data.title ?? EMPTY_FITNESS.title,
          birthDate: data.birthDate,
          targetDate: data.targetDate ?? EMPTY_FITNESS.targetDate,
          metrics: Array.isArray(data.metrics) ? data.metrics : [],
        });
      }
    },
    (err) => callbacks.onError(err)
  );

  const unsubSettings = onSnapshot(
    dashboardDocRef(uid, 'settings'),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Partial<AppSettings>;
        callbacks.onSettings({
          appTitle: data.appTitle || DEFAULT_SETTINGS.appTitle,
          appLogoText: data.appLogoText || DEFAULT_SETTINGS.appLogoText,
          prayer: {
            ...DEFAULT_PRAYER_SETTINGS,
            ...(data.prayer ?? {}),
          },
          widgets: normalizeWidgets(data.widgets, DEFAULT_WIDGETS_EXISTING),
          weekendHighlight: normalizeWeekendHighlight(data.weekendHighlight, 'friday'),
        });
      }
    },
    (err) => callbacks.onError(err)
  );

  const journalQuery = query(journalCollectionRef(uid), orderBy('createdAt', 'desc'));
  const unsubJournal = onSnapshot(
    journalQuery,
    (snapshot) => {
      const entries: JournalEntry[] = snapshot.docs.map((docSnap) => {
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
      callbacks.onJournal(entries);
    },
    (err) => callbacks.onError(err)
  );

  return () => {
    unsubVision();
    unsubCountdowns();
    unsubFitness();
    unsubSettings();
    unsubJournal();
  };
};

export const saveVision = async (uid: string, vision: VisionData): Promise<void> => {
  await setDoc(
    dashboardDocRef(uid, 'vision'),
    sanitizeForFirestore({ ...vision, updatedAt: Date.now() })
  );
};

export const saveCountdowns = async (
  uid: string,
  items: CountdownMilestone[]
): Promise<void> => {
  await setDoc(
    dashboardDocRef(uid, 'countdowns'),
    sanitizeForFirestore({ items, updatedAt: Date.now() })
  );
};

export const saveFitness = async (uid: string, fitness: FitnessData): Promise<void> => {
  await setDoc(
    dashboardDocRef(uid, 'fitness'),
    sanitizeForFirestore({ ...fitness, updatedAt: Date.now() })
  );
};

export const saveSettings = async (uid: string, settings: AppSettings): Promise<void> => {
  const sanitizedSettings: AppSettings = {
    appTitle: settings.appTitle,
    appLogoText: settings.appLogoText,
    prayer: {
      cityName: settings.prayer.cityName,
      latitude: settings.prayer.latitude,
      longitude: settings.prayer.longitude,
      timezone: settings.prayer.timezone,
      calculationMethod: settings.prayer.calculationMethod,
      madhab: settings.prayer.madhab,
    },
    ...(settings.widgets ? { widgets: normalizeWidgets(settings.widgets) } : {}),
    ...(settings.weekendHighlight
      ? { weekendHighlight: normalizeWeekendHighlight(settings.weekendHighlight) }
      : {}),
  };

  await setDoc(
    dashboardDocRef(uid, 'settings'),
    sanitizeForFirestore({ ...sanitizedSettings, updatedAt: Date.now() })
  );
};

export const createJournalEntry = async (uid: string, content: string): Promise<void> => {
  const newDoc = doc(journalCollectionRef(uid));
  await setDoc(
    newDoc,
    sanitizeForFirestore({
      content: content.trim(),
      createdAt: Date.now(),
    })
  );
};

export const updateJournalEntryDoc = async (
  uid: string,
  entryId: string,
  content: string
): Promise<void> => {
  await updateDoc(
    doc(journalCollectionRef(uid), entryId),
    sanitizeForFirestore({
      content: content.trim(),
      updatedAt: Date.now(),
    })
  );
};

export const deleteJournalEntryDoc = async (uid: string, entryId: string): Promise<void> => {
  await deleteDoc(doc(journalCollectionRef(uid), entryId));
};

export const validateBackupPayload = (raw: unknown): VisionBackupPayload => {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Backup file is not a valid JSON object.');
  }
  const obj = raw as Record<string, unknown>;
  if (!obj.vision || typeof obj.vision !== 'object') {
    throw new Error('Backup is missing "vision" data.');
  }
  const vision = obj.vision as Partial<VisionData>;
  if (typeof vision.title !== 'string' || !Array.isArray(vision.missions)) {
    throw new Error('Backup "vision" object has invalid format.');
  }
  if (!Array.isArray(obj.countdowns)) {
    throw new Error('Backup is missing "countdowns" array.');
  }
  if (!obj.fitness || typeof obj.fitness !== 'object') {
    throw new Error('Backup is missing "fitness" data.');
  }
  const fitness = obj.fitness as Partial<FitnessData>;
  if (typeof fitness.targetDate !== 'string' || !Array.isArray(fitness.metrics)) {
    throw new Error('Backup "fitness" object has invalid format.');
  }

  const settingsRaw = (obj.settings as Partial<AppSettings> | undefined) ?? {};
  const rawPrayer = (settingsRaw.prayer ?? {}) as Partial<AppSettings['prayer']>;
  const settings: AppSettings = {
    appTitle:
      typeof settingsRaw.appTitle === 'string' && settingsRaw.appTitle.trim()
        ? settingsRaw.appTitle
        : DEFAULT_SETTINGS.appTitle,
    appLogoText:
      typeof settingsRaw.appLogoText === 'string' && settingsRaw.appLogoText.trim()
        ? settingsRaw.appLogoText
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
    ...(settingsRaw.widgets
      ? { widgets: normalizeWidgets(settingsRaw.widgets, DEFAULT_WIDGETS_EXISTING) }
      : {}),
    ...(settingsRaw.weekendHighlight
      ? {
          weekendHighlight: normalizeWeekendHighlight(
            settingsRaw.weekendHighlight,
            'friday'
          ),
        }
      : {}),
  };

  const journal = Array.isArray(obj.journal) ? (obj.journal as JournalEntry[]) : [];

  return {
    version: 1,
    exportedAt:
      typeof obj.exportedAt === 'string' ? obj.exportedAt : new Date().toISOString(),
    vision: {
      title: vision.title,
      subtitle: typeof vision.subtitle === 'string' ? vision.subtitle : '',
      visionPeriod: typeof vision.visionPeriod === 'string' ? vision.visionPeriod : '',
      endDate: typeof vision.endDate === 'string' ? vision.endDate : EMPTY_VISION.endDate,
      businesses: Array.isArray(vision.businesses) ? vision.businesses : [],
      missions: vision.missions,
    },
    countdowns: obj.countdowns as CountdownMilestone[],
    fitness: {
      title: typeof fitness.title === 'string' ? fitness.title : EMPTY_FITNESS.title,
      birthDate:
        typeof fitness.birthDate === 'string' ? fitness.birthDate : undefined,
      targetDate: fitness.targetDate,
      metrics: fitness.metrics,
    },
    settings,
    journal,
  };
};

export const importFullBackup = async (
  uid: string,
  payload: VisionBackupPayload,
  replaceJournal = true
): Promise<void> => {
  const firestore = getDb();
  const now = Date.now();
  const batch = writeBatch(firestore);

  batch.set(
    dashboardDocRef(uid, 'vision'),
    sanitizeForFirestore({ ...payload.vision, updatedAt: now })
  );
  batch.set(
    dashboardDocRef(uid, 'countdowns'),
    sanitizeForFirestore({ items: payload.countdowns, updatedAt: now })
  );
  batch.set(
    dashboardDocRef(uid, 'fitness'),
    sanitizeForFirestore({ ...payload.fitness, updatedAt: now })
  );
  batch.set(
    dashboardDocRef(uid, 'settings'),
    sanitizeForFirestore({ ...payload.settings, updatedAt: now })
  );

  if (replaceJournal) {
    const existingSnap = await getDocs(journalCollectionRef(uid));
    if (!existingSnap.empty) {
      const deleteBatch = writeBatch(firestore);
      existingSnap.forEach((docSnap) => {
        deleteBatch.delete(docSnap.ref);
      });
      await deleteBatch.commit();
    }
  }

  for (const entry of payload.journal) {
    if (entry && typeof entry.content === 'string' && entry.content.trim()) {
      const targetRef =
        replaceJournal && entry.id
          ? doc(journalCollectionRef(uid), String(entry.id))
          : doc(journalCollectionRef(uid));
      batch.set(
        targetRef,
        sanitizeForFirestore({
          content: entry.content.trim(),
          createdAt: typeof entry.createdAt === 'number' ? entry.createdAt : now,
          updatedAt: typeof entry.updatedAt === 'number' ? entry.updatedAt : undefined,
        })
      );
    }
  }

  await batch.commit();
};

export const resetDashboardToDefaults = async (
  uid: string,
  mode: 'blank' | 'starter',
  currentSettings: AppSettings,
  clearJournal = false
): Promise<void> => {
  const firestore = getDb();
  const now = Date.now();

  const choices: OnboardingChoices = {
    appTitle: currentSettings.appTitle,
    appLogoText: currentSettings.appLogoText,
    visionTitle: 'My 5-Year Vision',
    visionEndDate: EMPTY_VISION.endDate,
    templateMode: mode,
    widgets: normalizeWidgets(currentSettings.widgets, DEFAULT_WIDGETS_EXISTING),
    weekendHighlight: normalizeWeekendHighlight(currentSettings.weekendHighlight, 'sat-sun'),
    prayer: currentSettings.prayer,
  };

  const payload =
    mode === 'blank' ? createBlankTemplate(choices) : createStarterTemplate(choices);

  const batch = writeBatch(firestore);
  batch.set(
    dashboardDocRef(uid, 'vision'),
    sanitizeForFirestore({ ...payload.vision, updatedAt: now })
  );
  batch.set(
    dashboardDocRef(uid, 'countdowns'),
    sanitizeForFirestore({ items: payload.countdowns, updatedAt: now })
  );
  batch.set(
    dashboardDocRef(uid, 'fitness'),
    sanitizeForFirestore({ ...payload.fitness, updatedAt: now })
  );
  batch.set(
    dashboardDocRef(uid, 'settings'),
    sanitizeForFirestore({ ...payload.settings, updatedAt: now })
  );

  if (clearJournal) {
    const existingSnap = await getDocs(journalCollectionRef(uid));
    existingSnap.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
  }

  await batch.commit();
};

export const deleteUserWorkspaceData = async (uid: string): Promise<void> => {
  const firestore = getDb();
  const batch = writeBatch(firestore);

  batch.delete(dashboardDocRef(uid, 'vision'));
  batch.delete(dashboardDocRef(uid, 'countdowns'));
  batch.delete(dashboardDocRef(uid, 'fitness'));
  batch.delete(dashboardDocRef(uid, 'settings'));

  const journalSnap = await getDocs(journalCollectionRef(uid));
  journalSnap.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });

  await batch.commit();
};
