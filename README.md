# Utpost

be


Plattform för friluftsdestinationer. Redaktionella guider, användarnas egna turer och bilder.

## Kom igång

```bash
npm install
docker compose -f docker-compose.dev.yml up -d
npm run seed
npm start
```

Appen ligger sen på http://localhost:3000 och API:et pa http://localhost:4000.

## Skapa en pull request

```bash
npm run pr
```

CLI:n läser `.github/pull_request_template.md`, ställer frågor utifrån mallen
(inklusive checklistan) och skriver ett färdigt PR-body till `.git/PR_BODY.md`.
Commit-meddelanden och branchnamn används som förslag. Se
[`tools/pr-builder/README.md`](tools/pr-builder/README.md) för hur den fungerar.

## Struktur

- `api/` – Express + Postgres (Drizzle)
- `web/` – React + Vite

## Deploy

Fråga Marcus.
