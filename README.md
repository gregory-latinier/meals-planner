# Meals Planner

Scaffold development baseline for a mobile-first meals planning web app.

This baseline includes:

- Next.js (TypeScript, App Router)
- Tailwind CSS mobile-first setup
- PWA foundation (manifest + service worker registration)
- Docker runtime for app
- Docker Compose baseline for app + local self-hosted Supabase dependencies
- CI workflow (lint, typecheck, test)
- Local auth bootstrap and recovery flows (one-time setup/reset tokens)
- Meal Library MVP with local-file persistence (`.data/meal-library.json`) and async AI extraction jobs

> Scope note: this started as platform scaffolding and now includes a local auth flow plus the Meal Library + AI extraction MVP.

## Requirements

- Node.js 20+
- pnpm 9+
- Docker + Docker Compose plugin

## Quickstart (local Node.js)

1. Copy environment template:

   ```bash
   cp .env.example .env
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Run dev server:

   ```bash
   pnpm dev
   ```

4. Open http://localhost:3000

## Quickstart (NAS-first Docker baseline)

> Development baseline only: the included Supabase + docker-compose setup and `.env.example` values are for local scaffolding convenience. They are **not production-safe defaults** and must be hardened (secrets, networking, auth, TLS, backups, and operational controls) before any production use.

1. Copy environment template and set secrets:

   ```bash
   cp .env.example .env
   ```

2. Update at minimum:
   - `JWT_SECRET`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

3. Start stack:

   ```bash
   docker compose up --build -d
   ```

4. Endpoints:
   - App: http://localhost:3000
   - Supabase API gateway (Kong): http://localhost:8000
   - Supabase Studio: http://localhost:3001

5. Stop stack:

   ```bash
   docker compose down
   ```

## Auth bootstrap and local recovery

This project uses a local one-time token flow for first-run setup and password recovery.

### First run setup

On startup, when uninitialized, the app generates a one-time setup token and logs it:

- setup URL: `/setup`
- one-time token value
- expiry timestamp

Optional persisted token file:

1. Set `AUTH_SETUP_TOKEN_FILE` in `.env` (example: `.data/setup-token.txt`)
2. Restart the app
3. Read token from that file and complete `/setup`

After setup succeeds, `/setup` is disabled and redirects to `/login`.

### Password recovery (local operator flow)

Generate a one-time reset token from the host:

```bash
pnpm auth:reset-token
```

Then open `/reset`, submit token + new password, and sign in at `/login`.

Notes:

- setup/reset tokens are short-lived and single-use
- setup/reset/login lifecycle events are appended to `AUTH_AUDIT_LOG_FILE` (default: `.data/auth-audit.log`)

## Meal Library MVP (`/library`)

This app now ships a practical meal library MVP with local-file persistence in `.data` (same storage pattern as auth, no DB migrations required).

### Data model

Meals include:

- `name`
- `recipe`
- `url` (optional)
- `photo` (stored as `photoUrl`, optional)

The library supports:

- search by meal name and ingredient text
- sort by name (asc/desc), created (newest/oldest), updated (newest/oldest)
- grid/table toggle with preference remembered in `localStorage`
- create and edit meal flows

### Manual AI extraction

Each meal has an **Extract ingredients** action that enqueues an async job and returns immediately.

Persisted status lifecycle:

- `pending`
- `running`
- `success`
- `failed`

Meal save/edit remains independent from extraction success/failure.

### AI Admin (`/admin/ai`)

`/admin/ai` provides shared app-level Gemini configuration:

- API token
- available models
- active model

Current MVP behavior requires a valid local admin session.

If no Gemini token is configured, extraction fails gracefully and the job/meal status is marked `failed` with an actionable message.

### URL-first recipe fetch safety model

When a meal has a recipe URL, extraction first attempts to read recipe text from that URL, then falls back to saved `meal.recipe` text on any fetch/safety failure.

URL fetch protections are enabled by default:

- only `http`/`https` protocols are allowed
- DNS hostnames are supported, but DNS resolution is filtered at connect time to block local/private/link-local/metadata/internal targets
- if DNS resolves only blocked IPs, the request is rejected
- redirects are not followed
- response timeout, content-type guard, and streamed byte cap are enforced

## Developer scripts

- `pnpm dev` — start Next.js dev server
- `pnpm build` — production build
- `pnpm start` — run production server
- `pnpm lint` — ESLint checks
- `pnpm typecheck` — TypeScript checks
- `pnpm test` — run Vitest test suite
- `pnpm auth:reset-token` — generate one-time local password reset token

## First boot + troubleshooting

- **Port conflicts**: if 3000/3001/8000/54322 are in use, change values in `.env`.
- **Container health/startup order**: Supabase services may take a bit to settle on first boot. If API returns errors right after startup, wait 30–60 seconds and retry.
- **Invalid JWT/keys**: placeholder keys in `.env.example` are not secure and may break auth-related services. Replace with real dev values before relying on auth flows.
- **PWA installability**: browser install prompt behavior varies by platform/browser. Manifest and service worker wiring are included as a baseline.

## CI

GitHub Actions workflow: `.github/workflows/ci.yml` runs lint, typecheck, and tests on pushes and pull requests.
