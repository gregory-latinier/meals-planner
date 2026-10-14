# Meals Planner

Household meal planning and grocery list app — built as an installable PWA designed for shared hosting (o2switch / Phusion Passenger) or local deployment.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite + MUI v9 + React Router + `vite-plugin-pwa` |
| Backend & Realtime | Fastify 5 + Socket.IO + TypeScript (`server/`) |
| Database | PostgreSQL 16 via native `pg` client (no Prisma / no WebAssembly / no heavy engines) |
| Migrations | `node-pg-migrate` |
| Auth | Single shared household password, `bcryptjs`, signed HTTP-only session cookies |
| Package manager | pnpm 10 (workspace: `client`, `server`) |
| Containers | Docker for local development PostgreSQL only |

## Project Structure

```
meals-planner/
├── client/                 # Vite SPA / PWA (dev port 5173)
│   ├── src/
│   │   ├── components/     # AppTopBar, MobileBottomNav, ProtectedLayout, etc.
│   │   ├── hooks/          # useRealtime client hook
│   │   ├── pages/          # Dashboard, Recipes, Cookbooks, Stores, Settings, Login
│   │   ├── theme/          # MUI theme tokens
│   │   └── i18n/           # Multi-language translations (FR / EN)
│   ├── vite.config.ts      # Vite config, dev proxy & PWA manifest setup
│   └── tsconfig.json
├── server/                 # Fastify API & Socket.IO server (port 3001)
│   ├── src/
│   │   ├── db/             # pg connection pool & seed script
│   │   ├── routes/         # auth, recipes, cookbooks, stores, taxonomy, images, settings
│   │   ├── lib/            # AI gemini extraction, safety checks, auth & image processing
│   │   └── index.ts        # Fastify + Socket.IO combined server
│   ├── migrations/         # node-pg-migrate schema migrations
│   ├── server.js           # Phusion Passenger cPanel production startup wrapper
│   └── tsconfig.json
├── .github/workflows/      # Automated build & packaging workflow
├── docker-compose.yml      # Local dev PostgreSQL service
├── pnpm-workspace.yaml
└── .env.example
```

---

## Quickstart (Local Development)

### Prerequisites
- Node.js 20+ with pnpm 10 (`npm i -g pnpm@10` or `corepack enable`)
- Docker (for PostgreSQL database)

### 1. Configure environment

```bash
cp .env.example .env
# Edit .env — set SESSION_SECRET and HOUSEHOLD_PASSWORD at minimum
```

