import { Router, type Response, type NextFunction } from 'express';
import {
  appSettingsSchema,
  calorieConfigSchema,
  countdownsUpdateSchema,
  dailyCalorieLogSchema,
  dateKeySchema,
  fitnessDataSchema,
  importBackupRequestSchema,
  journalCreateSchema,
  onboardingChoicesSchema,
  ramadanDataSchema,
  resetWorkspaceSchema,
  validateBackupPayload,
  visionDataSchema,
} from '@z-vision/shared';
import {
  AppError,
  validateBody,
  type AuthenticatedRequest,
} from './middleware.js';
import type { WorkspaceRepository } from './repository.js';

export const createWorkspaceRouter = (repo: WorkspaceRepository): Router => {
  const router = Router();

  const asyncRoute =
    (
      handler: (
        req: AuthenticatedRequest,
        res: Response
      ) => Promise<void>
    ) =>
    (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      void handler(req, res).catch(next);
    };

  const getUid = (req: AuthenticatedRequest): string => {
    if (!req.uid) throw new AppError(401, 'Unauthorized');
    return req.uid;
  };

  router.get(
    '/',
    asyncRoute(async (req, res) => {
      const snapshot = await repo.getWorkspace(getUid(req));
      res.json(snapshot);
    })
  );

  router.delete(
    '/',
    asyncRoute(async (req, res) => {
      await repo.deleteWorkspace(getUid(req));
      res.status(204).end();
    })
  );

  router.post(
    '/onboarding',
    validateBody(onboardingChoicesSchema),
    asyncRoute(async (req, res) => {
      const snapshot = await repo.initializeWorkspace(getUid(req), req.body);
      res.status(201).json(snapshot);
    })
  );

  router.put(
    '/vision',
    validateBody(visionDataSchema),
    asyncRoute(async (req, res) => {
      await repo.saveVision(getUid(req), req.body);
      res.json({ ok: true });
    })
  );

  router.put(
    '/countdowns',
    validateBody(countdownsUpdateSchema),
    asyncRoute(async (req, res) => {
      await repo.saveCountdowns(getUid(req), req.body.items);
      res.json({ ok: true });
    })
  );

  router.put(
    '/fitness',
    validateBody(fitnessDataSchema),
    asyncRoute(async (req, res) => {
      await repo.saveFitness(getUid(req), req.body);
      res.json({ ok: true });
    })
  );

  router.put(
    '/settings',
    validateBody(appSettingsSchema),
    asyncRoute(async (req, res) => {
      const saved = await repo.saveSettings(getUid(req), req.body);
      res.json({ ok: true, settings: saved });
    })
  );

  router.put(
    '/ramadan',
    validateBody(ramadanDataSchema),
    asyncRoute(async (req, res) => {
      await repo.saveRamadan(getUid(req), req.body);
      res.json({ ok: true });
    })
  );

  router.put(
    '/calories/config',
    validateBody(calorieConfigSchema),
    asyncRoute(async (req, res) => {
      await repo.saveCaloriesConfig(getUid(req), req.body);
      res.json({ ok: true });
    })
  );

  router.get(
    '/calories/logs/:date',
    asyncRoute(async (req, res) => {
      const parsedDate = dateKeySchema.safeParse(req.params.date);
      if (!parsedDate.success) {
        throw new AppError(400, 'Date parameter must use YYYY-MM-DD format.');
      }
      const log = await repo.getCalorieLog(getUid(req), parsedDate.data);
      res.json(log);
    })
  );

  router.put(
    '/calories/logs/:date',
    validateBody(dailyCalorieLogSchema),
    asyncRoute(async (req, res) => {
      const parsedDate = dateKeySchema.safeParse(req.params.date);
      if (!parsedDate.success) {
        throw new AppError(400, 'Date parameter must use YYYY-MM-DD format.');
      }
      if (req.body.date !== parsedDate.data) {
        throw new AppError(400, 'Log body date must match URL date parameter.');
      }
      await repo.saveCalorieLog(getUid(req), req.body);
      res.json({ ok: true });
    })
  );

  router.post(
    '/journal',
    validateBody(journalCreateSchema),
    asyncRoute(async (req, res) => {
      const entry = await repo.createJournalEntry(getUid(req), req.body.content);
      res.status(201).json(entry);
    })
  );

  router.patch(
    '/journal/:id',
    validateBody(journalCreateSchema),
    asyncRoute(async (req, res) => {
      const id = String(req.params.id ?? '');
      if (!id) throw new AppError(400, 'Missing journal entry ID.');
      const entry = await repo.updateJournalEntry(getUid(req), id, req.body.content);
      res.json(entry);
    })
  );

  router.delete(
    '/journal/:id',
    asyncRoute(async (req, res) => {
      const id = String(req.params.id ?? '');
      if (!id) throw new AppError(400, 'Missing journal entry ID.');
      await repo.deleteJournalEntry(getUid(req), id);
      res.status(204).end();
    })
  );

  router.get(
    '/backup/export',
    asyncRoute(async (req, res) => {
      const backup = await repo.exportBackup(getUid(req));
      res.json(backup);
    })
  );

  router.post(
    '/backup/import',
    validateBody(importBackupRequestSchema),
    asyncRoute(async (req, res) => {
      let validated;
      try {
        validated = validateBackupPayload(req.body.payload);
      } catch (err) {
        throw new AppError(
          400,
          err instanceof Error ? err.message : 'Invalid backup payload.'
        );
      }
      const snapshot = await repo.importBackup(
        getUid(req),
        validated,
        req.body.replaceJournal
      );
      res.json(snapshot);
    })
  );

  router.post(
    '/reset',
    validateBody(resetWorkspaceSchema),
    asyncRoute(async (req, res) => {
      const snapshot = await repo.resetWorkspace(
        getUid(req),
        req.body.mode,
        req.body.clearJournal
      );
      res.json(snapshot);
    })
  );

  return router;
};
