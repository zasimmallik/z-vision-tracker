# Z Vision Tracker

Multi-tenant personal dashboard for tracking long-term vision, mission roadmaps, milestone countdowns, fitness targets, daily calories, global prayer times, Ramadan schedules, and private journaling.

Built as a separated TypeScript monorepo (`shared/`, `backend/`, `frontend/`) with **Stealth Obsidian** (dark) & **Architectural Stone** (light) frosted-glass themes, customizable drag-and-drop card layout, and an offline **Interactive Demo Mode**.

**Live Frontend:** https://z-vision-tracker.netlify.app/

## Features

- **Priority Dashboard Layout & Drag-and-Drop Customization:** Displays **Clock** + **Prayer Times** side-by-side at the top, followed by **Calendar**, **Missions & Milestones**, **Countdowns**, **Fitness Progress**, and **Journaling**, with **Ramadan Calendar** and **Calorie Tracker** positioned at the bottom. Enter **Edit** mode to drag cards within or across columns (`@dnd-kit`), reorder via keyboard/button controls, or reset to default anytime.
- **Isolated Multi-User Workspaces & Seamless Fallback:** Google Sign-In (`firebase/auth` with popup + redirect fallback) backed by the `backend/` REST API (verifying Firebase ID tokens + verified email claims), with an automatic lazy-loaded direct Cloud Firestore fallback when running statically or without `backend/.env` configured.
- **Interactive Demo Mode:** Explore the full dashboard (including Ramadan & Calorie modules and card drag-and-drop) locally in-memory with zero backend required.
- **Vision, Countdowns & Missions:** Editable long-term horizon, focus pillars, live countdown cards, and multi-phase mission roadmaps with 1-click milestone status cycling.
- **Fitness & Calorie Tracker (Preference Module):** Track body/strength metrics toward a target date, plus daily calorie & macro goals (`kcal`, `P/C/F`), meal-grouped logs (`Breakfast`, `Lunch`, `Dinner`, `Snack`), date navigation, and 1-click quick-add presets.
- **Global Prayer Times & Ramadan Calendar (Preference Module):** Client-side astronomical calculations (`adhan`) with global city search, browser GPS, Hijri dates, Qibla bearing, 12 calculation methods, Hanafi/Shafi madhabs, plus a 30-day Ramadan Sehri/Iftar schedule, moon-sighting offset (`-2..+2` days), and fasting checklist.
- **Daily Journaling & Backups:** Real-time journaling with inline editing and delete confirmation, configurable module toggles, and backward-compatible (`v1`/`v2`) JSON backup export/import.

## Monorepo Structure

```text
z-vision/
├── shared/          # @z-vision/shared — TS types, Zod schemas, defaults, Ramadan & calorie logic
├── backend/         # @z-vision/backend — Express 5 + Firebase Admin REST API & Firestore rules
│   ├── firebase/    # firebase.json, firestore.rules, firestore.indexes.json
│   └── src/         # config, middleware, chunked batching, repository, routes, tests
├── frontend/        # @z-vision/frontend — React 19 + Vite 7 + Tailwind CSS v4 + @dnd-kit
│   └── src/         # app/, shared/, features/, __tests__/
└── .github/workflows/ci.yml
```

## Getting Started

**Prerequisites:** Node.js 20+ (Node 22 recommended) and a Firebase project with Google Sign-In and Cloud Firestore enabled.

```bash
git clone https://github.com/zasimmallik/z-vision-tracker.git
cd z-vision-tracker
npm install

cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
cp backend/firebase/.firebaserc.example backend/firebase/.firebaserc
```

1. Fill in `frontend/.env.local` with your Firebase Web SDK (`VITE_FIREBASE_*`) keys.
2. *(Optional for local API mode)* Fill in `backend/.env` with your Firebase Admin service account credentials (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, or `GOOGLE_APPLICATION_CREDENTIALS`). If `backend/.env` is omitted, the frontend automatically falls back to direct Cloud Firestore persistence.
3. Deploy Firestore security rules & indexes from `backend/firebase/`:
   ```bash
   npx -y firebase-tools@latest deploy --only firestore --project <your-project-id>
   ```
4. Start both backend (`:4000`) and frontend (`:5173`, proxying `/api`) concurrently:
   ```bash
   npm run dev
   ```

## CI & Scripts

GitHub Actions (`.github/workflows/ci.yml`) runs `typecheck`, `lint`, `test`, and `build` on every push and pull request.

| Command | Description |
| --- | --- |
| `npm run dev` | Build `@z-vision/shared` and start backend + frontend dev servers |
| `npm run build` | Build `shared`, `backend`, and `frontend` production bundles |
| `npm run typecheck` | Run TypeScript checks across all three workspaces |
| `npm run lint` | Run ESLint across `backend` and `frontend` |
| `npm run test` | Run Vitest suites across `shared`, `backend`, and `frontend` |

## Deployment

- **Frontend (Netlify):** Uses root `netlify.toml` (`npm run build -w @z-vision/shared && npm run build -w @z-vision/frontend`, publishing `frontend/dist`). Set `VITE_FIREBASE_*` and `VITE_API_BASE_URL` (your deployed backend URL) in Netlify environment variables.
- **Backend (Render / Railway / Fly.io / Cloud Run):** Deploy using `backend/Dockerfile` (`PORT=4000`) with `CORS_ORIGIN` set to your Netlify frontend origin and your Firebase Admin service account env vars.

## License

MIT — see [LICENSE](LICENSE).
