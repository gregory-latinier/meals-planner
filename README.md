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

## Deploy to QNAP (Container Station)

### Prerequisites

- QNAP NAS with **Container Station** installed (QTS 5.x recommended)
- SSH access to the NAS (`Control Panel → Terminal & SNMP → Enable SSH`)
- A domain or local hostname pointing to your NAS IP
- Optional but recommended: QNAP built-in reverse proxy + Let's Encrypt certificate

---

### Step 1 — Copy the project to the NAS

SSH into your NAS and clone (or copy) the project to a persistent share:

```bash
ssh admin@<NAS-IP>
mkdir -p /share/Container/meals-planner
cd /share/Container/meals-planner
# Option A — git
git clone <your-repo-url> .
# Option B — copy from dev machine (run on dev machine)
# scp -r . admin@<NAS-IP>:/share/Container/meals-planner
```

---

### Step 2 — Create the production environment file

```bash
cp .env.example .env.prod
vi .env.prod   # or nano
```

Fill in every value:

```env
# --- Postgres ---
POSTGRES_USER=mpuser
POSTGRES_PASSWORD=REPLACE_WITH_STRONG_PASSWORD
POSTGRES_DB=mealsplanner

# --- App DB connection (container-to-container, host = "db") ---
DATABASE_URL=postgresql://mpuser:REPLACE_WITH_STRONG_PASSWORD@db:5432/mealsplanner

# --- Auth ---
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=REPLACE_WITH_64_CHAR_HEX_SECRET

# --- Household setup ---
HOUSEHOLD_PASSWORD=REPLACE_WITH_INITIAL_LOGIN_PASSWORD

# --- Public URLs ---
NEXT_PUBLIC_APP_URL=https://meals.example.com
NEXT_PUBLIC_REALTIME_URL=https://meals.example.com
CLIENT_URL=https://meals.example.com

# --- Misc ---
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

> `DATABASE_URL` must use `db` as hostname — that is the Docker Compose service name.

---

### Step 3 — Build and start the stack

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Check that all three containers are healthy:

```bash
docker compose -f docker-compose.prod.yml ps
```

Expected output:

```
NAME                    STATUS
meals-planner-db-1      healthy
meals-planner-web-1     healthy
meals-planner-realtime-1  healthy
```

Tail logs if something is wrong:

```bash
docker compose -f docker-compose.prod.yml logs -f web
docker compose -f docker-compose.prod.yml logs -f realtime
docker compose -f docker-compose.prod.yml logs -f db
```

---

### Step 4 — Run DB migration and seed (first deploy only)

```bash
docker compose -f docker-compose.prod.yml exec web pnpm dlx prisma migrate deploy
docker compose -f docker-compose.prod.yml exec web pnpm db:seed
```

`db:seed` creates the household login using `HOUSEHOLD_PASSWORD` from `.env.prod`.

---

### Step 5 — Configure QNAP reverse proxy

Open QNAP web UI → **Control Panel → Application Portal → Reverse Proxy**.

Create two rules:

#### Rule 1 — Web app

| Field | Value |
|---|---|
| Name | `meals-web` |
| Protocol | HTTPS |
| Hostname | `meals.example.com` |
| Port | `443` |
| Destination protocol | HTTP |
| Destination host | `localhost` |
| Destination port | `8080` |
| Enable HSTS | recommended |

#### Rule 2 — Socket.IO (realtime)

| Field | Value |
|---|---|
| Name | `meals-realtime` |
| Protocol | HTTPS |
| Hostname | `meals.example.com` |
| Port | `443` |
| Path | `/socket.io` |
| Destination protocol | HTTP |
| Destination host | `localhost` |
| Destination port | `3001` |
| Enable WebSocket | **Yes** |

> The WebSocket toggle ensures QNAP forwards `Upgrade: websocket` headers required by Socket.IO.

---

### Step 6 — Enable HTTPS with Let's Encrypt (optional but recommended)

In QNAP web UI → **Control Panel → Security → Certificate & Private Key**:

1. Click **Replace Certificate** → **Get from Let's Encrypt**.
2. Enter your domain (`meals.example.com`).
3. QNAP automatically renews the certificate before expiry.

---

### Step 7 — Verify

1. Open `https://meals.example.com` — you should see the login page.
2. Log in with `HOUSEHOLD_PASSWORD`.
3. Check realtime connection — the dashboard should connect without errors in the browser console.
4. Check the health endpoints directly if needed:
   - `http://<NAS-IP>:8080/api/health`
   - `http://<NAS-IP>:3001/health`

---

### Updating to a new version

```bash
ssh admin@<NAS-IP>
cd /share/Container/meals-planner
git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker compose -f docker-compose.prod.yml exec web pnpm dlx prisma migrate deploy
```

---

### Backup and restore

**Backup database:**

```bash
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U mpuser mealsplanner > mealsplanner_$(date +%F).sql
```

**Restore database:**

```bash
cat mealsplanner_backup.sql | docker compose -f docker-compose.prod.yml exec -T db \
  psql -U mpuser mealsplanner
```

---

### Troubleshooting

| Symptom | Check |
|---|---|
| App unreachable from internet | Router port forwarding (443 → NAS), DNS A record points to public IP |
| App loads but realtime disconnects | Verify `/socket.io` reverse proxy rule exists and WebSocket is enabled |
| `healthy` never reached for `web` | Check `docker compose logs web` — likely a missing env var or DB not ready |
| Migration fails | Confirm `DATABASE_URL` uses `db` as hostname, not `localhost` |
| Login fails after redeploy | `SESSION_SECRET` must be identical across restarts; check `.env.prod` |

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
