# Decision: REST and GraphQL

**Decision:** Use GraphQL for the guide list and the tour list. Keep REST for login and for the tour detail page until the GraphQL schema can return measurement points (`logs`).

## Background

After M4 the API exposes the same domain over two styles. REST lives under `/api/*`. GraphQL Yoga answers at `/graphql`. The Vue client loads the guide list and the tour table through GraphQL (`client/src/queries.ts`). Login still posts to `POST /api/auth/login`. The tour detail page still calls `GET /api/tours/:id`, because GraphQL has no track points.

Issue #72 asks for a measured comparison on the screens the app actually uses: how many HTTP requests, how many bytes come back, and how many database queries run.

## Use cases

| Use case       | REST                 | GraphQL                                                                                             |
| -------------- | -------------------- | --------------------------------------------------------------------------------------------------- |
| Guide list     | `GET /api/guides`    | `query { guides { … } }` with the fields the guide cards need                                       |
| Tour list (50) | `GET /api/tours`     | `query { tours(limit: 50) { id title distanceM photoCount user { displayName } guide { title } } }` |
| Tour detail    | `GET /api/tours/:id` | `query { tour(id) { … } }` — GraphQL has no `logs`, so this case is incomplete                      |

## Measurements

Measured on 2026-10-19 against the local database after `npm run seed` (seed data, not real users). Postgres on port 5433, API on port 4000. Each call ran several times with `curl`; the first run was treated as warm-up. Response size was the same on every run. Times are typical later runs on a local machine.

| Use case       | API     | HTTP requests |    Response bytes |     Time | DB queries |
| -------------- | ------- | ------------: | ----------------: | -------: | ---------: |
| Guide list     | REST    |             1 |            26 172 | ~0.005 s |          1 |
| Guide list     | GraphQL |             1 |            25 112 | ~0.005 s |          1 |
| Tour list (50) | REST    |             1 | 294 625 (~288 KB) |  ~0.07 s |  up to 201 |
| Tour list (50) | GraphQL |             1 |   6 727 (~6.6 KB) |  ~0.02 s |  up to 151 |

### How the response sizes were measured

HTTP request count is one call per use case. Response bytes and time came from `curl` against the local API. The same checks work in Postman or in GraphiQL at `http://localhost:4000/graphql` (browser Network tab for size).

REST tour list:

```bash
curl -sS -o /tmp/rest-tours.json -w 'bytes=%{size_download} time=%{time_total}\n' \
  http://localhost:4000/api/tours
```

GraphQL tour list (same fields as `client/src/queries.ts`):

```bash
curl -sS -o /tmp/gql-tours.json -w 'bytes=%{size_download} time=%{time_total}\n' \
  http://localhost:4000/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"query($limit:Int){ tours(limit:$limit){ id title distanceM photoCount user{displayName} guide{title} } }","variables":{"limit":50}}'
```

Guide list uses the same flags against `GET /api/guides` and a GraphQL `guides { … }` query with the card fields.

In Postman: GET for REST paths; POST to `/graphql` with header `Content-Type: application/json` and a raw JSON body `{ "query": "...", "variables": { ... } }`. Read size and time from the response panel.

### How the database query counts were derived

Counts come from reading the code. They match the N+1 pattern already described in `docs/decisions/databas.md`.

**REST tour list** (`api/src/routes/tours.js`): one query for up to 50 tours, then for each tour a user query, a guide query (when `guide_id` is set), a photos query, and a `tour_logs` query. Worst case: `1 + 50 × 4 = 201`.

**GraphQL tour list** (`api/src/graphql/resolvers.js`): one query for up to 50 tours, then for each tour a user query, a guide query (when `guide_id` is set), and a `photoCount` query. No `tour_logs`. When every tour has a guide: `1 + 50 × 3 = 151`.

**Guide list:** both styles run one `SELECT` on `guides`.

## Why the numbers look like that

The guide list is almost the same in both styles. The fields overlap, so the payloads differ by about 1 KB and the query count stays at one.

The tour list is where GraphQL wins. REST returns the full nested payload for every tour: user rows, guide rows, every photo, and every measurement point. The Vue table only needs title, author name, guide title, distance, and photo count. GraphQL asks for those fields and a `photoCount` instead of photo rows, so the body drops from about 288 KB to about 6.6 KB. Wall time drops from about 0.07 s to about 0.02 s on the same machine.

HTTP request count is still one for both styles. The win is payload size and avoiding the track queries on the list, not fewer round trips from the browser.

Tour detail was not measured as a fair pair. REST returns `logs` and `photos` for the elevation summary. GraphQL's `tour` type has no `logs`, so a GraphQL call cannot drive the current detail page.

## Decision

Keep GraphQL for the guide list and the tour list. That is what the Vue client already does after issue #71.

Keep REST for:

- `POST /api/auth/login` — GraphQL has no login operation.
- `GET /api/tours/:id` — the detail page needs measurement points until the schema grows or tours move to the Mongo document model from `docs/decisions/databas.md`.

Do not introduce Apollo, urql, or code generation in M4. The client stays on a small `fetch` helper.

## Alternatives we compared

**Stay on REST for the lists.** Same request count and almost the same guide payload. The tour list keeps shipping hundreds of kilobytes of tracks and photos the table never shows, and up to 201 database queries.

**Move every read to GraphQL now.** Login and the detail page are not ready. Blocking M4 on a full schema is not worth it when the list screens already show the clear win.

**Add a thinner REST list endpoint.** That would cut the REST tour payload too. GraphQL already lets the client pick the fields, which is the M4 goal, so we measured and kept that path for the lists.

## Consequences

Two API styles stay in the repo until tour detail and auth have GraphQL coverage or the Mongo tour document removes the need for nested REST joins.

Measurements are seed data on one laptop. Real tours with longer tracks will make the REST list even larger relative to GraphQL. Re-measure after the Mongo migration if the team wants updated numbers.

**Written by:** Negar
