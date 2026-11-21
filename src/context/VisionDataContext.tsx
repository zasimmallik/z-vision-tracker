import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import {
  DEFAULT_SETTINGS,
  EMPTY_FITNESS,
  EMPTY_VISION,
  PRAYER_CITY_PRESETS,
  createBlankTemplate,
  createStarterTemplate,
} from '../data/defaults';
import {
  checkUserHasDashboard,
  createJournalEntry,
  deleteJournalEntryDoc,
  deleteUserWorkspaceData,
  importFullBackup,
  initializeUserWorkspace,
  resetDashboardToDefaults,
  saveCountdowns,
  saveFitness,
  saveSettings,
  saveVision,
  subscribeDashboard,
  updateJournalEntryDoc,
} from '../services/visionRepository';
import type {
  AppSettings,
  CountdownMilestone,
  FitnessData,
  JournalEntry,
  OnboardingChoices,
  VisionBackupPayload,
  VisionData,
} from '../types/vision';

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error';

interface VisionDataContextValue {
  vision: VisionData;
  countdowns: CountdownMilestone[];
  fitness: FitnessData;
  settings: AppSettings;
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
  addJournalEntry: (content: string) => Promise<void>;
  updateJournalEntry: (entryId: string, content: string) => Promise<void>;
  deleteJournalEntry: (entryId: string) => Promise<void>;
  buildBackupPayload: () => VisionBackupPayload;
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
      fitness: true,
      journaling: true,
      calendar: true,
    },
    weekendHighlight: 'sat-sun',
    prayer: PRAYER_CITY_PRESETS[5],
  });

  const now = Date.now();
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

  return { ...starter, sampleJournal };
};

const VisionDataContext = createContext<VisionDataContextValue | null>(null);

