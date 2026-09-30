# Meals Planner

Household meal planning and grocery list app — built as a PWA for self-hosting on a NAS (QNAP or similar).

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript + MUI v9 |
| Realtime | Socket.IO (dedicated Express service) |
| Database | PostgreSQL 16 via Prisma ORM |
| Auth | Single shared household password, bcryptjs, server-side session cookie |
| PWA | `manifest.json` + `next-pwa` |
| Package manager | pnpm 10 (workspace) |
| Containers | Docker for dev DB only; full Docker Compose for prod |

## Project Structure

```
meals-planner/
├── web/                    # Next.js app (port 3100)
│   ├── src/
│   │   ├── app/            # App Router pages & API routes
│   │   ├── hooks/          # useRealtime client hook
│   │   ├── lib/            # prisma, session, auth utilities
│   │   ├── theme/          # MUI theme tokens
│   │   └── middleware.ts   # Auth guard
│   └── prisma/             # Schema + seed script
├── realtime/               # Socket.IO service (port 3001)
├── pnpm-workspace.yaml
├── docker-compose.yml      # Dev: PostgreSQL only
├── docker-compose.prod.yml # Prod: full stack
└── .env.example
```

## Quickstart (Development)

### Prerequisites
- Docker (for PostgreSQL)
- Node.js 20+ with pnpm 10 (`npm i -g pnpm@10` or `corepack enable`)

### 1. Configure environment

```bash
cp .env.example .env
# Edit .env — set SESSION_SECRET and HOUSEHOLD_PASSWORD at minimum
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Start PostgreSQL

```bash
pnpm dev:db
# or: docker compose up -d
```

### 4. Run migrations + seed

```bash
pnpm db:migrate        # apply Prisma migrations
pnpm db:seed           # create the household with HOUSEHOLD_PASSWORD
```

### 5. Start the app

```bash
pnpm dev               # starts web (3100) + realtime (3001) in parallel
```

Or individually:

```bash
pnpm dev:web           # Next.js only
pnpm dev:realtime      # Socket.IO only
```

### 6. Open

- Web: http://localhost:3100
- Realtime health: http://localhost:3001/health
- Prisma Studio: `pnpm db:studio`

Log in with the password you set in `HOUSEHOLD_PASSWORD`.

## Workspace Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start web + realtime in parallel |
| `pnpm dev:web` | Start Next.js dev server only |
| `pnpm dev:realtime` | Start Socket.IO dev server only |
| `pnpm dev:db` | Start PostgreSQL container |
| `pnpm dev:db:down` | Stop PostgreSQL container |
| `pnpm dev:db:logs` | Tail PostgreSQL logs |
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:seed` | Seed the household password |
| `pnpm db:studio` | Open Prisma Studio |

## Running Tests

```bash
pnpm test                    # all packages
pnpm --filter web test       # web only
pnpm --filter realtime test  # realtime only
```

## CI — Automated image builds (GHCR)

Every push to `main` (and version tags `v*`) triggers a GitHub Actions workflow that:

1. Builds `web/Dockerfile.prod` → `ghcr.io/gregory-latinier/meals-web`
2. Builds `realtime/Dockerfile.prod` → `ghcr.io/gregory-latinier/meals-realtime`
3. Pushes the following tags:
   - `latest` (on `main` only)
   - `sha-<shortsha>` (every build)
   - `vX.Y.Z` / `vX.Y` (on git tags)

No secrets to configure — the workflow uses the built-in `GITHUB_TOKEN`.

After the first push to `main`, make both packages **public** in GitHub:
- Go to your profile → **Packages** → select the package → **Package settings** → **Change visibility → Public**

---

## Deploy to QNAP (Container Station — UI only)

No SSH or command line needed on the NAS. Everything runs from the Container Station UI.

### Prerequisites

- QNAP NAS with **Container Station** installed
- Both GHCR images are public (see CI section above)
- A domain or local hostname pointing to your NAS IP
- Optional: QNAP built-in reverse proxy + Let's Encrypt

---

### Step 1 — Copy compose + env file to NAS

Copy two files to your NAS (e.g. via SMB share to `/share/Container/meals-planner/`):

- `docker-compose.prod.yml`
- `.env.prod` (created from `.env.example`, filled with your values)

Minimum `.env.prod` content:

```env
POSTGRES_PASSWORD=REPLACE_WITH_STRONG_PASSWORD
DATABASE_URL=postgresql://mpuser:REPLACE_WITH_STRONG_PASSWORD@db:5432/mealsplanner
SESSION_SECRET=REPLACE_WITH_64_CHAR_HEX_SECRET
HOUSEHOLD_PASSWORD=REPLACE_WITH_LOGIN_PASSWORD
NEXT_PUBLIC_APP_URL=https://meals.example.com
NEXT_PUBLIC_REALTIME_URL=https://meals.example.com
CLIENT_URL=https://meals.example.com
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

Generate a session secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### Step 2 — Create application in Container Station

1. Open **Container Station** → **Applications** → **Create**.
2. Set a name (e.g. `meals-planner`).
3. Paste the contents of `docker-compose.prod.yml`.
4. Upload or paste `.env.prod` in the env file field.
5. Click **Create**.

Container Station will:
- Pull `postgres:16-alpine`, `meals-web`, and `meals-realtime` from their registries
- Run the `init` service (migrate DB + seed household password)
- Start `web` on port `8080` and `realtime` on port `3001`

---

### Step 3 — Configure QNAP reverse proxy (recommended)

Open **Control Panel → Application Portal → Reverse Proxy**.

#### Rule 1 — Web app

| Field | Value |
|---|---|
| Protocol | HTTPS |
| Hostname | `meals.example.com` |
| Port | `443` |
| Destination protocol | HTTP |
| Destination host | `localhost` |
| Destination port | `8080` |

#### Rule 2 — Socket.IO (realtime)

| Field | Value |
|---|---|
| Protocol | HTTPS |
| Hostname | `meals.example.com` |
| Port | `443` |
| Path | `/socket.io` |
| Destination protocol | HTTP |
| Destination host | `localhost` |
| Destination port | `3001` |
| Enable WebSocket | **Yes** |

---

### Step 4 — Verify

- Open `https://meals.example.com` → login page
- Log in with `HOUSEHOLD_PASSWORD`
- Check health: `http://<NAS-IP>:8080/api/health` and `http://<NAS-IP>:3001/health`

