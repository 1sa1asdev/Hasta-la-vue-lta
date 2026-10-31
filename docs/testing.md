# Decision: Testing Strategy for Utpost

**Date:** 2026-10-01  
**Status:** Proposal for team review (M2)

## Decision

We use Vitest for unit tests of pure logic and Vue Testing Library for component tests in the Vue client. Tests should verify behavior that users or API consumers can observe, rather than internal implementation details.

All tests run automatically in CI. A PR must not be merged if tests, type checking, linting, formatting checks, or the build fail.

## Background

In M2, we introduce a shared API contract in `@utpost/shared` and TypeScript checks in CI. We also need tests that detect real defects.

Our technical debt inventory (`docs/debt.md`) describes problems including invalid IDs (#5), HTTP errors (#6), inconsistent error handling (#8 and #13), and authentication (#4). The testing strategy should reduce the risk of these bugs recurring.

## Testing Levels

- **Unit tests:** Test pure logic and helper functions in isolation, without a network or database.
- **Component tests:** Test Vue views and components using Vue Testing Library, focusing on what users see and do.
- **API/integration tests:** Used when we need to verify routes, HTTP status codes, and interactions between different parts of the system. We will not introduce a complete E2E test suite in M2.

## Test Map

| Project Code | Level | What Should Be Tested? |
| --- | --- | --- |
| `client/src/components/GuideCard.vue` | Component | The correct guide information is displayed when the component receives data. |
| `client/src/views/GuidesView.vue` | Component | Guides are displayed when the API returns data. |
| `client/src/views/GuidesView.vue` | Component | A clear empty state is displayed when the list is empty. |
| `client/src/views/GuidesView.vue` | Component | The user receives feedback when the API request fails. |
| `client/src/views/ToursView.vue` | Component | Tours are displayed correctly when data is received. |
| `client/src/views/ToursView.vue` | Component | Empty lists and API errors are handled clearly. |
| `api/src/lib/auth.js` | Unit/integration | Invalid or missing authentication is handled according to the route's requirements (technical debt #4). |
| `api/src/routes/guides.js` | API/integration | The guide list has the expected response structure according to `@utpost/shared`. |
| `api/src/routes/tours.js` | API/integration | Invalid IDs return a controlled HTTP error without crashing the server (technical debt #5). |
| `api/src/routes/photos.js` | API/integration | Invalid input produces a controlled error. |

The table identifies the behaviors we want to protect. File names refer to the codebase at the date of this decision and may be updated as JavaScript files are migrated to TypeScript.

## Rules

**When can a PR be merged?** The CI jobs `Kvalitet` and `Bygg` must pass. Type checking, linting, formatting checks, and tests must succeed. The PR must also receive the reviews required by the team's GitHub rules.

**What is required for a bug fix?** Whenever possible, a reproducible bug should first receive a regression test that fails. The test must be committed separately before the fix. After the fix, the test must pass. Include the technical debt number in the test name or a comment when the bug originates from `docs/debt.md`.

**How do we mock the API?** In component tests, network requests are replaced with controlled test responses covering successful requests, empty data, and errors. Tests must not depend on a running API server or database. API routes are tested separately when actual HTTP handling needs to be verified.

**What are our coverage requirements?** We do not set a general percentage target in M2. Twelve meaningful tests that detect real bugs are more valuable than high coverage of trivial code. For every PR, we evaluate which new or modified behaviors need testing.

## What We Intentionally Do Not Test in M2

We do not test the internal functionality of Vue, Pinia, or Vitest. We do not write tests that only check CSS class names or whether a variable has been assigned a value. We will also not introduce complete browser-based E2E tests or load tests in this milestone.

## Alternatives Considered

1. **Manual testing only:** Easy to start with, but bugs may recur without anyone noticing.
2. **Unit tests only:** Fast, but they do not always capture what users actually see in Vue views.
3. **Unit tests + Vue Testing Library + targeted API tests (selected proposal):** Provides both fast verification of logic and checks of user behavior without requiring a large E2E environment.

## Consequences

We need to spend time writing and maintaining tests when behavior changes. In return, the team receives fast feedback in CI and has a better opportunity to detect regressions before merging.

## M5 – API Integration Tests (Issue #91)

API integration tests use Vitest and are located in `api/src/graphql/server.test.js`.

The tests use GraphQL Yoga through `yoga.fetch` and cover:

- GraphQL server response.
- Authentication requirement for `createTour`.
- Fetching guides from PostgreSQL.
- Fetching tours from PostgreSQL.
- Fetching a guide by slug from PostgreSQL.
- Writing and reading a temporary document in MongoDB, then removing it.
- N+1 regression testing using DataLoader and `extensions.databasfragor` against PostgreSQL.

### Local test result

Date: 2026-10-27

Command: `npm run test:api`

```text
 ✓ src/graphql/server.test.js (7 tests) 147ms

 Test Files  1 passed (1)
      Tests  7 passed (7)
   Duration  2.75s
```

- Test files: 1 passed
- Tests: 7 passed, 0 failed
- Test execution time: 147 ms
- Total duration: 2.75 seconds

PostgreSQL and MongoDB were running through Docker Compose, seeded with `npm run seed` and migrated with `npm run migrate:logs`.

To reproduce locally, start the databases and run the tests with the values from `.env.example`:

```bash
docker compose up -d postgres mongo
cp .env.example .env
npm run seed
npm run migrate:logs
npm run test:api
```

The API loads the root `.env` automatically. In CI the databases run as services on `localhost:5432` and `localhost:27017` instead, see [pipeline.md](pipeline.md).

### N+1 regression test

The N+1 regression test is named `begränsar antalet databasfrågor med DataLoader`. It requests 50 tours with their `user`, `guide`, and `photoCount` fields using `yoga.fetch`.

The test verifies that `extensions.databasfragor` is a number and that the SQL query count does not exceed 4.

The DataLoader measurements documented in the README are:

| Measurement | SQL queries |
| --- | --- |
| Before DataLoader | 138 |
| After DataLoader | 4 |

This represents approximately a 97.1% reduction in SQL queries.

The N+1 regression test passed locally against PostgreSQL.

### N+1 regression verification (2026-10-26)

To verify that the N+1 regression test detects unbatched database queries, the `user` DataLoader was temporarily modified to execute one SQL query per unique user ID instead of batching IDs into a single SQL query.

The existing N+1 integration test failed as expected:

- SQL queries with normal DataLoader: 4.
- SQL queries with user batching disabled: 15.
- Assertion failure: `expected 15 to be less than or equal to 4`.
- Other integration tests: 6 passed.

The original `loaders.js` was then restored without retaining any changes to the DataLoader implementation.

After restoration, `npm run test:api` passed again: **7 tests passed, 0 failed**.

This confirms that the existing N+1 regression test detects an increase in SQL queries when user batching is disabled.
