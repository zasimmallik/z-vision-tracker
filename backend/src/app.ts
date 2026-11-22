import cors from 'cors';
import express, { type Express } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import {
  createRequireAuth,
  errorHandler,
  type VerifyTokenFn,
} from './middleware.js';
import type { WorkspaceRepository } from './repository.js';
import { createWorkspaceRouter } from './routes.js';

export interface CreateAppOptions {
  verifyToken: VerifyTokenFn;
  repo: WorkspaceRepository;
  corsOrigin?: string;
}

export const createApp = ({
  verifyToken,
  repo,
  corsOrigin = 'http://localhost:5173',
}: CreateAppOptions): Express => {
  const app = express();

  const allowedOrigins = corsOrigin
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
          cb(null, true);
        } else {
          cb(new Error('Origin not allowed by CORS'));
        }
      },
      credentials: false,
    })
  );
  app.use(express.json({ limit: '2mb' }));

  app.use(
    '/api',
    rateLimit({
      windowMs: 60 * 1000,
      max: 240,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'z-vision-backend',
      timestamp: new Date().toISOString(),
    });
  });

  app.use(
    '/api/v1/workspace',
    createRequireAuth(verifyToken),
    createWorkspaceRouter(repo)
  );

  app.use(errorHandler);

  return app;
};
