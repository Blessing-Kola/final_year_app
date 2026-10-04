# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
# final_year_app

## Vercel deployment

The Express app is exported from `server.js` for Vercel and still starts locally
with `npm start`. `vercel.json` runs the Vite production build and includes
`dist/` in the Express function, which serves the built SPA and API from the
same deployment.

Before deploying:

1. Run `supabase/schema.sql` in the Supabase SQL Editor. It creates the private
   `project-documents` Storage bucket as well as the application tables.
2. Set these environment variables for the Vercel Production and Preview
   environments:
   - `JWT_SECRET`: a unique, high-entropy secret.
   - `SUPABASE_URL`: the project URL.
   - `SUPABASE_SERVICE_ROLE_KEY`: the server-only service-role key. Never use a
     `VITE_` prefix for this value.
   - `VITE_SUPABASE_URL`: the same project URL; this is public configuration.
   - `VITE_SUPABASE_ANON_KEY`: the publishable/anon key; this is public
     configuration and is used only with short-lived signed upload URLs.
   - `CLIENT_URL`: the deployed site origin.
   - `VITE_API_URL=/api` and `SUPABASE_STORAGE_BUCKET=project-documents`.
3. Import the Git repository into Vercel and deploy from the repository root.
   Vercel uses `vercel.json` and the existing `npm run build` script.
4. Test login, role-protected API routes, page refresh/deep links, document
   uploads, and document downloads in both Preview and Production.

Documents upload directly to the private Supabase bucket using short-lived
signed URLs, so file bytes do not pass through Vercel Functions or temporary
local storage. Downloads are authorized by the Express API before it returns a
short-lived signed URL. Existing documents whose database `path` contains an
old local filesystem path must be migrated into the bucket and their `path`
updated before those files can be accessed from Vercel.
