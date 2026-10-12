# Utpost

A platform for outdoor destinations, featuring editorial guides, user-created tours, and photos.

## Getting Started

Requires Node.js 22.18.0 or later.

Run following commands to start whole application in Docker.

```bash
npm install

docker compose -f compose.yaml up -d
docker compose exec api npm run seed
```

To run databases in Docker but application locally:

```bash
docker compose up -d postgres mongo

npm run seed
npm run dev
```


The application is then available at http://localhost:3001 and the API at http://localhost:4000.

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

