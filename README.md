# Meals Planner

Scaffold development baseline for a mobile-first meals planning web app.

This baseline includes:

- Next.js (TypeScript, App Router)
- Tailwind CSS mobile-first setup
- PWA foundation (manifest + service worker registration)
- Docker runtime for app
- Docker Compose baseline for app + local self-hosted Supabase dependencies
- CI workflow (lint, typecheck, test)

> Scope note: this is platform scaffolding only. Auth and feature implementation are intentionally out of scope for this baseline.

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

## Developer scripts

- `pnpm dev` — start Next.js dev server
- `pnpm build` — production build
- `pnpm start` — run production server
- `pnpm lint` — ESLint checks
- `pnpm typecheck` — TypeScript checks
- `pnpm test` — run Vitest test suite

## First boot + troubleshooting

- **Port conflicts**: if 3000/3001/8000/54322 are in use, change values in `.env`.
- **Container health/startup order**: Supabase services may take a bit to settle on first boot. If API returns errors right after startup, wait 30–60 seconds and retry.
- **Invalid JWT/keys**: placeholder keys in `.env.example` are not secure and may break auth-related services. Replace with real dev values before relying on auth flows.
- **PWA installability**: browser install prompt behavior varies by platform/browser. Manifest and service worker wiring are included as a baseline.

## CI

GitHub Actions workflow: `.github/workflows/ci.yml` runs lint, typecheck, and tests on pushes and pull requests.