Also copy or link `.env` into `server/.env` if running backend standalone:
```bash
cp .env server/.env
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

### 4. Run database migrations & seed

```bash
pnpm db:migrate        # applies PostgreSQL migrations via node-pg-migrate
pnpm db:seed           # creates the initial household with HOUSEHOLD_PASSWORD
```

### 5. Start development servers

```bash
pnpm dev               # starts server (3001) and client (5173) concurrently
```

Or run them individually:

```bash
pnpm dev:server        # Fastify + Socket.IO on http://localhost:3001
pnpm dev:client        # Vite SPA on http://localhost:5173
```

### 6. Access the application

- Web UI: **http://localhost:5173** (proxies `/api`, `/uploads`, and `/socket.io` to port 3001)
- Server Health Check: **http://localhost:3001/api/health**
- Log in with the password configured in `HOUSEHOLD_PASSWORD` (default: `password123` if unset).

---

## Workspace Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start backend server and Vite frontend in parallel |
| `pnpm dev:server` | Start Fastify server with hot-reload (`tsx watch`) |
| `pnpm dev:client` | Start Vite dev server |
| `pnpm dev:db` | Start PostgreSQL Docker container |
| `pnpm dev:db:down` | Stop PostgreSQL Docker container |
| `pnpm dev:db:logs` | Tail PostgreSQL container logs |
| `pnpm build` | Compile backend (`tsc`) and bundle frontend (`vite build`) |
| `pnpm db:migrate` | Run SQL migrations (`node-pg-migrate up`) |
| `pnpm db:seed` | Seed initial household account |
| `pnpm test` | Run test suite |

---

## Deployment on o2switch (Phusion Passenger)

### Why this architecture for o2switch?

o2switch runs CloudLinux with restrictive LVE process limits (`Max resident set` and `Max address space` memory caps). Under these restrictions:
- Prisma engines and WebAssembly instantiations fail with out-of-memory or allocation errors.
- Running heavy compile/build commands directly on the server crashes or triggers resource throttling.

To guarantee complete stability:
- **No Prisma**: Native `pg` client communicates directly with PostgreSQL using lightweight connection pooling.
- **Unified Fastify + Socket.IO service**: A single Node.js Passenger application serves API endpoints, WebSocket connections, uploads, and static client assets.
- **Pre-built artifacts via GitHub Actions**: Packaging runs in CI, producing pre-compiled artifacts ready to extract directly on cPanel with zero building on the server.

---

### Step 1 — Create PostgreSQL Database in cPanel

1. In cPanel, navigate to **Bases de données PostgreSQL** (PostgreSQL Databases).
2. **Create Database**: e.g., `<cpaneluser>_meals`.
3. **Create User**: e.g., `<cpaneluser>_mpuser` with a strong password.
4. **Associate User**: Add the user to the database and grant **All Privileges**.
5. Note your internal database connection string:
   ```text
   postgresql://<cpaneluser>_mpuser:<password>@localhost:5432/<cpaneluser>_meals
   ```

---

### Step 2 — Run Database Migrations in phpPgAdmin

Because migrations can be executed once via SQL directly:
1. In cPanel, open **phpPgAdmin** and select your database (e.g., `<cpaneluser>_meals`).
2. Click the **SQL** tab.
3. Open `server/migrations/001_initial_schema.ts` (or apply your migration script) or run the SQL table creation statements.
4. Insert your initial household account with a bcrypt password hash:

```sql
INSERT INTO "Household" (
  "id",
  "passwordHash",
  "recipeExtractionModel",
  "createdAt",
  "updatedAt"
) VALUES (
  'cm' || lower(substr(md5(random()::text), 1, 23)),
  '<YOUR_BCRYPT_HASH>',
  'GEMINI_FREE',
  NOW(),
  NOW()
);
```

> **How to generate your bcrypt hash locally**:
> ```bash
> node -e "require('bcryptjs').hash('YOUR_STRONG_PASSWORD', 12).then(console.log)"
> ```

---

### Step 3 — Create Subdomain and Enable SSL

1. In cPanel, go to **Domaines** or **Sous-domaines**:
   - Create your subdomain, e.g. `meals.<yourdomain>`.
   - Set the document root to `/home/<cpaneluser>/meals/public` (or similar).
2. In cPanel **SSL/TLS Status**, select the subdomain and click **Run AutoSSL** to issue a free Let's Encrypt certificate.

---

### Step 4 — Download Artifacts from GitHub Actions

Every push to `main` (or manual trigger under **Actions** → **Build & Package Deployment Artifacts**) builds the production bundle:
1. Go to your repository on GitHub and open the **Actions** tab.
2. Select the latest run of **Build & Package Deployment Artifacts**.
3. Under **Artifacts**, download `server-artifact.zip` and `client-artifact.zip`.

---

### Step 5 — Upload and Deploy Artifacts on o2switch

Using cPanel **File Manager** or FTP:

1. Create or open your application folder: `/home/<cpaneluser>/meals/`.
2. Upload `server-artifact.zip` and extract its contents into `/home/<cpaneluser>/meals/`.
   - Ensure `server.js`, `package.json`, `dist/`, and `node_modules/` reside in the app folder.
3. Upload `client-artifact.zip` and extract its contents into `/home/<cpaneluser>/meals/client/dist/` (or serve directly as static files if configuring Apache/Nginx rewrite rules).
4. Create an `uploads` directory at `/home/<cpaneluser>/meals/uploads` with write permissions.

---

### Step 6 — Configure Node.js Application in cPanel

1. In cPanel, open **Configurer une application Node.js** (Setup Node.js App).
2. Click **Create Application**:
   - **Node.js version**: `20.x`
   - **Application mode**: `Production`
   - **Application root**: `meals`
   - **Application URL**: `meals.<yourdomain>`
   - **Application startup file**: `server.js`
3. Add the following **Environment Variables**:

| Variable | Value | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://<user>:<password>@localhost:5432/<db>` | PostgreSQL connection string |
| `PORT` | `3001` (or Passenger port) | Internal application port |
| `NODE_ENV` | `production` | Production environment flag |
| `SESSION_SECRET` | `<64-character-hex-string>` | Key for signing session cookies |
| `HOUSEHOLD_GEMINI_KEY_ENCRYPTION_SECRET` | `<64-character-hex-string>` | Key for encrypting Gemini API keys |
| `CLIENT_URL` | `https://meals.<yourdomain>` | Allowed CORS origin |
| `UPLOAD_DIR` | `/home/<cpaneluser>/meals/uploads` | Absolute path for recipe images |

> Generate 64-char hex strings with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

4. Click **Save** and **Restart Application**.

---

### Step 7 — Verify Deployment

1. Check health endpoint:
   `https://meals.<yourdomain>/api/health` → returns `{"status":"ok", ...}`
2. Open `https://meals.<yourdomain>` in your web browser.
3. Log in with your household password.
4. Verify that the top bar shows **Live** (green) confirming the Socket.IO connection is active.

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `PORT` | Optional | Port for Fastify server (default: `3001`) |
| `NODE_ENV` | Optional | `development` or `production` |
| `CLIENT_URL` | Yes (prod) | Allowed frontend origin for CORS & Socket.IO |
| `UPLOAD_DIR` | Optional | Directory where uploaded recipe images are stored |
| `SESSION_SECRET` | Yes | 64-char hex secret for signing session cookies |
| `HOUSEHOLD_GEMINI_KEY_ENCRYPTION_SECRET` | Yes | 64-char hex secret for encrypting household Gemini keys |
| `HOUSEHOLD_PASSWORD` | Seed only | Password used when executing `pnpm db:seed` |
| `GEMINI_API_KEY` | Optional | Fallback global Google Gemini API key (can also be entered in Settings UI) |
