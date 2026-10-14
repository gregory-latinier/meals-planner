# Meals Planner

Household meal planning and grocery list app — built as an installable PWA designed for shared hosting (o2switch / Phusion Passenger) or local deployment.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite + MUI v9 + React Router + `vite-plugin-pwa` |
| Backend & Realtime | Fastify 5 + Socket.IO + TypeScript (`server/`) |
| Database | PostgreSQL 16 via native `pg` client (no Prisma / no WebAssembly / no heavy engines) |
| Migrations | `node-pg-migrate` |
| Auth | Single shared household password, `bcryptjs`, HTTP-only cookie holding a random token stored in the `Session` table (long-lived, renewed while in use) |
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
# Edit .env — set HOUSEHOLD_PASSWORD and HOUSEHOLD_GEMINI_KEY_ENCRYPTION_SECRET at minimum
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
| `pnpm db:migrate` | Run SQL migrations from sources (`node-pg-migrate up`, local dev) |
| `pnpm db:seed` | Seed initial household account (local dev) |
| `migrate:prod` (in `server/`) | Run the compiled migrations (`dist/migrations`), used on o2switch |
| `seed:prod` (in `server/`) | Run the compiled seed (`dist/db/seed.js`), used on o2switch |
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

### Step 2 — Create Subdomain and Enable SSL

1. In cPanel, go to **Domaines** or **Sous-domaines**:
   - Create your subdomain, e.g. `meals.<yourdomain>`.
   - Set the document root to `/home/<cpaneluser>/meals/public` (or similar).
2. In cPanel **SSL/TLS Status**, select the subdomain and click **Run AutoSSL** to issue a free Let's Encrypt certificate.

---

### Step 3 — Download Artifacts from GitHub Actions

Every push to `main` (or manual trigger under **Actions** → **Build & Package Deployment Artifacts**) builds the production bundle:
1. Go to your repository on GitHub and open the **Actions** tab.
2. Select the latest run of **Build & Package Deployment Artifacts**.
3. Under **Artifacts**, download `server-artifact.zip` and `client-artifact.zip`.

---

### Step 4 — Upload and Deploy Artifacts on o2switch

Using cPanel **File Manager** or FTP:

The server looks for the front-end at `../../client/dist` relative to its `dist/` folder. The zips are built so that extracting both of them into the same folder gives the right layout:

```text
/home/<cpaneluser>/meals/
├── server/            <- Node.js application root (from server-artifact.zip)
│   ├── server.js
│   ├── package.json
│   ├── dist/          <- compiled server + dist/migrations/ (compiled migrations)
│   └── node_modules/
├── client/
│   └── dist/          <- index.html, assets/, manifest... (from client-artifact.zip)
└── uploads/           <- recipe images (writable)
```

1. Create the folder `/home/<cpaneluser>/meals/`.
2. Upload `server-artifact.zip` and `client-artifact.zip` there and extract **both** in place (each one contains its own top-level folder: `server/` and `client/`).
3. Create the `uploads` directory at `/home/<cpaneluser>/meals/uploads` with write permissions.
4. Check that `server/server.js`, `server/dist/index.js`, `server/dist/migrations/`, `server/node_modules/` and `client/dist/index.html` exist.

> If the page shows `{"error":"Not found"}` or a blank 404 on `/`, the `client/dist` folder is not at the expected location.

---

### Step 5 — Configure Node.js Application in cPanel

1. In cPanel, open **Configurer une application Node.js** (Setup Node.js App).
2. Click **Create Application**:
   - **Node.js version**: `20.x`
   - **Application mode**: `Production`
   - **Application root**: `meals/server`
   - **Application URL**: `meals.<yourdomain>`
   - **Application startup file**: `server.js`
3. Add the following **Environment Variables**:

| Variable | Value | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://<user>:<password>@localhost:5432/<db>` | PostgreSQL connection string (**required** — without it the app silently falls back to a local dev database and fails) |
| `CLIENT_URL` | `https://meals.<yourdomain>` | Public URL of the app (Socket.IO allowed origin) |
| `UPLOAD_DIR` | `/home/<cpaneluser>/meals/uploads` | Absolute path for recipe images (must be writable) |
| `HOUSEHOLD_GEMINI_KEY_ENCRYPTION_SECRET` | `<64-character-hex-string>` | Key for encrypting the Gemini API key saved from Settings. **Required as soon as you save a key in the UI**, otherwise saving fails with `Missing HOUSEHOLD_GEMINI_KEY_ENCRYPTION_SECRET`. Never change it afterwards, or the stored key becomes unreadable. |
| `GEMINI_API_KEY` | `<your-key>` (optional) | Global fallback Gemini key, used when no key is saved in Settings (`GOOGLE_API_KEY` is also accepted) |

> Generate the 64-char hex secret with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

> **Notes**
> - `NODE_ENV` does not need to be set: `server.js` forces `production`. In production the session cookie is `Secure`, so the site **must** be served over HTTPS (Step 2), otherwise login will appear to succeed but the session is never kept.
> - `PORT` does not need to be set: Passenger injects its own listener. Only set it if you know why.
> - `HOUSEHOLD_PASSWORD` is **not** a permanent variable: add it only for the one-off `seed:prod` run of Step 6, then delete it. If it is missing when the seed runs, the password silently defaults to `password123`.
> - There is no `.env` file in production: variables come from the cPanel Node.js app screen. Restart the application after any change.

4. Click **Save** and **Restart Application**.

---

### Step 6 — Run Migrations and Create the Household (cPanel interface)

The Node.js application screen of cPanel can run the `package.json` scripts, using the environment variables of the app (including `DATABASE_URL`) — no phpPgAdmin needed.

1. Open **Configurer une application Node.js** and click the **Edit** (pencil) icon of your application.
2. If the **Run NPM Install** button is shown, do **not** click it: `node_modules/` is already included in the artifact.
3. Click **Run JS script** and choose `migrate:prod`. It applies the migrations compiled in `server/dist/migrations/` (`001` to `004`) and prints the list of applied migrations. It records them in a `pgmigrations` table, so running it again only applies new ones: **run it after every deployment** that adds a migration.
4. Add **temporarily** the environment variable `HOUSEHOLD_PASSWORD` with the password you want to use to log in, **Save**, then run the script `seed:prod`. It creates the household with a bcrypt hash of that password (it does nothing if a household already exists).
5. **Delete** the `HOUSEHOLD_PASSWORD` variable and **Save** again, so the password is not kept in clear text in the cPanel configuration. Restart the application.

> If `Run JS script` does not list `migrate:prod` / `seed:prod`, the `package.json` of the artifact is outdated: re-download the latest artifacts (Step 3).
>
> If you prefer, the seed can be replaced by an `INSERT` in **phpPgAdmin** with a bcrypt hash generated locally:
> ```sql
> INSERT INTO "Household" ("id", "passwordHash", "recipeExtractionModel", "createdAt", "updatedAt")
> VALUES ('cm' || lower(substr(md5(random()::text), 1, 23)), '<YOUR_BCRYPT_HASH>', 'GEMINI_FREE', NOW(), NOW());
> ```
> ```bash
> node -e "require('bcryptjs').hash('YOUR_STRONG_PASSWORD', 12).then(console.log)"
> ```

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
| `PORT` | Optional | Port for Fastify server (default: `3001`; ignored under Passenger) |
| `NODE_ENV` | Optional | `development` or `production` (forced to `production` by `server.js`) |
| `CLIENT_URL` | Yes (prod) | Public frontend origin, used for Socket.IO CORS (default: `http://localhost:5173`) |
| `UPLOAD_DIR` | Yes (prod) | Directory where uploaded recipe images are stored (default: `./uploads` relative to the working directory) |
| `HOUSEHOLD_GEMINI_KEY_ENCRYPTION_SECRET` | Yes (to save a Gemini key) | 64-char hex secret for encrypting household Gemini keys |
| `HOUSEHOLD_PASSWORD` | Seed only | Password used when executing `pnpm db:seed` (default: `password123`) |
| `GEMINI_API_KEY` | Optional | Fallback global Google Gemini API key (can also be entered in Settings UI). `GOOGLE_API_KEY` is accepted as an alias |
