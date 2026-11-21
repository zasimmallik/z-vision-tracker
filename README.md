# Z Vision Tracker

Multi-tenant personal dashboard for tracking long-term vision, mission roadmaps, milestone countdowns, fitness targets, daily journals, and location-aware prayer times.

Built as a client-side React/TypeScript SPA backed by Firebase Authentication and Cloud Firestore with multi-tab offline persistence and an unauthenticated sandbox demo mode.

**Live:** https://z-vision-tracker.netlify.app/

## Overview

- **Isolated Multi-User Workspaces:** Google Sign-In authentication with UID-scoped Firestore storage and guided 3-step onboarding for new accounts.
- **Interactive Demo Mode:** Full dashboard exploration using local in-memory state with zero backend writes or sign-in required.
- **Vision, Countdowns & Fitness:** Editable long-term vision periods, business/mission trackers, real-time countdown timers, and customizable fitness target metrics.
- **Daily Journaling:** Real-time personal journal entries with inline editing and immutable creation timestamps.
- **Global Prayer Times:** Client-side astronomical calculation (`adhan`) supporting worldwide city search, browser geolocation, Hijri dates, Qibla direction, 12 calculation methods, and Hanafi/Shafi madhabs.
- **Workspace Controls:** Configurable widget visibility, dark/light themes, and JSON workspace backup/restore.

## Stack

- **Frontend:** React 19, TypeScript 5.9, Vite 7, Tailwind CSS 4
- **Backend & Persistence:** Firebase Auth (Google), Cloud Firestore (multi-tab IndexedDB cache)
- **Utilities & Hosting:** `adhan`, Netlify

## Data Model & Security

All persisted data is strictly isolated per authenticated user under default-deny Firestore security rules (`firestore.rules`) enforcing `request.auth.uid == userId`, verified email claims, strict field allowlists, and type/size validation:

- `users/{uid}/dashboard/{vision | countdowns | fitness | settings}`
- `users/{uid}/journal/{entryId}`

## Getting Started

**Prerequisites:** Node.js 20+ and a Firebase project with Google Sign-In and Cloud Firestore enabled.

```bash
git clone https://github.com/zasimmallik/z-vision-tracker.git
cd z-vision-tracker
npm install

cp .env.example .env.local
cp .firebaserc.example .firebaserc
```

Populate `.env.local` with your Firebase web config (`VITE_FIREBASE_*`) and `.firebaserc` with your Firebase project ID, then deploy rules and start the dev server:

```bash
npx -y firebase-tools@latest deploy --only firestore
npm run dev
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite development server |
| `npm run build` | Type-check (`tsc -b`) and build production bundle to `dist/` |
| `npm run lint` | Run ESLint across the repository |
| `npm run preview` | Preview the production build locally |

## License

MIT — see [LICENSE](LICENSE).
