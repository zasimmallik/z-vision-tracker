import request from 'supertest';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CALORIE_CONFIG,
  DEFAULT_RAMADAN_DATA,
  DEFAULT_SETTINGS,
  EMPTY_FITNESS,
  EMPTY_VISION,
  type AppSettings,
  type CalorieConfig,
  type CountdownMilestone,
  type DailyCalorieLog,
  type FitnessData,
  type JournalEntry,
  type OnboardingChoices,
  type RamadanData,
  type VisionBackupPayload,
  type VisionData,
  type WorkspaceSnapshot,
} from '@z-vision/shared';
import { createApp } from '../app.js';
import type { WorkspaceRepository } from '../repository.js';

function createMemoryRepo(): WorkspaceRepository {
  const store = new Map<string, WorkspaceSnapshot>();

  const ensure = (uid: string): WorkspaceSnapshot => {
    let ws = store.get(uid);
    if (!ws) {
      ws = {
        exists: true,
        vision: { ...EMPTY_VISION },
        countdowns: [],
        fitness: { ...EMPTY_FITNESS },
        settings: { ...DEFAULT_SETTINGS },
        ramadan: { ...DEFAULT_RAMADAN_DATA },
        caloriesConfig: { ...DEFAULT_CALORIE_CONFIG },
        journal: [],
        calorieLogs: {},
      };
      store.set(uid, ws);
    }
    return ws;
  };

  return {
    async getWorkspace(uid: string) {
      return store.get(uid) ?? {
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
    },
    async initializeWorkspace(uid: string, choices: OnboardingChoices) {
      const ws = ensure(uid);
      ws.settings = {
        ...ws.settings,
        appTitle: choices.appTitle,
        appLogoText: choices.appLogoText,
        widgets: choices.widgets,
      };
      return ws;
    },
    async saveVision(uid: string, vision: VisionData) {
      ensure(uid).vision = vision;
    },
    async saveCountdowns(uid: string, items: CountdownMilestone[]) {
      ensure(uid).countdowns = items;
    },
    async saveFitness(uid: string, fitness: FitnessData) {
      ensure(uid).fitness = fitness;
    },
    async saveSettings(uid: string, settings: AppSettings) {
      ensure(uid).settings = settings;
      return settings;
    },
    async saveRamadan(uid: string, ramadan: RamadanData) {
      ensure(uid).ramadan = ramadan;
    },
    async saveCaloriesConfig(uid: string, config: CalorieConfig) {
      ensure(uid).caloriesConfig = config;
    },
    async getCalorieLog(uid: string, date: string) {
      return ensure(uid).calorieLogs[date] ?? { date, entries: [] };
    },
    async saveCalorieLog(uid: string, log: DailyCalorieLog) {
      ensure(uid).calorieLogs[log.date] = log;
    },
    async createJournalEntry(uid: string, content: string): Promise<JournalEntry> {
      const entry: JournalEntry = {
        id: `j-${Date.now()}`,
        content,
        createdAt: Date.now(),
      };
      ensure(uid).journal.unshift(entry);
      return entry;
    },
    async updateJournalEntry(uid: string, entryId: string, content: string) {
      const ws = ensure(uid);
      const found = ws.journal.find((e) => e.id === entryId);
      if (!found) throw new Error('Not found');
      found.content = content;
      found.updatedAt = Date.now();
      return found;
    },
    async deleteJournalEntry(uid: string, entryId: string) {
      const ws = ensure(uid);
      ws.journal = ws.journal.filter((e) => e.id !== entryId);
    },
    async exportBackup(uid: string): Promise<VisionBackupPayload> {
      const ws = ensure(uid);
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
    async importBackup(uid: string, payload: VisionBackupPayload) {
      const ws = ensure(uid);
      ws.vision = payload.vision;
      ws.countdowns = payload.countdowns;
      ws.fitness = payload.fitness;
      ws.settings = payload.settings;
      ws.journal = payload.journal;
      return ws;
    },
    async resetWorkspace(uid: string) {
      return ensure(uid);
    },
    async deleteWorkspace(uid: string) {
      store.delete(uid);
    },
  };
}

const buildTestApp = () => {
  const repo = createMemoryRepo();
  return createApp({
    repo,
    verifyToken: async (token) => {
      if (token === 'valid-token') {
        return { uid: 'user-1', email: 'test@example.com', email_verified: true };
      }
      if (token === 'unverified-token') {
        return { uid: 'user-2', email: 'unverified@example.com', email_verified: false };
      }
      throw new Error('Bad token');
    },
  });
};

describe('Backend REST API', () => {
  it('returns health check without auth', async () => {
    const app = buildTestApp();
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('rejects missing or unverified tokens', async () => {
    const app = buildTestApp();
    const noAuth = await request(app).get('/api/v1/workspace');
    expect(noAuth.status).toBe(401);

    const unverified = await request(app)
      .get('/api/v1/workspace')
      .set('Authorization', 'Bearer unverified-token');
    expect(unverified.status).toBe(403);
  });

  it('supports Ramadan, Calorie logs, and Journal endpoints with validation', async () => {
    const app = buildTestApp();
    const auth = { Authorization: 'Bearer valid-token' };

    const ramadanRes = await request(app)
      .put('/api/v1/workspace/ramadan')
      .set(auth)
      .send({
        hijriYear: 1447,
        hijriOffset: 1,
        fastedDays: { '1447-1': true },
      });
    expect(ramadanRes.status).toBe(200);

    const badOffset = await request(app)
      .put('/api/v1/workspace/ramadan')
      .set(auth)
      .send({
        hijriYear: 1447,
        hijriOffset: 5,
        fastedDays: {},
      });
    expect(badOffset.status).toBe(400);

    const logRes = await request(app)
      .put('/api/v1/workspace/calories/logs/2026-11-22')
      .set(auth)
      .send({
        date: '2026-11-22',
        entries: [
          {
            id: 'e1',
            name: 'Oatmeal',
            meal: 'breakfast',
            calories: 320,
            protein: 10,
            carbs: 58,
            fat: 6,
            createdAt: 1700000000000,
          },
        ],
      });
    expect(logRes.status).toBe(200);

    const fetchLog = await request(app)
      .get('/api/v1/workspace/calories/logs/2026-11-22')
      .set(auth);
    expect(fetchLog.status).toBe(200);
    expect(fetchLog.body.entries).toHaveLength(1);

    const createdJournal = await request(app)
      .post('/api/v1/workspace/journal')
      .set(auth)
      .send({ content: 'Started monorepo upgrade' });
    expect(createdJournal.status).toBe(201);
    expect(createdJournal.body.content).toBe('Started monorepo upgrade');
  });
});