export const VisionDataProvider: React.FC<{
  children: React.ReactNode;
  demoMode?: boolean;
}> = ({ children, demoMode = false }) => {
  const { user } = useAuth();
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
  const [journal, setJournal] = useState<JournalEntry[]>(() =>
    demoMode ? createInitialDemoData().sampleJournal : []
  );
  const [loading, setLoading] = useState<boolean>(!demoMode);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  const savedTimerRef = useRef<number | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const markSavedTransient = useCallback(() => {
    if (savedTimerRef.current !== null) {
      window.clearTimeout(savedTimerRef.current);
      savedTimerRef.current = null;
    }
    setSyncStatus('saved');
    savedTimerRef.current = window.setTimeout(() => {
      setSyncStatus('idle');
    }, 2000);
  }, []);

  const runTrackedMutation = useCallback(async (action: () => Promise<void>) => {
    if (savedTimerRef.current !== null) {
      window.clearTimeout(savedTimerRef.current);
      savedTimerRef.current = null;
    }
    setSyncStatus('saving');
    setErrorMessage(null);
    try {
      await action();
      setSyncStatus('saved');
      savedTimerRef.current = window.setTimeout(() => {
        setSyncStatus('idle');
      }, 2500);
    } catch (err) {
      setSyncStatus('error');
      const msg = err instanceof Error ? err.message : 'Failed to save changes to Firestore.';
      setErrorMessage(msg);
      throw err;
    }
  }, []);

  const attachDashboardSubscription = useCallback(
    (uid: string, onReady?: () => void) => {
      unsubRef.current?.();
      let loadedCount = 0;
      let gotVision = false;
      let gotCountdowns = false;
      let gotFitness = false;
      let gotSettings = false;

      const markLoaded = () => {
        loadedCount++;
        if (loadedCount >= 4) {
          onReady?.();
          setLoading(false);
        }
      };

      unsubRef.current = subscribeDashboard(uid, {
        onVision: (v) => {
          setVision(v);
          if (!gotVision) {
            gotVision = true;
            markLoaded();
          }
        },
        onCountdowns: (items) => {
          setCountdowns(items);
          if (!gotCountdowns) {
            gotCountdowns = true;
            markLoaded();
          }
        },
        onFitness: (f) => {
          setFitness(f);
          if (!gotFitness) {
            gotFitness = true;
            markLoaded();
          }
        },
        onSettings: (s) => {
          setSettings(s);
          if (!gotSettings) {
            gotSettings = true;
            markLoaded();
          }
        },
        onJournal: (entries) => {
          setJournal(entries);
        },
        onError: (err) => {
          setSyncStatus('error');
          setErrorMessage(err.message);
          setLoading(false);
        },
      });
    },
    []
  );

  useEffect(() => {
    return () => {
      if (savedTimerRef.current !== null) {
        window.clearTimeout(savedTimerRef.current);
      }
      unsubRef.current?.();
    };
  }, []);

  useEffect(() => {
    unsubRef.current?.();
    unsubRef.current = null;
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
      setJournal(demo.sampleJournal);
      setLoading(false);
      return;
    }

    setVision(EMPTY_VISION);
    setCountdowns([]);
    setFitness(EMPTY_FITNESS);
    setSettings(DEFAULT_SETTINGS);
    setJournal([]);

    if (!user) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const init = async () => {
      try {
        const exists = await checkUserHasDashboard(user.uid);
        if (!isMounted) return;

        if (!exists) {
          setNeedsOnboarding(true);
          setLoading(false);
          return;
        }

        setNeedsOnboarding(false);
        attachDashboardSubscription(user.uid);
      } catch (err) {
        if (!isMounted) return;
        setSyncStatus('error');
        setErrorMessage(
          err instanceof Error ? err.message : 'Unable to connect to Cloud Firestore.'
        );
        setLoading(false);
      }
    };

    void init();

    return () => {
      isMounted = false;
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [user, demoMode, attachDashboardSubscription]);

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
        setNeedsOnboarding(false);
        return;
      }
      if (!user) return;
      await runTrackedMutation(async () => {
        await initializeUserWorkspace(user.uid, choices);
        setLoading(true);
        setNeedsOnboarding(false);
        attachDashboardSubscription(user.uid);
      });
    },
    [demoMode, user, runTrackedMutation, attachDashboardSubscription]
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
      await runTrackedMutation(() => saveVision(user.uid, next));
    },
    [demoMode, user, markSavedTransient, runTrackedMutation]
  );

  const updateCountdowns = useCallback(
    async (next: CountdownMilestone[]) => {
      setCountdowns(next);
      if (demoMode) {
        markSavedTransient();
        return;
      }
      if (!user) return;
      await runTrackedMutation(() => saveCountdowns(user.uid, next));
    },
    [demoMode, user, markSavedTransient, runTrackedMutation]
  );

  const updateFitness = useCallback(
    async (next: FitnessData) => {
      setFitness(next);
      if (demoMode) {
        markSavedTransient();
        return;
      }
      if (!user) return;
      await runTrackedMutation(() => saveFitness(user.uid, next));
    },
    [demoMode, user, markSavedTransient, runTrackedMutation]
  );

  const updateSettings = useCallback(
    async (next: AppSettings) => {
      setSettings(next);
      if (demoMode) {
        markSavedTransient();
        return;
      }
      if (!user) return;
      await runTrackedMutation(() => saveSettings(user.uid, next));
    },
    [demoMode, user, markSavedTransient, runTrackedMutation]
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
      await runTrackedMutation(() => createJournalEntry(user.uid, trimmed));
    },
    [demoMode, user, markSavedTransient, runTrackedMutation]
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
      await runTrackedMutation(() => updateJournalEntryDoc(user.uid, entryId, trimmed));
    },
    [demoMode, user, markSavedTransient, runTrackedMutation]
  );

  const deleteJournalEntry = useCallback(
    async (entryId: string) => {
      if (demoMode) {
        setJournal((prev) => prev.filter((e) => e.id !== entryId));
        markSavedTransient();
        return;
      }
      if (!user) return;
      await runTrackedMutation(() => deleteJournalEntryDoc(user.uid, entryId));
    },
    [demoMode, user, markSavedTransient, runTrackedMutation]
  );

  const buildBackupPayload = useCallback((): VisionBackupPayload => {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      vision,
      countdowns,
      fitness,
      settings,
      journal,
    };
  }, [vision, countdowns, fitness, settings, journal]);

  const importBackup = useCallback(
    async (payload: VisionBackupPayload, replaceJournal = true) => {
      if (demoMode) {
        setVision(payload.vision);
        setCountdowns(payload.countdowns);
        setFitness(payload.fitness);
        setSettings(payload.settings);
        setJournal((prev) =>
          replaceJournal ? payload.journal : [...payload.journal, ...prev]
        );
        markSavedTransient();
        return;
      }
      if (!user) return;
      await runTrackedMutation(() => importFullBackup(user.uid, payload, replaceJournal));
    },
    [demoMode, user, markSavedTransient, runTrackedMutation]
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
          widgets: settings.widgets ?? {
            prayerTimes: true,
            fitness: true,
            journaling: true,
            calendar: true,
          },
          weekendHighlight: settings.weekendHighlight ?? 'sat-sun',
          prayer: settings.prayer,
        };
        const payload =
          mode === 'blank' ? createBlankTemplate(choices) : createStarterTemplate(choices);
        setVision(payload.vision);
        setCountdowns(payload.countdowns);
        setFitness(payload.fitness);
        setSettings(payload.settings);
        if (clearJournal) setJournal([]);
        markSavedTransient();
        return;
      }
      if (!user) return;
      await runTrackedMutation(() =>
        resetDashboardToDefaults(user.uid, mode, settings, clearJournal)
      );
    },
    [demoMode, user, settings, markSavedTransient, runTrackedMutation]
  );

  const deleteAllAccountData = useCallback(async () => {
    if (demoMode) {
      const demo = createInitialDemoData();
      setVision(demo.vision);
      setCountdowns(demo.countdowns);
      setFitness(demo.fitness);
      setSettings(demo.settings);
      setJournal([]);
      setIsEditMode(false);
      setNeedsOnboarding(true);
      return;
    }
    if (!user) return;
    await runTrackedMutation(async () => {
      unsubRef.current?.();
      unsubRef.current = null;
      await deleteUserWorkspaceData(user.uid);
      setVision(EMPTY_VISION);
      setCountdowns([]);
      setFitness(EMPTY_FITNESS);
      setSettings(DEFAULT_SETTINGS);
      setJournal([]);
      setIsEditMode(false);
      setNeedsOnboarding(true);
    });
  }, [demoMode, user, runTrackedMutation]);

  return (
    <VisionDataContext.Provider
      value={{
        vision,
        countdowns,
        fitness,
        settings,
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
        addJournalEntry,
        updateJournalEntry,
        deleteJournalEntry,
        buildBackupPayload,
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
