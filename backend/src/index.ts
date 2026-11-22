import { createApp } from './app.js';
import { loadEnv } from './config.js';
import { getAdminAuth, getAdminDb } from './firebase.js';
import { FirestoreWorkspaceRepository } from './repository.js';

const env = loadEnv();
const adminAuth = getAdminAuth(env);
const adminDb = getAdminDb(env);

const repo = new FirestoreWorkspaceRepository(adminDb);

const app = createApp({
  corsOrigin: env.CORS_ORIGIN,
  repo,
  verifyToken: async (idToken) => {
    const decoded = await adminAuth.verifyIdToken(idToken);
    return {
      uid: decoded.uid,
      email: decoded.email,
      email_verified: decoded.email_verified,
    };
  },
});

const server = app.listen(env.PORT, () => {
  console.log(`[z-vision-backend] listening on http://localhost:${env.PORT}`);
});

const shutdown = () => {
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