---

### Updating to a new version

1. Push code changes to `main` on GitHub.
2. Wait for GitHub Actions to build and push new images (~2-3 min).
3. In Container Station → your application → **Recreate** (pulls latest images and restarts).

The `init` service re-runs on each recreate — it skips seed if the household already exists.

---

### Rollback

Pin a previous image tag in `.env.prod`:

```env
WEB_IMAGE=ghcr.io/gregory-latinier/meals-web:sha-abc1234
REALTIME_IMAGE=ghcr.io/gregory-latinier/meals-realtime:sha-abc1234
```

Then recreate the application in Container Station.

---

### Backup and restore

**Backup database** (from Container Station terminal or SSH):

```bash
docker exec meals-planner-db-1 pg_dump -U mpuser mealsplanner > backup_$(date +%F).sql
```

**Restore:**

```bash
cat backup.sql | docker exec -i meals-planner-db-1 psql -U mpuser mealsplanner
```

---

### Troubleshooting

| Symptom | Check |
|---|---|
| App unreachable | Router port forwarding (443 → NAS), DNS A record |
| Realtime disconnects | `/socket.io` reverse proxy rule + WebSocket enabled |
| `init` service fails | Check logs in Container Station — likely missing env var |
| Login fails | `SESSION_SECRET` must be stable across restarts |
| Migration errors | `DATABASE_URL` must use `db` as hostname (not `localhost`) |

## Feature Development Workflow

Feature requests are handled **automatically** — no manual agent handoff needed.

### How a feature request works

When you describe a feature (e.g. "add grocery list", "build a settings page", "implement recipe search"), the default agent `feature` detects the intent and runs this chain **without pausing between phases**:

```
Your prompt
  └─▶ [1] planner          — produces plan, acceptance criteria, tech design
        └─▶ [2] implementer  — writes code, runs migration, writes tests
              └─▶ [3] reviewer — reviews correctness, types, i18n, security, test coverage
                    └─▶ [4] validator — runs lint / tsc / test / build; fixes and retries
                          └─▶ [5] release-gatekeeper — STOPS HERE
                                    presents manual testing checklist
                                    waits for your explicit approval
```

**Nothing is committed or pushed until you reply with an approval command.**

### Approval commands

| Command | Effect |
|---|---|
| `APPROVED:COMMIT` | Runs final gate suite, stages, and commits |
| `APPROVED:PUBLISH` | Runs final gate suite, commits, and pushes to `main` |

### Non-feature requests

Questions, debugging help, explanations, and quick fixes are handled directly by `feature` without starting the chain.

---

### Agent map

| Agent | Mode | Role |
|---|---|---|
| `feature` | **default primary** | Orchestrator — detects feature intent and drives the chain |
| `planner` | chain step 1 | Produces plan + acceptance criteria |
| `implementer` | chain step 2 | Writes all code, migration, tests |
| `reviewer` | chain step 3 | Reviews types, i18n, security, test coverage |
| `validator` | chain step 4 | Runs lint / tsc / test / build |
| `release-gatekeeper` | chain step 5 | Presents manual test report, gates on approval, commits/pushes |
| `architect` | optional specialist | Greenfield project bootstrap — invoke with `/new-project` |
| `tradeoff-critic` | optional specialist | Pressure-tests a plan before coding — invoke with `@tradeoff-critic` |
| `blocker-scout` | optional specialist | Identifies blockers before coding — invoke with `@blocker-scout` |
| `mockup-analyst` | optional specialist | Converts UI mockups into requirements — invoke with `@mockup-analyst` |
| `test-engineer` | optional specialist | Deeper test coverage — invoke with `@test-engineer` |
| ~~`feature-planner`~~ | deprecated | Replaced by `planner` — do not use |

Specialist agents are hidden from the normal agent picker. They can still be invoked explicitly by name when needed.

---

## Auth & Password Reset

No email required — household-only auth. To reset the password:

1. `POST /api/auth/forgot-password` — returns a reset token (in JSON in dev; server logs in prod).
2. `POST /api/auth/reset-password` with `{ token, newPassword }` — updates the password and invalidates all sessions.

## Environment Variables

See `.env.example` for full documentation.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | 64-char hex secret for session signing |
| `HOUSEHOLD_PASSWORD` | Seed only | Initial household password |
| `NEXT_PUBLIC_REALTIME_URL` | Yes | Public URL of the Socket.IO service |
| `CLIENT_URL` | Yes (realtime) | Origin allowed by Socket.IO CORS |
