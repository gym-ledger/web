# Slow-Network / PWA-Installability / Update-Mechanism Audit — gym-app-nextjs

_Generated 2026-08-06. Covers `gym-app-nextjs` (user app), with supporting findings from
`workout-gym-api` and `workout-gym-admin-panel` where relevant (compression/caching headers,
and feasibility of an admin-managed "app version" feature)._

Scope: (1) how well the app tolerates slow/flaky connections, (2) what it'd take to make it
installable on Android/iOS home screens, (3) a way to push and surface app updates — optionally
admin-controlled, (4) general speed/offline-friendliness of everyday operations.

This is an audit only — no code changes were made. Findings are grep/read-verified against the
actual code, cited by file:line.

---

## TL;DR

| # | Area | Current state | Impact | Effort to fix |
|---|---|---|---|---|
| 1 | PWA installability | **None** — no manifest, no icons, no service worker | Can't "Add to Home Screen" as a real app on Android; degraded bookmark-only on iOS | Medium |
| 2 | Update-availability mechanism | **None** — no version endpoint, no admin config infra at all | Users can silently run stale JS after a deploy; no way to force-update on breaking changes | Medium (new table + admin page + client check) |
| 3 | Data-fetch waterfalls | Active-workout screen makes 5 sequential round-trips before rendering | ~1.5–2.5s+ of blank/spinner time on 3G-class latency for the app's core screen | Small (one is a trivial `Promise.all` merge) |
| 4 | React Query | Installed, provisioned, **used nowhere** — everything is raw `useEffect`+`fetch` | Zero caching, zero request dedup, zero retry/backoff anywhere in the app | Medium (incremental, page by page) |
| 5 | Request resilience | No timeout, no retry on network failure, silent `null` on truncated JSON | Requests can hang indefinitely on flaky connections; rare silent data corruption | Small–Medium |
| 6 | Offline mutation coverage | Only "log a workout set" is offline-queued; everything else fails outright offline | Can't even *start* a workout, log weight, or edit a set without connectivity | Medium–Large |
| 7 | HTTP compression (API) | **None** — no `compression` middleware | Every JSON response ships uncompressed | Small — one middleware, one dependency |
| 8 | HTTP caching headers (API) | **None** anywhere | No browser-level caching of any GET response | Small–Medium (needs care re: auth'd data) |
| 9 | Code-splitting | Zero `next/dynamic` usage anywhere | `framer-motion` (27 files) and `body-muscles` load eagerly, not on-demand | Small |
| 10 | Image optimization | Moot today (no images rendered), but no `next/image`/`next.config` setup exists | Will bite the moment exercise images (`image_url`) get wired up | Small (do it *when* images ship) |
| 11 | Accessibility (incidental find) | `viewport.userScalable = false` disables pinch-zoom | Real regression for low-vision users | Trivial — delete one line |

**Fastest wins:** merge the two independent fetches at the top of the active-workout page into one
`Promise.all` (§3); add `compression()` to the API (§7, one line); remove `userScalable: false`
(§11, one line); add a fetch timeout to `api-client.ts` (§5).

**Highest-leverage investment:** actually using React Query (§4) — it's already installed and
provisioned, and unlocks caching/retry/offline-aware refetching for every screen in the app at
once, rather than needing bespoke offline handling per mutation (§6).

---

## 1. PWA installability — nothing exists today

**Confirmed absent** (grepped/globbed, not inferred):
- No `public/manifest.json` — `public/` only contains `file.svg`, `globe.svg`, `next.svg`,
  `vercel.svg`, `window.svg`.
- No `<link rel="manifest">` and no Next.js `metadata.manifest` field in `src/app/layout.tsx`.
- No service worker anywhere — zero matches for `sw.js`, `service-worker`, `serwist`, `next-pwa`,
  `workbox` in `src/` or `package.json`.
- No `apple-touch-icon` / `apple-mobile-web-app-*` meta tags anywhere.

**What this means concretely:**
- **Android Chrome**: without a manifest (icons, `name`, `start_url`, `display: standalone`) and
  a service worker with a fetch handler, Chrome never offers the "Install app" prompt — users get
  a plain bookmark shortcut at best, no app icon in the app drawer, no standalone window (browser
  chrome/URL bar stays visible).
- **iOS Safari**: "Add to Home Screen" works without a service worker, but without
  `apple-touch-icon` and `apple-mobile-web-app-capable`/`apple-mobile-web-app-status-bar-style`
  meta tags, the home-screen icon falls back to a screenshot thumbnail and the app opens inside
  Safari chrome instead of full-screen standalone mode.

**To make this installable** (design direction, not implemented here):
1. `public/manifest.json` — `name`, `short_name`, icons (192×192, 512×512, plus a maskable
   variant for Android's adaptive icon shapes), `start_url: "/"`, `display: "standalone"`,
   `theme_color`/`background_color` matching the app's dark theme.
2. Icon set generated once from the app's existing brand mark (the "A" logomark used on
   login/splash), at the required sizes + `apple-touch-icon.png` (180×180).
3. Wire the manifest via Next's `metadata.manifest` in `layout.tsx`, plus the `apple-mobile-web-app-*`
   meta tags (Next's App Router `metadata`/`viewport` export supports these directly — no manual
   `<head>` needed).
4. A minimal service worker (app-shell caching at least) — needed for Android's install
   criteria and is also the mechanism that makes offline navigation possible at all (§6/§10 in
   the earlier session's audit note the app has no offline page-shell today; a hard refresh with
   no connectivity currently just fails). Given this project's `AGENTS.md` warns Next's APIs may
   differ from training data, whichever SW tooling gets picked (hand-rolled vs. a
   `next-pwa`/`serwist`-style package) should be verified against the installed Next 16 version's
   actual docs before adoption — not assumed compatible.

---

## 2. Update-availability mechanism (optionally admin-managed) — nothing exists today

**Confirmed absent:**
- No `/version`, `/health`-with-version, or any endpoint exposing "what build is running" in any
  of the three repos. The API's only liveness endpoint is `GET /health` → `{ ok: true }`
  (`workout-gym-api/src/app.ts:20-22`) — no version field.
- No `APP_VERSION`/`NEXT_PUBLIC_APP_VERSION` env var or runtime `package.json`-version read
  anywhere. The three `package.json` versions (`1.0.0`, `1.0.0`, `0.1.0`) are untouched defaults,
  never referenced at runtime.
- No generic admin-configurable settings/feature-flag infrastructure exists in the backend at
  all. Scanned all 22 tables across `workout-gym-api/src/db/migrations/*.sql` — nothing
  resembling a key-value app-config table. The only "config" column in the whole schema is
  `progression_rules.config JSONB`, which is scoped to a single progression-rule row, not a
  general settings store.
- `workout-gym-admin-panel`'s sidebar (`src/components/shared/sidebar.tsx:24-32`) already lists
  **`Users`, `Analytics`, and `Settings` as nav items — none of the three have a page.tsx behind
  them.** `/settings` in particular is already-navigable-to and unimplemented — a natural home for
  a "Release / App Version" admin section without inventing new nav.

**Why a version check is worth building independent of the PWA/service-worker work (§1):** a
service worker's own update lifecycle (new SW parked in "waiting" state) only helps once the app
is actually installed as a PWA, and its update-check timing is opportunistic (tied to navigation).
An explicit version endpoint works for every user immediately — installed or not — and gives
precise control (e.g. force-updating past a breaking API change), which the admin explicitly
asked for.

**Design direction:**
1. **Backend**: a small new table, e.g. `app_releases` (or a generic `app_config` key-value table
   if other global settings are anticipated beyond just versioning) with fields like
   `platform` (web/ios/android — this app is web-only today, but the schema should leave room),
   `latest_version`, `minimum_supported_version`, `release_notes`, `force_update: boolean`. New
   admin CRUD module following the exact existing pattern (`workout-gym-admin-panel`'s
   `features/muscles/` is the smallest reference: `components/`, `hooks/use-muscles.ts`,
   `schemas/muscle.schema.ts`, `services/muscles.service.ts`, `types/index.ts` — a new
   `features/app-version/` would mirror this 1:1). One new **public**, unauthenticated read
   endpoint, e.g. `GET /meta/version`.
2. **Frontend**: bake the running build's version into the client at build time
   (`NEXT_PUBLIC_APP_VERSION`, sourced from `package.json` or CI, e.g. via a git SHA or semver
   bump on release). On app foreground / `visibilitychange` / a coarse interval poll, compare the
   running version against `GET /meta/version`'s `latest_version`. If different: a dismissible
   "Update available — Refresh" toast/banner. If the running version is below
   `minimum_supported_version` (or `force_update` is set): a blocking modal that requires a
   refresh before continuing — the actual mechanism to "invalidate" old clients after a breaking
   change, which a soft toast alone can't guarantee.
3. Refresh action itself is just `window.location.reload()` (or, once a service worker exists,
   telling it to `skipWaiting()` + reload) — Next.js already content-hashes JS chunks, so a normal
   reload fetches the new build cleanly; no custom cache-busting needed beyond the reload itself.

---

## 3. Data-fetching waterfalls

**Worst offender — resuming an active workout**
(`src/app/(main)/workout/active/page.tsx`, `init()`, lines 189–226) does **5 sequential
round-trips** before the screen renders:
1. `await fetchOngoingWorkoutSession()` (line 191)
2. `await Promise.all([fetchActiveWorkoutPlans(), fetchProgramDays(...)])` (lines 195–198)
3. `await fetchProgramDaySessions(...)` (line 203)
4. `await startSession(...)` → internally `await Promise.all([startWorkoutSession(...), fetchSessionExercises(...)])` (lines 158–165)
5. `await fetchSessionSets(ws.id)` (line 169)

Steps 1 and 2 have no actual data dependency on each other (both are needed regardless of which
branch the flow takes) and can be merged into a single `Promise.all`, cutting one round-trip for
free. On 3G-class latency (~300–500ms RTT) this chain is 1.5–2.5s+ of blank/spinner time on the
single most core screen in the app (this is the screen a user opens *every single workout*).

**Everywhere else checked is fine:**
- **Home page** — `OngoingWorkoutBanner`, `HomeworkWidget`, `WeightHomeWidget` are sibling
  components, each independently fetching in its own mount effect — these run in parallel
  naturally (no parent gating a child's fetch on its own data).
- **Exercises list/detail** — muscles fetch and exercises-list fetch are two independent effects,
  both fire on mount in parallel; the detail page explicitly uses
  `Promise.all([fetchExerciseById(id), fetchExerciseHistory(id, HISTORY_LIMIT)])`.
- **`ExerciseLogCard`/`ExerciseHistoryPanel`** — history/prefill data only fetches on user-initiated
  expand, not part of any initial-load chain. Good lazy pattern already in place.
- **Progress page** — no fetching in the page shell itself; `BodyTab` and `MuscleBodyMap` each do
  one independent fetch.

---

## 4. React Query — installed, wired, used nowhere

`QueryClientProvider` is set up in `src/components/shared/providers.tsx` with a
`staleTime: 60_000` default — but `useQuery`/`useMutation`/`useQueryClient` from
`@tanstack/react-query` appear **in exactly that one file** and nowhere else. Every one of the
15+ data-fetching components in the app uses raw `useEffect` + `apiClient` instead.

Concretely, this means today:
- Navigating away from and back to a page always refetches from zero — no cache.
- No request deduplication (two components independently wanting the same data both fire it).
- No automatic retry/backoff on failure.
- No stale-while-revalidate — every screen shows a loading spinner on every visit, even for data
  that hasn't changed.

This is the single highest-leverage fix on this list: the dependency is already installed and
provisioned, so adopting it is a matter of migrating fetch call sites (incrementally, page by
page) rather than introducing new architecture.

---

## 5. `api-client.ts` request resilience

Full file: `src/lib/api-client.ts`.
- The `fetch()` call (line 38) has **no timeout** — no `AbortSignal`/`AbortSignal.timeout()`. On a
  stalled or flaky connection, a request can hang far longer than a user will wait, with no
  timeout-driven error state or retry affordance — just an indefinitely-spinning loading state.
- **No retry on plain network failure** (`fetch` throwing because there's no connectivity at all)
  anywhere in `request()` — it just rejects, and each call site's ad-hoc `.catch()` typically shows
  a generic error with no backoff/retry built in.
- The only existing "retry" is auth-specific: 401 → refresh the access token → retry once. Useful,
  but not a general resilience mechanism for flaky connections.
- Line 67: `res.json().catch(() => null)` — if the response body is truncated mid-transfer (a
  realistic flaky-connection failure mode), this silently becomes `null` instead of throwing. The
  error check on line 69 (`!res.ok || body?.success === false`) doesn't catch this case when the
  HTTP status itself was `200 OK` but the body never fully arrived — the function returns
  `undefined` typed as `T`. This is a rare but real silent-corruption risk that's specifically a
  slow/flaky-connection problem, not a general bug.

---

## 6. Offline mutation coverage

Only **one** mutation path in the entire app is offline-resilient: logging a workout set, via
`src/lib/offline/workoutSetQueue.ts` + `flushWorkoutSetQueue.ts` (a persisted Zustand queue that
retries when connectivity returns). Every other mutation fails outright with no connection:

| Action | Function | Offline-safe? |
|---|---|---|
| Log a weight entry | `createWeightEntry` (`lib/api/weight.ts`) | No |
| Edit a weight entry | `updateWeightEntry` | No |
| Select a workout plan | `selectWorkoutPlan` (`lib/api/workout.ts`) | No |
| Deselect a workout plan | `deselectWorkoutPlan` | No |
| **Start a workout session** | `startWorkoutSession` | **No** — a user can't even begin logging a workout without connectivity |
| Finish a workout session | `finishWorkoutSession` | No |
| Edit an already-logged set | `updateWorkoutSet` | No — shows an error toast offline |
| Discard a dashboard alarm | `discardAlarm` | No |

(`logWorkoutSet`, the single-set POST helper, also has no offline path and appears to be dead code
today — the actual set-logging UI enqueues directly into the offline queue and calls
`logWorkoutSetsBatch` instead, which *is* the endpoint the queue flushes through.)

Given how much of this app's real-world use case is "at the gym, on spotty wifi/cell signal,"
`startWorkoutSession` being un-queueable is the most user-visible gap — someone with no signal at
the start of a session literally cannot begin. Bringing every mutation onto the same
queue-and-flush pattern already proven for set-logging (or migrating to React Query's mutation
+ offline-aware retry primitives per §4) is the fix; there's no need to invent a new mechanism,
just extend the one that already works.

---

## 7. HTTP compression (backend) — absent

`workout-gym-api/src/app.ts` (full file, 30 lines) has no `compression` middleware, and
`package.json` has no `compression` dependency at all. Every JSON response — including the
exercise catalog with embedded muscle arrays (§9) — ships uncompressed today. This is close to a
free win: add the `compression` package and one `app.use(compression())` call.

## 8. HTTP caching headers (backend) — absent

No `Cache-Control`/`ETag`/`Last-Modified` is set anywhere in the API (grepped all of `src/`).
`helmet()` is called with default config — helmet's scope is security headers, not caching, so
this isn't something helmet would provide anyway. Most of this API's data is per-user and
legitimately shouldn't be cached at a shared/CDN layer, but a few genuinely-static/rarely-changing
reads are good candidates for at least short client-side caching (muscle list, exercise catalog
reads) — worth scoping deliberately rather than blanket-adding headers, since getting this wrong
on authenticated/personal data is worse than not caching at all.

## 9. Response payload shape

`GET /user/exercises` (the paginated list endpoint,
`users.exercises.repository.ts:108-121`/`48-67`) embeds the **full** per-muscle contribution array
on every row — the same subquery used for the single-exercise detail view. A list screen only
needs a lightweight "top muscle" label per card (which is in fact all the current UI renders per
row); shipping the complete breakdown for every row in a paginated list is unnecessary payload,
compounded by the lack of compression (§7). `fetchExerciseHistoryRepository`, by contrast, does
*not* over-fetch — session metadata that looks repeated per-row at the SQL level is already
de-duplicated into nested session objects before the JSON response is built.

## 10. Code-splitting — no `next/dynamic` usage anywhere

Zero usages of `next/dynamic` in the codebase. Two concrete consequences:
- `framer-motion` is statically imported in **27 files** — effectively every page/component in
  the app — so Next's bundler will most likely hoist it into a shared chunk loaded on first visit
  regardless of route, rather than it being route-specific weight.
- `body-muscles` (this session's addition, used only on the Progress page's Volume tab) gets
  normal per-route code-splitting from Next's App Router, but *within* that page it's imported
  eagerly at module scope rather than lazy-loaded only when the muscle-map section is actually
  reached — a `next/dynamic(() => import(...), { ssr: false })` wrapper around `MuscleBodyMap`
  would defer that cost until it's needed.

## 11. Images — no optimization pipeline set up

`next/image` and raw `<img>` are both used **zero times** in the app. `image_url` exists as a
typed field on exercises (`PlanExercise`, `ExerciseListItem`) but is never rendered — the
exercises list/detail UI shows a static icon regardless. `next.config.ts` (9 lines) has no
`images` block — no `remotePatterns` configured, so even adopting `next/image` today with a
remote-hosted `image_url` would fail without that config first. Net effect right now: zero cost,
since nothing renders images — but flagging this so it's addressed *when* exercise images get
wired up rather than discovered as a bug afterward.

## 12. Accessibility — incidental finding

`src/app/layout.tsx:25` sets `userScalable: false` in the `viewport` export, which disables
pinch-to-zoom across the entire app. This is a genuine accessibility regression for low-vision
users and has no real upside for a fitness-tracking app (unlike, say, a canvas/game UI where
accidental zoom is disruptive) — worth removing regardless of the rest of this audit.

---

## 13. What's already done right

Worth naming so it doesn't get "fixed" by accident:
- **Fonts**: `Geist`/`Geist_Mono` load via `next/font/google` (`layout.tsx:2,6-9`), which
  self-hosts and inlines them at build time — no runtime request to Google's font CDN, no
  render-blocking external font fetch.
- **Lazy history/prefill data**: `ExerciseLogCard`/`ExerciseHistoryPanel` only fetch on
  user-initiated expand, not as part of any page's initial load.
- **The offline set-logging queue itself** (`workoutSetQueue.ts`/`flushWorkoutSetQueue.ts`) is a
  solid, proven pattern — the fix isn't to redesign it, it's to extend the same pattern to the
  other mutations listed in §6.
