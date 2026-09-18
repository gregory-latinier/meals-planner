# meals-planner

Mobile-friendly weekly meal planner built with Next.js, PostgreSQL, and Prisma.

Current MVP scope includes:

- Weekly plan pages by week start date (Monday, `YYYY-MM-DD`)
- Meal CRUD for a target week
- Optional day assignment (Monday–Sunday) or unassigned meals
- Minimal PWA baseline (web app manifest + icon)

## Stack

- Next.js 14 (TypeScript, App Router)
- PostgreSQL (Docker Compose)
- Prisma ORM
- Vitest for baseline tests

## Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop (or compatible Docker runtime)

## Local setup

1. Install dependencies:

```sh
npm install
```

2. Copy environment template:

```sh
cp .env.example .env
```

3. Start PostgreSQL:

```sh
docker compose up -d
```

4. Sync Prisma schema:

```sh
npx prisma db push
```

5. Prepare the Prisma test client and test schema:

```sh
npm run test:setup
```

6. Start the app:

```sh
npm run dev
```

Open `http://localhost:3000`.

## Test and lint

```sh
npm run lint
npm test
```

`npm test` now runs `npm run test:setup` first so first-time setup and CI runs do not depend on checked-in generated Prisma client artifacts.

## PWA baseline

The project includes a minimal installable baseline:

- `app/manifest.ts` web app manifest
- `public/icon.svg` app icon

No offline caching/service worker is implemented yet.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE)
