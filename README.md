# Utpost

A platform for outdoor destinations, featuring editorial guides, user-created tours, and photos.

## Getting Started

### Run everything in Docker

Requires Docker with Docker Compose. Works from a clean clone; no `npm install` or `.env` needed.

```bash
docker compose up -d --build
docker compose exec api npm run seed
```

Compose starts four services: `postgres`, `mongo`, `api` and `client`. The seed script creates the tables and fills Postgres with test data.

The application is available at <http://localhost:3001>. The API does not publish a host port; Nginx in the `client` container proxies `/api/` and `/graphql` to it.

Verify that it works:

```bash
docker compose ps                              # all four services Up, postgres and mongo healthy
curl http://localhost:3001/api/health          # {"ok":true,...,"postgres":"ok","mongodb":"ok"}
curl -X POST http://localhost:3001/graphql -H "Content-Type: application/json" -d '{"query":"{ __typename }"}'
                                               # {"data":{"__typename":"Query"}}
```

Log in with any seeded user and the password `hemligt123`. The emails are random on each seed, so list them with:

```bash
docker compose exec postgres psql -U utpost -tAc "select email from users limit 5"
```

To start over with empty databases:

```bash
docker compose down -v
```

### Run databases in Docker, application locally

Requires Node.js 22.18.0 or later.

```bash
npm install
docker compose up -d postgres mongo

npm run seed
npm run dev
```

PostgresDB is exposed at port :5433 and MongoDB at :27017.
You will have to create .env file by template at environment.example and provide valid DB links.

The application is then available at <http://localhost:3001> and the API at <http://localhost:4000>. The Vite dev server proxies `/api` and `/graphql` to the API.

## Create a Pull Request

```bash
npm run pr
```

The CLI reads `.github/pull_request_template.md`, asks questions based on the template (including its checklist), and writes a completed PR body to `.git/PR_BODY.md`.

Commit messages and branch names are used as suggestions. See [`tools/pr-builder/README.md`](tools/pr-builder/README.md) for details on how it works.

## Structure

- `api/` – Express + Postgres (Drizzle)
- `web/` – React + Vite
- `client/` – Vue 3 + Vite
- `shared/` – Shared TypeScript types for the API and client.

## Deployment

Ask Marcus.

## Commands

- `npm run dev:client` – Starts the Vue client on port 3001.
- `npm run lint` – Runs ESLint.
- `npm run format:check` – Checks Prettier formatting.
- `npm test` – Runs Vitest once and exits.
- `npm run build` – Builds the Vue client for production.
- `npm run typecheck` – Checks TypeScript types in the client and API.

## Frontend image

The frontend is built with a multi-stage Dockerfile (`client/Dockerfile`):
Node 22 Alpine builds the assets, and Nginx 1.27 Alpine serves them.
Nginx also proxies `/api/` and `/graphql` to the `api` service.

| Image                   | Size  |
| ----------------------- | ----- |
| hasta-la-vue-lta-client | 73.8 MB |

Measured with `docker images` on 2026-10-19.

## M5 — GraphQL N+1 Query Measurement

### Before DataLoader

#### Test query

The baseline query fetches the 50 most recent tours, including each tour's `user`, `guide`, and `photoCount` fields.

Use this GraphQL query:

```graphql
query Tours($limit: Int) {
  tours(limit: $limit) {
    id
    title
    user {
      id
      displayName
    }
    guide {
      id
      title
    }
    photoCount
  }
}
```

Use the variable:

```json
{
  "limit": 50
}
```

#### Dataset and conditions

- Start the application and PostgreSQL using Docker Compose.
- Seed the database using `docker compose exec api npm run seed` when running the application in Docker.
- For local application development, run `npm run seed` with the required environment variables loaded.
- The recorded dataset contains 50 tours in the query result, of which 38 have a non-null `guide_id`.
- Use the same seeded dataset and query when comparing the baseline with the DataLoader implementation.
- This baseline represents the implementation before DataLoader is introduced.

#### Enable PostgreSQL statement logging

Temporarily enable statement logging to inspect the SQL queries:

```bash
docker compose exec postgres psql -U utpost -d utpost \
  -c "ALTER SYSTEM SET log_statement = 'all';"

docker compose exec postgres psql -U utpost -d utpost \
  -c "SELECT pg_reload_conf();"
```

#### Execute the query

Run the GraphQL query and save the response:

```bash
curl -s http://localhost:3001/graphql \
  -H 'Content-Type: application/json' \
  --data '{"query":"query Tours($limit: Int) { tours(limit: $limit) { id title user { id displayName } guide { id title } photoCount } }","variables":{"limit":50}}' \
  -o /tmp/graphql-baseline.json
```

Verify that the request succeeded and returned 50 tours:

```bash
node -e "const r=require('/tmp/graphql-baseline.json'); if(r.errors) { console.error(r.errors); process.exit(1); } console.log('Tours returned:', r.data.tours.length)"
```

#### Expected SQL query count

Based on the current resolver implementation, the expected query count is:

| SQL operation | Expected queries |
|---|---:|
| Fetch tours | 1 |
| Fetch each tour's user | 50 |
| Fetch guides for tours with a guide | 38 |
| Count photos for each tour | 50 |
| **Expected total** | **139** |

Calculation: `1 + 50 + 38 + 50 = 139`.

The expected baseline is 139 SQL queries for one GraphQL request returning 50 tours. The repeated per-tour lookups for users, guides, and photo counts demonstrate the N+1 query problem.

This total is calculated from the current resolver implementation and the recorded guide count. It should not be treated as a directly observed log count until the SQL statements associated with this specific GraphQL request have been isolated and counted.

#### Disable PostgreSQL statement logging

After collecting the logs, restore the default setting:

```bash
docker compose exec postgres psql -U utpost -d utpost \
  -c "ALTER SYSTEM RESET log_statement;"

docker compose exec postgres psql -U utpost -d utpost \
  -c "SELECT pg_reload_conf();"
```

### After DataLoader

After implementing DataLoader, repeat the same GraphQL query against the same seeded dataset. Record the observed SQL query count and compare it with the pre-DataLoader baseline.

_To be completed after implementing DataLoader._
