# meals-planner

Mobile-friendly weekly meal planner built with Next.js, PostgreSQL, and Prisma.

Current MVP scope includes:

- Weekly plan pages by week start date (Monday, `YYYY-MM-DD`)
- Meal CRUD for a target week
- Optional day assignment (Monday–Sunday) or unassigned meals
- Calendar-style history view by month/week with day-grouped past meals
- Minimal PWA baseline (web app manifest + icon)

## Stack

- Next.js 14 (TypeScript, App Router)
- PostgreSQL (Docker Compose)
- Prisma ORM
- Vitest for baseline tests

## Prerequisites

- Node.js 20+
- pnpm 10+
- Docker Desktop (or compatible Docker runtime)

## Local setup

1. Install dependencies:

```sh
pnpm install
```

2. Copy environment template:

```sh
cp .env.example .env
```

3. Start PostgreSQL (host port `5434` to avoid conflicts with other local projects):

```sh
docker compose up -d
```

4. Sync Prisma schema:

```sh
npx prisma db push
```

5. Prepare the Prisma test client and test schema:

```sh
pnpm run test:setup
```

6. Start the app:

```sh
pnpm run dev
```

Open `http://localhost:3005`.

- Weekly planner: `http://localhost:3005/weeks/YYYY-MM-DD`
- History view: `http://localhost:3005/history/YYYY-MM`

If you already have a `.env`, make sure `DATABASE_URL` and `TEST_DATABASE_URL` use `localhost:5434`.

## Test and lint

```sh
pnpm run lint
pnpm test
pnpm run test:coverage
pnpm run test:e2e
```

`pnpm test` now runs `pnpm run test:setup` first so first-time setup and CI runs do not depend on checked-in generated Prisma client artifacts.

Coverage policy: overall unit-test coverage must be at least **80%**.

Frontend policy: UI changes must include automated frontend tests (Playwright e2e) and pass `pnpm run test:e2e`.

## PWA baseline

The project includes a minimal installable baseline:

- `app/manifest.ts` web app manifest
- `public/icon.svg` app icon

No offline caching/service worker is implemented yet.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE)
