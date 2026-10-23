# Learner Lens AI

A web app that helps middle school teachers see which students need help with which skills, and gives each student the right practice. It ships with a **mock 8th grade class** (10 fictional students; Algebra I, Science, English 8, U.S. History). No real student data is included.

- **Teacher view:** support plans, small groups, progress flags, a "since your last visit" summary, and a parent update for each student.
- **Student view:** today's tasks, practice with instant feedback on every answer, and a study guide for the current math unit.
- **Toolkit:** lesson scripts, auto-graded checks and practice sets for each weak skill, plus full-year plans for Algebra I (Edison MS curriculum), Math 8 (NJDOE Grade 8 units) and Math 6.

## Install it like an app

Learner Lens is an installable web app (PWA). It gets its own icon, opens in its own window, and the toolkit, study guides and practice work offline. Plans and progress need a connection, and come back on their own when you reconnect.

- **Chrome or Edge (computer or Android):** click **Install** in the bar at the bottom of the page, or the install icon in the address bar.
- **iPhone or iPad (Safari):** tap **Share**, then **Add to Home Screen**.

## Project layout

```
index.html        The app (built from src/ — don't edit by hand)
sw.js             Service worker for offline use (built from src/)
manifest.webmanifest, icons/   App name, colors and icons for installing
src/app.html      App source: UI, toolkits, study guides, questions
src/client-db.js  Connects the app to the /api storage
src/pwa.js        Install button and service worker registration
src/make_icons.py Draws the app icons
api/db.js         Read and save records (GET / POST)
api/seed.js       Loads the mock class into an empty database
lib/store.js      Storage: Upstash Redis, or memory for local testing
lib/seed.json     The mock class: 5 student plans and their tasks
build.py          Rebuilds index.html from src/
dev-server.mjs    Local test server
```

## Deploy on Vercel

1. In Vercel, **Add New → Project** and import `RoboAIBuilder/LearnerLensAI`. Keep the default settings and click **Deploy**.
2. In the project, open **Storage → Create Database → Upstash for Redis** (free plan) and connect it to the project. This adds the `KV_REST_API_URL` and `KV_REST_API_TOKEN` environment variables.
3. Optional but recommended: in **Settings → Environment Variables**, add `CLASS_CODE` (any short code). Anyone saving changes is asked for it once.
4. **Redeploy** so the new settings take effect. The first visit loads the mock class automatically.

Without step 2 the app still opens, and the toolkit and study guides work, but it shows "Progress tracking is off" and saves nothing.

## Run locally

```
npm install
npm run dev        # http://localhost:3000, in-memory storage
```

After editing anything in `src/`, run `npm run build:page` to rebuild `index.html` and `sw.js`. Installed apps pick up the new version on their next launch.

## Reset the demo data

```
curl -X POST "https://<your-app>.vercel.app/api/seed?reset=1" -H "x-class-code: <CLASS_CODE>"
```

## Privacy

Use mock data only until the school and district approve a pilot. Real student records are protected by FERPA. If a pilot goes ahead, teachers should upload their own exports, and the school decides where data is stored.
