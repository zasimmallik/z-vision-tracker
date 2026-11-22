import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  DEFAULT_CALORIE_CONFIG,
  DEFAULT_DASHBOARD_LAYOUT,
  DEFAULT_RAMADAN_DATA,
  DEFAULT_SETTINGS,
  DEFAULT_WIDGETS_EXISTING,
  EMPTY_FITNESS,
  EMPTY_VISION,
  PRAYER_CITY_PRESETS,
  createBlankTemplate,
  createStarterTemplate,
  getCurrentHijriYear,
  reconcileLayout,
  toLocalYmd,
  type AppSettings,
  type CalorieConfig,
  type CountdownMilestone,
  type DailyCalorieLog,
  type DashboardLayout,
  type FitnessData,
  type JournalEntry,
  type OnboardingChoices,
  type RamadanData,
  type VisionBackupPayload,
  type VisionData,
} from '@z-vision/shared';
import { useAuth } from './AuthContext';
import { visionApi } from '../../shared/api/visionApi';

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error';

interface VisionDataContextValue {
  vision: VisionData;
  countdowns: CountdownMilestone[];
  fitness: FitnessData;
  settings: AppSettings;
  ramadan: RamadanData;
  caloriesConfig: CalorieConfig;
  calorieLogs: Record<string, DailyCalorieLog>;
  journal: JournalEntry[];
  loading: boolean;
  needsOnboarding: boolean;
  isDemoMode: boolean;
  syncStatus: SyncStatus;
  errorMessage: string | null;
  isEditMode: boolean;
  setIsEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  clearError: () => void;
  completeOnboarding: (choices: OnboardingChoices) => Promise<void>;
  updateVision: (next: VisionData) => Promise<void>;
  updateCountdowns: (next: CountdownMilestone[]) => Promise<void>;
  updateFitness: (next: FitnessData) => Promise<void>;
  updateSettings: (next: AppSettings) => Promise<void>;
  updateLayout: (nextLayout: DashboardLayout) => Promise<void>;
  resetLayout: () => Promise<void>;
  updateRamadan: (next: RamadanData) => Promise<void>;
  updateCaloriesConfig: (next: CalorieConfig) => Promise<void>;
  loadCalorieLogForDate: (date: string) => Promise<void>;
  saveCalorieLogForDate: (log: DailyCalorieLog) => Promise<void>;
  addJournalEntry: (content: string) => Promise<void>;
  updateJournalEntry: (entryId: string, content: string) => Promise<void>;
  deleteJournalEntry: (entryId: string) => Promise<void>;
  buildBackupPayload: () => VisionBackupPayload;
  fetchFullBackup: () => Promise<VisionBackupPayload>;
  importBackup: (payload: VisionBackupPayload, replaceJournal?: boolean) => Promise<void>;
  resetDefaults: (mode: 'blank' | 'starter', clearJournal?: boolean) => Promise<void>;
  deleteAllAccountData: () => Promise<void>;
}

const createInitialDemoData = () => {
  const starter = createStarterTemplate({
    appTitle: 'Z Vision',
    appLogoText: 'Z',
    visionTitle: 'My 5-Year Vision',
    visionEndDate: EMPTY_VISION.endDate,
    templateMode: 'starter',
    widgets: {
      prayerTimes: true,
      ramadan: true,
      fitness: true,
      calories: true,
      journaling: true,
      calendar: true,
    },
    weekendHighlight: 'sat-sun',
    prayer: PRAYER_CITY_PRESETS[5],
  });

  const now = Date.now();
  const today = toLocalYmd();
  const hijriYear = getCurrentHijriYear(new Date(), PRAYER_CITY_PRESETS[5].timezone);

  const sampleJournal: JournalEntry[] = [
    {
      id: 'demo-entry-1',
      content:
        'Reviewed quarterly priorities and broke Phase 1 down into actionable weekly milestones.',
      createdAt: now - 2 * 60 * 60 * 1000,
    },
    {
      id: 'demo-entry-2',
      content:
        'Completed 4 training sessions this week and stayed consistent with daily deep work.',
      createdAt: now - 26 * 60 * 60 * 1000,
    },
  ];

  const sampleCalorieLogs: Record<string, DailyCalorieLog> = {
    [today]: {
      date: today,
      entries: [
        {
          id: 'demo-cal-1',
          name: 'Oatmeal & Banana',
          meal: 'breakfast',
          calories: 320,
          protein: 10,
          carbs: 58,
          fat: 6,
          createdAt: now - 4 * 60 * 60 * 1000,
        },
        {
          id: 'demo-cal-2',
          name: 'Grilled Chicken (150g) & Salad',
          meal: 'lunch',
          calories: 440,
          protein: 48,
          carbs: 22,
          fat: 14,
          createdAt: now - 60 * 60 * 1000,
        },
      ],
    },
  };

  const sampleRamadan: RamadanData = {
    hijriYear,
    hijriOffset: 0,
    fastedDays: {
      [`${hijriYear}-1`]: true,
      [`${hijriYear}-2`]: true,
      [`${hijriYear}-3`]: true,
    },
  };

  return { ...starter, sampleJournal, sampleCalorieLogs, sampleRamadan };
};

