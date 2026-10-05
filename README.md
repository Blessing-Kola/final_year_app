# Final Year Project Management System

The repository contains exactly two application directories:

- `frontend/` — React and Vite client.
- `backend/` — Express API and server-only Supabase client.

The frontend and backend are independent npm projects with their own
`package.json`, lockfile, and environment example. Supabase database setup
remains in `supabase/schema.sql`.

## Requirements

- Node.js 22+ and npm.
- A Supabase project.

## Local setup

Install and configure each app separately:

```powershell
Set-Location backend
npm install
Copy-Item .env.example .env
```

Set `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and
`CLIENT_URLS` in `backend/.env`. Use a strong random JWT secret.

In a second terminal:

```powershell
Set-Location frontend
npm install
Copy-Item .env.example .env
npm run dev
```

The frontend runs on `http://localhost:5173`; its example `VITE_API_URL`
connects to the API at `http://localhost:5000/api`. Start the backend in the
first terminal with `npm run dev` (or `npm start`). Set the frontend's
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the same project for direct
signed uploads. The service-role key must only be set in the backend and must
never use a `VITE_` prefix.

Apply `supabase/schema.sql` in the Supabase SQL Editor before using application
workflows that depend on the database or Storage.

## Checks

Run commands from the corresponding app directory:

```sh
# frontend
npm run lint
npm test
npm run build

# backend
npm run check
npm test
```

## Deploy frontend and backend independently on Vercel

Connect the same GitHub repository to two separate Vercel projects. For both,
set the project Root Directory in Vercel settings (do not use the repository
root).

### Frontend Vercel project

- Root Directory: `frontend`
- Framework preset: Vite (auto-detected)
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables:
  - `VITE_API_URL=https://<backend-project>.vercel.app/api`
  - `VITE_SUPABASE_URL=https://<project-ref>.supabase.co`
  - `VITE_SUPABASE_ANON_KEY=<publishable-or-anon-key>`

The Vite configuration fails production builds if `VITE_API_URL` is missing,
uses HTTP, points to localhost, or does not end with `/api`. `frontend/vercel.json`
provides client-side route fallback for React Router.

### Backend Vercel project

- Root Directory: `backend`
- Runtime: Node.js; `backend/vercel.json` builds `server.js` as a Vercel
  function and routes incoming requests to the exported Express application.
- Environment variables:
  - `JWT_SECRET=<unique-high-entropy-secret>`
  - `SUPABASE_URL=https://<project-ref>.supabase.co`
  - `SUPABASE_SERVICE_ROLE_KEY=<server-only-service-role-key>`
  - `SUPABASE_STORAGE_BUCKET=project-documents`
  - `CLIENT_URLS=https://<frontend-project>.vercel.app`

For Preview deployments, add their frontend origins to `CLIENT_URLS` as a
comma-separated list, or configure environment-specific values. The backend
serves API routes only; the frontend is a separate static Vercel project.
Documents use short-lived signed URLs to the private Supabase Storage bucket,
not local Vercel disk.

After both projects deploy, verify login, role authorization, database-backed
dashboards, chapter/proposal workflows, direct uploads and downloads, and
frontend deep links. Existing database document rows containing local
filesystem paths need their files migrated to Supabase Storage before they can
be downloaded from production.
