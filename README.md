# Freightly — B2B Logistics Cost Comparison & Rate Ledger

Freightly is a production-ready, deployable B2B logistics cost-comparison web platform built specifically for the Indian freight market. A shipper enters consignment origin, destination, and gross cargo weight to immediately obtain a ranked comparison of Road (FTL and LTL), Rail, Air, and Coastal shipping options, each backed by an itemized, transparent cost breakdown.

---

## Architecture & Technology Stack

- **Monorepo**: npm workspaces (`apps/web` and `apps/api`)
- **Frontend (`apps/web`)**: React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, React Hook Form, Zod. Self-hosted typography via `@fontsource` (Source Serif 4, IBM Plex Sans, IBM Plex Mono) with zero external requests.
- **Design Philosophy**: Printed Indian consignment note / LR (Lorry Receipt) ledger aesthetic. Strict `0px` border-radius, warm paper palette (`#F6F2EA`), ink typography, hairline rules, and stamp-red accents.
- **Backend (`apps/api`)**: Node.js 20+, Express 5, TypeScript, Zod request validation, Pino structured logging, Helmet security headers, CORS protection, and rate limiting.
- **Database**: PostgreSQL with versioned, idempotent migrations via `node-pg-migrate`. Enforced with NOT NULL, CHECK, UNIQUE constraints, and indexes. Starts with zero user data, zero cached routes, and 46 baseline rate configuration defaults.
- **Routing & Distance Engine**: OpenRouteService (ORS) integration for real Indian highway distances and transit durations with PostgreSQL caching (`route_cache` and `geocode_cache`), falling back to great-circle Haversine distance when offline.
- **Testing**: Vitest (pure cost engine, places/distance services, and full database integration tests) and Playwright for end-to-end user journeys.

---

## 1. Getting a Free OpenRouteService (ORS) API Key

Freightly uses OpenRouteService for real highway routing, geocoding, and transit time calculations across Indian road corridors.

1. Sign up for a free developer account at [openrouteservice.org/dev/#/signup](https://openrouteservice.org/dev/#/signup).
2. Confirm your email address and log in to the dashboard.
3. Navigate to **Tokens** and click **Request a token**.
4. Choose **Standard / Free** plan, enter a token name (e.g. `freightly-dev`), and click **Create Token**.
5. Copy the generated API key string.

---

## 2. Running Locally in Under Five Commands

Clone the repository and run the entire stack locally:

```bash
# 1. Setup environment configuration
cp .env.example .env && cp .env.example apps/api/.env
# (Edit .env and set ORS_API_KEY with your key)

# 2. Launch local PostgreSQL database containers
docker compose up -d

# 3. Install dependencies and build both web and api
npm install && npm run build

# 4. Run full test suite (unit, integration, and e2e)
npm test

# 5. Start the production server (runs migrations then binds to port 3001)
npm start
```

Open [http://localhost:3001](http://localhost:3001) in your browser. Type **Pune** and **Ahmedabad**, enter **5000** kg, and immediately get a ranked multi-modal comparison with zero manual data entry.

---

## 3. Deploying to Render via Blueprint

The repository includes a ready-to-deploy [render.yaml](render.yaml) Blueprint that provisions a managed PostgreSQL database and a Node web service:

1. Push your repository to GitHub or GitLab.
2. In the Render Dashboard, click **New +** and select **Blueprint**.
3. Connect your repository. Render will automatically parse [render.yaml](render.yaml) and plan two resources:
   - `freightly-db`: Managed PostgreSQL database (Free tier)
   - `freightly`: Web service running Node 20+
4. Set the prompt environment variables:
   - `ORS_API_KEY`: Your OpenRouteService API key.
   - `ADMIN_EMAIL`: The email address of your initial administrator (e.g. `admin@yourcompany.in`).
5. Click **Apply**. Render will automatically provision the database, wire `DATABASE_URL`, generate `JWT_SECRET`, build the frontend and backend, run database migrations, and serve the application with SSL.

---

## 4. Setting Environment Variables

| Variable | Description | Example / Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://freightly:freightly@localhost:5434/freightly` |
| `DATABASE_URL_TEST`| PostgreSQL test database connection | `postgres://freightly:freightly@localhost:5434/freightly_test` |
| `JWT_SECRET` | Secret key for signing session tokens | `random-32-char-string` |
| `ORS_API_KEY` | OpenRouteService API key | *(Your ORS key)* |
| `ADMIN_EMAIL` | Email promoted to administrator on registration | `admin@example.com` |
| `PORT` | HTTP port for API and static server | `3001` |
| `NODE_ENV` | Runtime environment mode | `development` or `production` |
| `CORS_ORIGIN` | Allowed web origin in production | `http://localhost:5173` |

---

## 5. Promoting the First Administrator

Freightly uses an environment-driven bootstrap for administrator privileges:

1. Ensure `ADMIN_EMAIL` is set in your environment (e.g. `ADMIN_EMAIL=admin@example.com`).
2. Open Freightly in your browser, click **Sign In**, and select **Create Account**.
3. Register using the exact email matching `ADMIN_EMAIL`.
4. The server assigns role `'admin'` on creation.
5. The **Admin Rates** navigation link will immediately appear, granting access to manage benchmark parameters, inspect parameter diffs, and activate new rate versions in atomic transactions.

---

## 6. Troubleshooting: Top 5 Likely Failures

### 1. `DATABASE_URL is not set` or Connection Refused
- **Symptom**: `Error: connect ECONNREFUSED 127.0.0.1:5434`
- **Cause**: Local Postgres Docker container is not running or port is misconfigured.
- **Fix**: Run `docker compose up -d` and ensure port `5434` is free. Confirm `pg_isready -h localhost -p 5434 -U freightly` succeeds.

### 2. ORS Distance Fallback (`source: 'estimate'`)
- **Symptom**: Results show `"Great-Circle Est."` badge instead of `"ORS Highway"`.
- **Cause**: Invalid or expired `ORS_API_KEY`, or ORS rate limit reached (40 req/min free quota).
- **Fix**: Check your key in `.env` and verify via:
  ```bash
  curl -H "Authorization: $ORS_API_KEY" "https://api.openrouteservice.org/geocode/search?text=Pune&boundary.country=IN&size=1"
  ```
  Freightly gracefully falls back to great-circle Haversine × 1.25 road multiplier with honest labeling so operations never break.

### 3. Render Managed Postgres SSL Rejection
- **Symptom**: `Error: self signed certificate in certificate chain`
- **Cause**: Render managed PostgreSQL requires SSL with `rejectUnauthorized: false` for internal client connections.
- **Fix**: Freightly's connection pool in `apps/api/src/db/pool.ts` automatically configures `{ rejectUnauthorized: false }` whenever `NODE_ENV === 'production'` or `sslmode=require` is present in `DATABASE_URL`.

### 4. Port Conflict on 3001 or 5173
- **Symptom**: `Error: listen EADDRINUSE: address already in use :::3001`
- **Cause**: A previous server instance is still occupying the port.
- **Fix**: Find and kill the dangling process:
  ```bash
  lsof -ti:3001 | xargs kill -9
  ```

### 5. Migration Lock Contention on Deployment
- **Symptom**: Server startup hangs on `Running migrations with advisory lock`.
- **Cause**: Multiple web instances booting concurrently attempting migration execution.
- **Fix**: Freightly runs migrations inside a PostgreSQL advisory lock (`singleTransaction: true` via `node-pg-migrate`). If an aborted deploy leaves a lock dangling, run:
  ```bash
  docker exec freightly-postgres psql -U freightly -d freightly -c "SELECT pg_advisory_unlock_all();"
  ```
