import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
} from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import type { AppEnv } from './config.js';

let cachedApp: App | null = null;

export const initFirebaseAdmin = (env: AppEnv): App => {
  if (cachedApp) return cachedApp;
  const existing = getApps();
  if (existing.length > 0) {
    cachedApp = existing[0];
    return cachedApp;
  }

  if (
    env.FIREBASE_PROJECT_ID &&
    env.FIREBASE_CLIENT_EMAIL &&
    env.FIREBASE_PRIVATE_KEY
  ) {
    cachedApp = initializeApp({
      credential: cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    return cachedApp;
  }

  if (env.FIREBASE_PROJECT_ID) {
    cachedApp = initializeApp({
      credential: applicationDefault(),
      projectId: env.FIREBASE_PROJECT_ID,
    });
    return cachedApp;
  }

  cachedApp = initializeApp();
  return cachedApp;
};

export const getAdminAuth = (env: AppEnv): Auth => {
  return getAuth(initFirebaseAdmin(env));
};

export const getAdminDb = (env: AppEnv): Firestore => {
  return getFirestore(initFirebaseAdmin(env));
};