const VisionDataContext = createContext<VisionDataContextValue | null>(null);

export const VisionDataProvider: React.FC<{
  children: React.ReactNode;
  demoMode?: boolean;
}> = ({ children, demoMode = false }) => {
  const { user, getIdToken } = useAuth();
  const [vision, setVision] = useState<VisionData>(() =>
    demoMode ? createInitialDemoData().vision : EMPTY_VISION
  );
  const [countdowns, setCountdowns] = useState<CountdownMilestone[]>(() =>
    demoMode ? createInitialDemoData().countdowns : []
  );
  const [fitness, setFitness] = useState<FitnessData>(() =>
    demoMode ? createInitialDemoData().fitness : EMPTY_FITNESS
  );
  const [settings, setSettings] = useState<AppSettings>(() =>
    demoMode ? createInitialDemoData().settings : DEFAULT_SETTINGS
  );
  const [ramadan, setRamadan] = useState<RamadanData>(() =>
    demoMode ? createInitialDemoData().sampleRamadan : DEFAULT_RAMADAN_DATA
  );
  const [caloriesConfig, setCaloriesConfig] = useState<CalorieConfig>(() =>
    demoMode ? createInitialDemoData().caloriesConfig : DEFAULT_CALORIE_CONFIG
  );
  const [calorieLogs, setCalorieLogs] = useState<Record<string, DailyCalorieLog>>(() =>
    demoMode ? createInitialDemoData().sampleCalorieLogs : {}
  );
  const [journal, setJournal] = useState<JournalEntry[]>(() =>
    demoMode ? createInitialDemoData().sampleJournal : []
  );

  const [loading, setLoading] = useState<boolean>(!demoMode);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  const savedTimerRef = useRef<number | null>(null);
  const useFirestoreFallbackRef = useRef<boolean>(false);

  const getFallback = useCallback(async () => {
    const mod = await import('../../shared/api/firestoreFallback');
    return mod.firestoreFallback;
  }, []);

  const markSavedTransient = useCallback(() => {
    if (savedTimerRef.current !== null) {
      window.clearTimeout(savedTimerRef.current);
      savedTimerRef.current = null;
    }
    setSyncStatus('saved');
    savedTimerRef.current = window.setTimeout(() => {
      setSyncStatus('idle');
    }, 2200);
  }, []);

  const runTrackedMutation = useCallback(
    async <T,>(action: () => Promise<T>): Promise<T> => {
      if (savedTimerRef.current !== null) {
        window.clearTimeout(savedTimerRef.current);
        savedTimerRef.current = null;
      }
      setSyncStatus('saving');
      setErrorMessage(null);
      try {
        const result = await action();
        markSavedTransient();
        return result;
      } catch (err) {
        setSyncStatus('error');
        const msg = err instanceof Error ? err.message : 'Failed to sync changes.';
        setErrorMessage(msg);
        throw err;
      }
    },
    [markSavedTransient]
  );

  useEffect(() => {
    return () => {
      if (savedTimerRef.current !== null) {
        window.clearTimeout(savedTimerRef.current);
      }
    };
  }, []);

  const applySnapshot = useCallback(
    (snapshot: {
      vision: VisionData;
      countdowns: CountdownMilestone[];
      fitness: FitnessData;
      settings: AppSettings;
      ramadan: RamadanData;
      caloriesConfig: CalorieConfig;
      journal: JournalEntry[];
      calorieLogs: Record<string, DailyCalorieLog>;
    }) => {
      setVision(snapshot.vision);
      setCountdowns(snapshot.countdowns);
      setFitness(snapshot.fitness);
      setSettings(snapshot.settings);
      setRamadan(snapshot.ramadan);
      setCaloriesConfig(snapshot.caloriesConfig);
      setJournal(snapshot.journal);
      setCalorieLogs(snapshot.calorieLogs);
    },
    []
  );

  useEffect(() => {
    setIsEditMode(false);
    setErrorMessage(null);
    setSyncStatus('idle');
    setNeedsOnboarding(false);

    if (demoMode) {
      const demo = createInitialDemoData();
      setVision(demo.vision);
      setCountdowns(demo.countdowns);
      setFitness(demo.fitness);
      setSettings(demo.settings);
      setRamadan(demo.sampleRamadan);
      setCaloriesConfig(demo.caloriesConfig);
      setJournal(demo.sampleJournal);
      setCalorieLogs(demo.sampleCalorieLogs);
      setLoading(false);
      return;
    }

    setVision(EMPTY_VISION);
    setCountdowns([]);
    setFitness(EMPTY_FITNESS);
    setSettings(DEFAULT_SETTINGS);
    setRamadan(DEFAULT_RAMADAN_DATA);
    setCaloriesConfig(DEFAULT_CALORIE_CONFIG);
    setJournal([]);
    setCalorieLogs({});

    if (!user) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    useFirestoreFallbackRef.current = false;

    const loadWorkspace = async () => {
      try {
        let snapshot;
        try {
          snapshot = await visionApi.getWorkspace(getIdToken);
          useFirestoreFallbackRef.current = false;
        } catch {
          // If backend API is not running / not configured, fall back directly to Cloud Firestore
          const fb = await getFallback();
          snapshot = await fb.getWorkspace(user.uid);
          useFirestoreFallbackRef.current = true;
        }

        if (!isMounted) return;

        if (!snapshot.exists) {
          setNeedsOnboarding(true);
          setLoading(false);
          return;
        }

        setNeedsOnboarding(false);
        applySnapshot(snapshot);
        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        setSyncStatus('error');
        setErrorMessage(
          err instanceof Error ? err.message : 'Unable to load workspace.'
        );
        setLoading(false);
      }
    };

    void loadWorkspace();

    return () => {
      isMounted = false;
    };
  }, [user, demoMode, getIdToken, getFallback, applySnapshot]);

  const completeOnboarding = useCallback(
    async (choices: OnboardingChoices) => {
      if (demoMode) {
        const payload =
          choices.templateMode === 'blank'
            ? createBlankTemplate(choices)
            : createStarterTemplate(choices);
        setVision(payload.vision);
        setCountdowns(payload.countdowns);
        setFitness(payload.fitness);
        setSettings(payload.settings);
        setRamadan(payload.ramadan);
        setCaloriesConfig(payload.caloriesConfig);
        setNeedsOnboarding(false);
        markSavedTransient();
        return;
      }
      if (!user) return;
      const snapshot = await runTrackedMutation(async () => {
        if (useFirestoreFallbackRef.current) {
          const fb = await getFallback();
          return fb.initializeWorkspace(user.uid, choices);
        }
        return visionApi.initializeWorkspace(getIdToken, choices);
      });
      applySnapshot(snapshot);
      setNeedsOnboarding(false);
    },
    [demoMode, user, getIdToken, getFallback, markSavedTransient, runTrackedMutation, applySnapshot]
  );

  const clearError = useCallback(() => {
    setErrorMessage(null);
    if (syncStatus === 'error') {
      setSyncStatus('idle');
    }
  }, [syncStatus]);

  const updateVision = useCallback(
    async (next: VisionData) => {
      setVision(next);
      if (demoMode) {
        markSavedTransient();
        return;
      }
      if (!user) return;
      await runTrackedMutation(async () => {
        if (useFirestoreFallbackRef.current) {
          const fb = await getFallback();
          return fb.saveVision(user.uid, next);
        }
        return visionApi.saveVision(getIdToken, next);
      });
    },
    [demoMode, user, getIdToken, getFallback, markSavedTransient, runTrackedMutation]
  );

  const updateCountdowns = useCallback(
    async (next: CountdownMilestone[]) => {
      setCountdowns(next);
      if (demoMode) {
        markSavedTransient();
        return;
      }
      if (!user) return;
      await runTrackedMutation(async () => {
        if (useFirestoreFallbackRef.current) {
          const fb = await getFallback();
          return fb.saveCountdowns(user.uid, next);
        }
        return visionApi.saveCountdowns(getIdToken, next);
      });
    },
    [demoMode, user, getIdToken, getFallback, markSavedTransient, runTrackedMutation]
  );

  const updateFitness = useCallback(
    async (next: FitnessData) => {
      setFitness(next);
      if (demoMode) {
        markSavedTransient();
        return;
      }
      if (!user) return;
      await runTrackedMutation(async () => {
        if (useFirestoreFallbackRef.current) {
          const fb = await getFallback();
          return fb.saveFitness(user.uid, next);
        }
        return visionApi.saveFitness(getIdToken, next);
      });
    },
    [demoMode, user, getIdToken, getFallback, markSavedTransient, runTrackedMutation]
  );

  const updateSettings = useCallback(
    async (next: AppSettings) => {
      const widgets = next.widgets ?? DEFAULT_WIDGETS_EXISTING;
      const normalized: AppSettings = {
        ...next,
        widgets,
        layout: reconcileLayout(next.layout, widgets),
      };
      setSettings(normalized);
      if (demoMode) {
        markSavedTransient();
        return;
      }
      if (!user) return;
      const savedSettings = await runTrackedMutation(async () => {
        if (useFirestoreFallbackRef.current) {
          const fb = await getFallback();
          return fb.saveSettings(user.uid, normalized);
        }
        const res = await visionApi.saveSettings(getIdToken, normalized);
        return res.settings;
      });
      if (savedSettings) {
        setSettings(savedSettings);
      }
    },
    [demoMode, user, getIdToken, getFallback, markSavedTransient, runTrackedMutation]
  );

  const updateLayout = useCallback(
    async (nextLayout: DashboardLayout) => {
      await updateSettings({
        ...settings,
        layout: reconcileLayout(nextLayout, settings.widgets ?? DEFAULT_WIDGETS_EXISTING),
      });
    },
    [settings, updateSettings]
  );

  const resetLayout = useCallback(async () => {
    await updateSettings({
      ...settings,
      layout: reconcileLayout(
        DEFAULT_DASHBOARD_LAYOUT,
        settings.widgets ?? DEFAULT_WIDGETS_EXISTING
      ),
    });
  }, [settings, updateSettings]);

  const updateRamadan = useCallback(
    async (next: RamadanData) => {
      setRamadan(next);
      if (demoMode) {
        markSavedTransient();
        return;
      }
      if (!user) return;
      await runTrackedMutation(async () => {
        if (useFirestoreFallbackRef.current) {
          const fb = await getFallback();
          return fb.saveRamadan(user.uid, next);
        }
        return visionApi.saveRamadan(getIdToken, next);
      });
    },
    [demoMode, user, getIdToken, getFallback, markSavedTransient, runTrackedMutation]
  );

  const updateCaloriesConfig = useCallback(
    async (next: CalorieConfig) => {
      setCaloriesConfig(next);
      if (demoMode) {
        markSavedTransient();
        return;
      }
      if (!user) return;
      await runTrackedMutation(async () => {
        if (useFirestoreFallbackRef.current) {
          const fb = await getFallback();
          return fb.saveCaloriesConfig(user.uid, next);
        }
        return visionApi.saveCaloriesConfig(getIdToken, next);
      });
    },
    [demoMode, user, getIdToken, getFallback, markSavedTransient, runTrackedMutation]
  );

  const loadCalorieLogForDate = useCallback(
    async (date: string) => {
      if (demoMode || !user || calorieLogs[date]) return;
      try {
        const log = useFirestoreFallbackRef.current
          ? await (await getFallback()).getCalorieLog(user.uid, date)
          : await visionApi.getCalorieLog(getIdToken, date);
        setCalorieLogs((prev) => ({ ...prev, [date]: log }));
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Unable to load calorie log.'
        );
      }
    },
    [demoMode, user, calorieLogs, getIdToken, getFallback]
  );

  const saveCalorieLogForDate = useCallback(
    async (log: DailyCalorieLog) => {
      setCalorieLogs((prev) => ({ ...prev, [log.date]: log }));
      if (demoMode) {
        markSavedTransient();
        return;
      }
      if (!user) return;
      await runTrackedMutation(async () => {
        if (useFirestoreFallbackRef.current) {
          const fb = await getFallback();
          return fb.saveCalorieLog(user.uid, log);
        }
        return visionApi.saveCalorieLog(getIdToken, log);
      });
    },
    [demoMode, user, getIdToken, getFallback, markSavedTransient, runTrackedMutation]
  );

  const addJournalEntry = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;
      if (demoMode) {
        setJournal((prev) => [
          {
            id: `demo-${Date.now()}`,
            content: trimmed,
            createdAt: Date.now(),
          },
          ...prev,
        ]);
        markSavedTransient();
        return;
      }
      if (!user) return;
      const created = await runTrackedMutation(async () => {
        if (useFirestoreFallbackRef.current) {
          const fb = await getFallback();
          return fb.createJournalEntry(user.uid, trimmed);
        }
        return visionApi.createJournalEntry(getIdToken, trimmed);
      });
      setJournal((prev) => [created, ...prev]);
    },
    [demoMode, user, getIdToken, getFallback, markSavedTransient, runTrackedMutation]
  );

  const updateJournalEntry = useCallback(
    async (entryId: string, content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;
      if (demoMode) {
        setJournal((prev) =>
          prev.map((e) =>
            e.id === entryId ? { ...e, content: trimmed, updatedAt: Date.now() } : e
          )
        );
        markSavedTransient();
        return;
      }
      if (!user) return;
      const updated = await runTrackedMutation(async () => {
        if (useFirestoreFallbackRef.current) {
          const fb = await getFallback();
          return fb.updateJournalEntry(user.uid, entryId, trimmed);
        }
        return visionApi.updateJournalEntry(getIdToken, entryId, trimmed);
      });
      setJournal((prev) => prev.map((e) => (e.id === entryId ? updated : e)));
    },
    [demoMode, user, getIdToken, getFallback, markSavedTransient, runTrackedMutation]
  );

  const deleteJournalEntry = useCallback(
    async (entryId: string) => {
      if (demoMode) {
        setJournal((prev) => prev.filter((e) => e.id !== entryId));
        markSavedTransient();
        return;
      }
      if (!user) return;
      await runTrackedMutation(async () => {
        if (useFirestoreFallbackRef.current) {
          const fb = await getFallback();
          return fb.deleteJournalEntry(user.uid, entryId);
        }
        return visionApi.deleteJournalEntry(getIdToken, entryId);
      });
      setJournal((prev) => prev.filter((e) => e.id !== entryId));
    },
    [demoMode, user, getIdToken, getFallback, markSavedTransient, runTrackedMutation]
  );

  const buildBackupPayload = useCallback((): VisionBackupPayload => {
    return {
      version: 2,
      exportedAt: new Date().toISOString(),
      vision,
      countdowns,
      fitness,
      settings,
      journal,
      ramadan,
      caloriesConfig,
      calorieLogs,
    };
  }, [vision, countdowns, fitness, settings, journal, ramadan, caloriesConfig, calorieLogs]);

  const fetchFullBackup = useCallback(async (): Promise<VisionBackupPayload> => {
    if (demoMode || !user) {
      return buildBackupPayload();
    }
    if (useFirestoreFallbackRef.current) {
      const fb = await getFallback();
      return fb.exportBackup(user.uid);
    }
    return visionApi.exportBackup(getIdToken);
  }, [demoMode, user, getIdToken, getFallback, buildBackupPayload]);

  const importBackup = useCallback(
    async (payload: VisionBackupPayload, replaceJournal = true) => {
      if (demoMode) {
        setVision(payload.vision);
        setCountdowns(payload.countdowns);
        setFitness(payload.fitness);
        setSettings(payload.settings);
        if (payload.ramadan) setRamadan(payload.ramadan);
        if (payload.caloriesConfig) setCaloriesConfig(payload.caloriesConfig);
        if (payload.calorieLogs) setCalorieLogs(payload.calorieLogs);
        setJournal((prev) =>
          replaceJournal ? payload.journal : [...payload.journal, ...prev]
        );
        markSavedTransient();
        return;
      }
      if (!user) return;
      const snapshot = await runTrackedMutation(async () => {
        if (useFirestoreFallbackRef.current) {
          const fb = await getFallback();
          return fb.importBackup(user.uid, payload, replaceJournal);
        }
        return visionApi.importBackup(getIdToken, payload, replaceJournal);
      });
      applySnapshot(snapshot);
    },
    [demoMode, user, getIdToken, getFallback, markSavedTransient, runTrackedMutation, applySnapshot]
  );

  const resetDefaults = useCallback(
    async (mode: 'blank' | 'starter', clearJournal = false) => {
      if (demoMode) {
        const choices: OnboardingChoices = {
          appTitle: settings.appTitle,
          appLogoText: settings.appLogoText,
          visionTitle: 'My 5-Year Vision',
          visionEndDate: EMPTY_VISION.endDate,
          templateMode: mode,
          widgets: settings.widgets ?? DEFAULT_WIDGETS_EXISTING,
          weekendHighlight: settings.weekendHighlight ?? 'sat-sun',
          prayer: settings.prayer,
        };
        const payload =
          mode === 'blank' ? createBlankTemplate(choices) : createStarterTemplate(choices);
        setVision(payload.vision);
        setCountdowns(payload.countdowns);
        setFitness(payload.fitness);
        setSettings(payload.settings);
        setRamadan(payload.ramadan);
        setCaloriesConfig(payload.caloriesConfig);
        if (clearJournal) {
          setJournal([]);
          setCalorieLogs({});
        }
        markSavedTransient();
        return;
      }
      if (!user) return;
      const snapshot = await runTrackedMutation(async () => {
        if (useFirestoreFallbackRef.current) {
          const fb = await getFallback();
          return fb.resetWorkspace(user.uid, mode, clearJournal);
        }
        return visionApi.resetWorkspace(getIdToken, mode, clearJournal);
      });
      applySnapshot(snapshot);
    },
    [demoMode, user, settings, getIdToken, getFallback, markSavedTransient, runTrackedMutation, applySnapshot]
  );

  const deleteAllAccountData = useCallback(async () => {
    if (demoMode) {
      setVision(EMPTY_VISION);
      setCountdowns([]);
      setFitness(EMPTY_FITNESS);
      setSettings(DEFAULT_SETTINGS);
      setRamadan(DEFAULT_RAMADAN_DATA);
      setCaloriesConfig(DEFAULT_CALORIE_CONFIG);
      setCalorieLogs({});
      setJournal([]);
      setIsEditMode(false);
      setNeedsOnboarding(true);
      return;
    }
    if (!user) return;
    await runTrackedMutation(async () => {
      if (useFirestoreFallbackRef.current) {
        const fb = await getFallback();
        await fb.deleteWorkspace(user.uid);
      } else {
        await visionApi.deleteWorkspace(getIdToken);
      }
      setVision(EMPTY_VISION);
      setCountdowns([]);
      setFitness(EMPTY_FITNESS);
      setSettings(DEFAULT_SETTINGS);
      setRamadan(DEFAULT_RAMADAN_DATA);
      setCaloriesConfig(DEFAULT_CALORIE_CONFIG);
      setCalorieLogs({});
      setJournal([]);
      setIsEditMode(false);
      setNeedsOnboarding(true);
    });
  }, [demoMode, user, getIdToken, getFallback, runTrackedMutation]);

  return (
    <VisionDataContext.Provider
      value={{
        vision,
        countdowns,
        fitness,
        settings,
        ramadan,
        caloriesConfig,
        calorieLogs,
        journal,
        loading,
        needsOnboarding,
        isDemoMode: demoMode,
        syncStatus,
        errorMessage,
        isEditMode,
        setIsEditMode,
        clearError,
        completeOnboarding,
        updateVision,
        updateCountdowns,
        updateFitness,
        updateSettings,
        updateLayout,
        resetLayout,
        updateRamadan,
        updateCaloriesConfig,
        loadCalorieLogForDate,
        saveCalorieLogForDate,
        addJournalEntry,
        updateJournalEntry,
        deleteJournalEntry,
        buildBackupPayload,
        fetchFullBackup,
        importBackup,
        resetDefaults,
        deleteAllAccountData,
      }}
    >
      {children}
    </VisionDataContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useVisionData = (): VisionDataContextValue => {
  const ctx = useContext(VisionDataContext);
  if (!ctx) {
    throw new Error('useVisionData must be used inside VisionDataProvider');
  }
  return ctx;
};
