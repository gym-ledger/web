# Archived UI

Superseded screens and components, kept for reference. Nothing here is routed or imported by the live app.

- `old-app/` — the previous UI (was served at `/old/*`)
- `old-ui/` — its components
- `signup/` — the old placeholder sign-up form (it never called the API; `/signup` now redirects to `/login`)

To inspect the old UI in development, copy `old-app` back to `src/app/old` and run `npm run dev`. Its imports point at `@/archive/old-ui`, so they work from either location.
