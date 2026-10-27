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

## Mätning före/efter (M5)

This section collects the M5 evidence (B1–B7). Details about the test suite are in [docs/testing.md](docs/testing.md), and details about the CI jobs are in [docs/pipeline.md](docs/pipeline.md).

| Query | Database queries before | Database queries after |
| --- | ---: | ---: |
| `Tours` (`tours(limit: 50)` with `user`, `guide`, `photoCount`) | 138 | 4 |

### B1 urql cache behavior

Going Tours → Guides → Tours showed only 2 `POST /graphql` requests in the Network tab: one `Tours` and one `Guides` on the first visit to each view. Returning to Tours sent no new request, because `cacheExchange` answered the same query with the same variables from memory. Reloading the page empties the cache.

### B2 Codegen catches schema changes

On the throwaway branch `tmp/remove-distanceM` (not merged, deleted afterwards), `distanceM` was removed from the `Tour` type in `api/src/graphql/schema.js`. `npm run typecheck` runs codegen first, and it stopped with exit code 1 because two client documents still query the field:

```text
✖ Generate [FAILED: GraphQL Document Validation failed with 2 errors;
  Error 0: Cannot query field "distanceM" on type "Tour".
    at client/src/queries.ts:6:7

Error 1: Cannot query field "distanceM" on type "Tour".
    at client/src/views/HomeView.vue:13:7]
✖ One or more errors occurred, no files were generated. To allow output on errors, set config.allowPartialOutputs=true
npm error Lifecycle script `codegen` failed with error:
npm error code 1
npm error workspace client@0.0.0
npm error command failed
```

Run on 2026-10-27. Absolute local paths have been shortened to repository-relative paths.

To reproduce: create a throwaway branch, remove a field from `schema.js` that a view uses, run `npm run typecheck`, then delete the branch.

### B3 Views using `useQuery`

| View | Generated document | Query |
| --- | --- | --- |
| `client/src/views/ToursView.vue` | `TOURS_QUERY` in `client/src/queries.ts` | `Tours($limit: Int)` |
| `client/src/views/GuidesView.vue` | `GUIDES_QUERY` in `client/src/queries.ts` | `Guides` |

`HomeView.vue` also uses `useQuery`, with `HomeDocument`. Each view has a test that mocks `@urql/vue` (`*View.useQuery.test.ts`).

Last lines of `npm test` (2026-10-27):

```text
 Test Files  15 passed (15)
      Tests  82 passed | 1 todo (83)
   Duration  34.52s
```

### B4 DataLoader: database queries before and after

#### Test query

The measurement query fetches the 50 most recent tours, including each tour's `user`, `guide`, and `photoCount` fields.

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

Variables:

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
- Use the same seeded dataset and query for both the before and after measurements.

#### How to count the SQL queries

Temporarily enable statement logging:

```bash
docker compose exec postgres psql -U utpost -d utpost \
  -c "ALTER SYSTEM SET log_statement = 'all';"

docker compose exec postgres psql -U utpost -d utpost \
  -c "SELECT pg_reload_conf();"
```

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

After collecting the logs, restore the default setting:

```bash
docker compose exec postgres psql -U utpost -d utpost \
  -c "ALTER SYSTEM RESET log_statement;"

docker compose exec postgres psql -U utpost -d utpost \
  -c "SELECT pg_reload_conf();"
```

#### Before DataLoader

| SQL operation | Observed queries |
|---|---:|
| Fetch tours | 1 |
| Fetch each tour's user | 50 |
| Fetch guides for tours with a guide | 37 |
| Count photos for each tour | 50 |
| **Observed total** | **138** |

Calculation: `1 + 50 + 37 + 50 = 138`.

The repeated per-tour lookups for users, guides, and photo counts demonstrate the N+1 query problem.

#### After DataLoader (Issue #87)

The same query was run again after seeding with `docker compose exec api npm run seed`. The response returned 50 tours, and `extensions.databasfragor` was **4**.

| SQL operation | Observed queries |
|---|---:|
| Fetch tours | 1 |
| Fetch the tours' users | 1 |
| Fetch guides for tours with a guide | 1 |
| Fetch photos for the photo counts | 1 |
| **Observed total** | **4** |

Calculation: `1 + 1 + 1 + 1 = 4`.

The user, guide, and photo lookups each run as one `WHERE ... = ANY(...)` query for the whole list. DataLoader reduced the SQL queries from **138 to 4**, about **97.1%** fewer.

The API exposes the query count through `extensions.databasfragor` in the GraphQL response.

### B5 Migration to MongoDB

Run with `docker compose exec api npm run migrate:logs` on 2026-10-27, after seeding.

First run:

```text
> @utpost/api@1.4.2 migrate:logs
> node src/db/migrate-logs.js

Tours:  Postgres 200, MongoDB 200
Points: Postgres 5861, MongoDB 5861
Verification OK
```

Second run:

```text
> @utpost/api@1.4.2 migrate:logs
> node src/db/migrate-logs.js

Tours:  Postgres 200, MongoDB 200
Points: Postgres 5861, MongoDB 5861
Verification OK
```

The second run creates no duplicates. Each tour is written with `replaceOne` and upsert on `tour_id`, and there is a unique index on `tour_id`. The script counts the documents against the tours, and the embedded log points against the rows in `tour_logs`. If the counts don't match, it exits with an error code.

### B6 Integration tests (Issue #91)

The integration tests in `api/src/graphql/server.test.js` use `yoga.fetch` against the real databases. The test count and duration are documented in [docs/testing.md](docs/testing.md#m5--api-integration-tests-issue-91).

N+1 regression test: **`begränsar antalet databasfrågor med DataLoader`**. It asserts that `extensions.databasfragor` is at most 4.

| Condition | `extensions.databasfragor` | Test result |
| --- | ---: | --- |
| DataLoader enabled | 4 | passed |
| `user` loader disconnected (one query per user ID) | 15 | failed: `expected 15 to be less than or equal to 4` |
