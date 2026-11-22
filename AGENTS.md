# Z Vision Tracker — Engineering Guide

## Architecture Overview

Monorepo using **npm workspaces**:

- `shared/` (`@z-vision/shared`): Isomorphic TypeScript domain types, Zod validation schemas, workspace templates, layout reconciliation, astronomical Ramadan schedule engine (`adhan`), and calorie summary utilities.
- `backend/` (`@z-vision/backend`): Lean Node.js / Express 5 REST API backed by `firebase-admin` (ID token verification + Cloud Firestore persistence + chunked batching <= 400 ops) and Firebase security rules/config in `backend/firebase/`.
- `frontend/` (`@z-vision/frontend`): Feature-sliced React 19 + TypeScript + Vite 7 + Tailwind CSS v4 SPA. Uses Firebase Auth (`signInWithPopup` with `signInWithRedirect` fallback) and communicates with the backend via `frontend/src/shared/api/visionApi.ts`, while keeping an offline in-memory **Interactive Demo Mode**.

## Design System Invariants

- **Do not alter the existing frosted-glass visual language.**
- Themes live in `frontend/src/index.css`:
  - **Stealth Obsidian** (`html.dark`, default `#050507`)
  - **Architectural Stone** (light `#deddd7`)
- Typography: `IBM Plex Sans` (`--font-sans`) + `IBM Plex Mono` (`--font-mono`, `tabular-nums` for numbers/timers).
- Core surface classes: `.surface-card`, `.surface-raised`, `.horizon-track`, `.horizon-fill`, `.btn-primary`, `.btn-icon`, `.field-input`.

## Feature Preferences & Customizable Layout

- Widget visibility is controlled via `settings.widgets` (`calendar`, `prayerTimes`, `ramadan`, `fitness`, `calories`, `journaling`).
- Card order across the 2 desktop columns (`primary`, `secondary`) and mobile vertical flow is persisted in `settings.layout` and reconciled via `reconcileLayout()` from `@z-vision/shared`.
- Edit mode activates `@dnd-kit` drag-and-drop handles and keyboard/button reordering on every card, plus a one-click **Reset layout** action.

## Common Commands

Run from repository root:

- `npm run dev` — Build `@z-vision/shared` and start backend (`:4000`) + frontend (`:5173`, proxying `/api`) concurrently
- `npm run typecheck` — Type-check `shared`, `backend`, and `frontend`
- `npm run lint` — Run ESLint across `backend` and `frontend`
- `npm run test` — Run Vitest suites across `shared`, `backend`, and `frontend`
- `npm run build` — Build all three workspaces (`dist/` in each)

## Security & Rules

- Never commit `.env`, `.env.local`, `.firebaserc`, or service account keys.
- Any updates to `backend/firebase/firestore.rules` must preserve `isOwner(userId)` (`request.auth.uid == userId` and `email_verified == true`), default-deny matching, and strict schema validation.
