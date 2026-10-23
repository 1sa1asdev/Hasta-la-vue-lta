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

cp environment.example .env
npm run seed
npm run dev
```

PostgresDB is exposed at port :5433 and MongoDB at :27017.
The API loads the root `.env` automatically when it starts, so the local commands above do not need a separate environment loader. Variables already provided by the shell or container environment take precedence over values in `.env`.

`DATABASE_URL`, `MONGO_URL`, and `JWT_SECRET` are required. The template contains working local defaults. If `MONGO_URL` is omitted, the API stops with a configuration error explaining which variable is missing.

The application is then available at <http://localhost:3001> and the API at <http://localhost:4000>. The Vite dev server proxies `/api` and `/graphql` to the API.

## GraphQL client

The Vue client now uses [`@urql/vue`](./client/src/urql.ts) instead of the previous hand-written `graphql()` fetch helper. The URQL client is registered with Vue in [`client/src/main.js`](./client/src/main.js), sends operations to `/graphql`, and uses the `cacheExchange` and `fetchExchange`. Requests use `POST` because `preferGetMethod` is disabled.

The homepage, guide list, and tour list use `useQuery` with generated GraphQL documents. Shared operation documents and mappings to the existing view models live in [`client/src/queries.ts`](./client/src/queries.ts). The former `client/src/graphql.ts` helper and its dedicated test file have been removed.

The client also includes the `graphql` runtime and GraphQL Code Generator CLI/client-preset development dependencies for typed operation generation.

## Create a Pull Request

```bash
npm run pr
```

The CLI reads `.github/pull_request_template.md`, asks questions based on the template (including its checklist), and writes a completed PR body to `.git/PR_BODY.md`.

Commit messages and branch names are used as suggestions. See [`tools/pr-builder/README.md`](tools/pr-builder/README.md) for details on how it works.

## Structure

- `api/` – Express + GraphQL Yoga, with Postgres (Drizzle) and MongoDB
- `web/` – React + Vite
- `client/` – Vue 3 + Vite, using URQL for GraphQL data
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
- `npm run codegen --workspace=client` – Regenerates GraphQL documents and result types after query or schema changes.

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
- The recorded dataset contains 50 tours in the query result, of which 37 have a non-null `guide_id`.
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

#### Observed SQL query count

Save the PostgreSQL logs before making the request:

```bash
docker compose logs --no-log-prefix postgres > /tmp/pg-before.log
```

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

Save the logs again after the request:

```bash
docker compose logs --no-log-prefix postgres > /tmp/pg-after.log
```

Extract the new SQL entries generated by this request:

```bash
diff -u /tmp/pg-before.log /tmp/pg-after.log \
  | grep '^\+.*LOG:  execute ' \
  | sed 's/^+//' > /tmp/graphql-one-run.log
```

Count the statements and verify the breakdown:

```bash
printf "Total executions: "
grep -E 'statement:|execute ' /tmp/graphql-one-run.log | wc -l

printf "Tours: "
grep -c 'FROM tours' /tmp/graphql-one-run.log

printf "Users: "
grep -c 'SELECT id, display_name, role, created_at' /tmp/graphql-one-run.log

printf "Guides: "
grep -c 'FROM guides' /tmp/graphql-one-run.log

printf "Photo counts: "
grep -c 'FROM photos' /tmp/graphql-one-run.log
```

The observed query count was:

| SQL operation | Observed queries |
|---|---:|
| Fetch tours | 1 |
| Fetch each tour's user | 50 |
| Fetch guides for tours with a guide | 37 |
| Count photos for each tour | 50 |
| **Observed total** | **138** |

Calculation: `1 + 50 + 37 + 50 = 138`.

The baseline is **138 SQL queries for one `Tours(limit: 50)` GraphQL request** returning 50 tours. The repeated per-tour lookups for users, guides, and photo counts demonstrate the N+1 query problem.

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
