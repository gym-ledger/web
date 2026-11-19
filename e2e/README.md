# e2e specs (Playwright)

Run them against your local stack only (WSL Postgres `gym_ledger_local` + WSL Redis), never QA or prod.

```sh
node e2e/up.mjs                                  # migrate, start API (:4000) + web (:3002) if not up
npx playwright test e2e/change-email.spec.ts     # or just `npx playwright test`
E2E_SHOTS_DIR=/some/dir npx playwright test      # also save the specs' review screenshots there
```

`up.mjs` never stops anything; the servers it starts keep running. Stop them yourself when done.

## What the environment needs

- **The API started by `up.mjs`.** Codes other than login (confirm codes, the new-email code) are read
  from `e2e/.logs/api.log`, where the dev API logs every code it issues. If an API is already running
  on :4000 from a terminal, `up.mjs` reuses it and those specs fail with "no code in api.log": stop it
  and run `up.mjs` again.
- **Master OTP** `MASTER_LOGIN_OTP` in the API's `.env` (default `123456`, override with
  `E2E_MASTER_OTP`). It works for login only.
- **CORS:** the API's `.env` `CORS_ORIGINS` must include `http://localhost:3002`.
- **WSL distro `Ubuntu` with `redis-cli`:** `clearRateLimits()` deletes the API's `rl:*` keys before
  each test, since every spec signs in several times from the same IP.
- Web is `next dev -p 3002` so it doesn't clash with other apps on 3000/3001 (`E2E_WEB_PORT` /
  `E2E_WEB_URL` to change; `E2E_API_URL`, `E2E_API_DIR` for the API).

## Accounts and data

Each test creates fresh accounts `e2e-<tag>-<timestamp>@local.test` by signing in with the master OTP
(`readyUser` also skips onboarding and accepts the privacy policy). Nothing is cleaned up; the
addresses never repeat.

## Helpers (`e2e/helpers.ts`)

`apiCall` (reads the `{ error: { message } }` envelope), `apiLogin`, `readyUser`, `uiLogin` (six
"Digit N" boxes; the last digit submits), `logMark` + `waitForCode(purpose, mark)`, `otherCode`.
