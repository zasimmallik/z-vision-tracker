import type {
  AppSettings,
  CalorieConfig,
  CountdownMilestone,
  DailyCalorieLog,
  FitnessData,
  JournalEntry,
  OnboardingChoices,
  RamadanData,
  VisionBackupPayload,
  VisionData,
  WorkspaceSnapshot,
} from '@z-vision/shared';

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

export type TokenProvider = () => Promise<string>;

async function apiRequest<T>(
  getToken: TokenProvider,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    details?: unknown;
  };

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return data as T;
}

export const visionApi = {
  getWorkspace: (getToken: TokenProvider) =>
    apiRequest<WorkspaceSnapshot>(getToken, '/api/v1/workspace'),

  initializeWorkspace: (getToken: TokenProvider, choices: OnboardingChoices) =>
    apiRequest<WorkspaceSnapshot>(getToken, '/api/v1/workspace/onboarding', {
      method: 'POST',
      body: JSON.stringify(choices),
    }),

  saveVision: (getToken: TokenProvider, vision: VisionData) =>
    apiRequest<{ ok: boolean }>(getToken, '/api/v1/workspace/vision', {
      method: 'PUT',
      body: JSON.stringify(vision),
    }),

  saveCountdowns: (getToken: TokenProvider, items: CountdownMilestone[]) =>
    apiRequest<{ ok: boolean }>(getToken, '/api/v1/workspace/countdowns', {
      method: 'PUT',
      body: JSON.stringify({ items }),
    }),

  saveFitness: (getToken: TokenProvider, fitness: FitnessData) =>
    apiRequest<{ ok: boolean }>(getToken, '/api/v1/workspace/fitness', {
      method: 'PUT',
      body: JSON.stringify(fitness),
    }),

  saveSettings: (getToken: TokenProvider, settings: AppSettings) =>
    apiRequest<{ ok: boolean; settings: AppSettings }>(
      getToken,
      '/api/v1/workspace/settings',
      {
        method: 'PUT',
        body: JSON.stringify(settings),
      }
    ),

  saveRamadan: (getToken: TokenProvider, ramadan: RamadanData) =>
    apiRequest<{ ok: boolean }>(getToken, '/api/v1/workspace/ramadan', {
      method: 'PUT',
      body: JSON.stringify(ramadan),
    }),

  saveCaloriesConfig: (getToken: TokenProvider, config: CalorieConfig) =>
    apiRequest<{ ok: boolean }>(getToken, '/api/v1/workspace/calories/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    }),

  getCalorieLog: (getToken: TokenProvider, date: string) =>
    apiRequest<DailyCalorieLog>(getToken, `/api/v1/workspace/calories/logs/${date}`),

  saveCalorieLog: (getToken: TokenProvider, log: DailyCalorieLog) =>
    apiRequest<{ ok: boolean }>(
      getToken,
      `/api/v1/workspace/calories/logs/${log.date}`,
      {
        method: 'PUT',
        body: JSON.stringify(log),
      }
    ),

  createJournalEntry: (getToken: TokenProvider, content: string) =>
    apiRequest<JournalEntry>(getToken, '/api/v1/workspace/journal', {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  updateJournalEntry: (getToken: TokenProvider, entryId: string, content: string) =>
    apiRequest<JournalEntry>(getToken, `/api/v1/workspace/journal/${entryId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    }),

  deleteJournalEntry: (getToken: TokenProvider, entryId: string) =>
    apiRequest<void>(getToken, `/api/v1/workspace/journal/${entryId}`, {
      method: 'DELETE',
    }),

  exportBackup: (getToken: TokenProvider) =>
    apiRequest<VisionBackupPayload>(getToken, '/api/v1/workspace/backup/export'),

  importBackup: (
    getToken: TokenProvider,
    payload: VisionBackupPayload,
    replaceJournal = true
  ) =>
    apiRequest<WorkspaceSnapshot>(getToken, '/api/v1/workspace/backup/import', {
      method: 'POST',
      body: JSON.stringify({ payload, replaceJournal }),
    }),

  resetWorkspace: (
    getToken: TokenProvider,
    mode: 'blank' | 'starter',
    clearJournal = false
  ) =>
    apiRequest<WorkspaceSnapshot>(getToken, '/api/v1/workspace/reset', {
      method: 'POST',
      body: JSON.stringify({ mode, clearJournal }),
    }),

  deleteWorkspace: (getToken: TokenProvider) =>
    apiRequest<void>(getToken, '/api/v1/workspace', {
      method: 'DELETE',
    }),
};
