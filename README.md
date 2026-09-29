# Utpost

be


Plattform för friluftsdestinationer. Redaktionella guider, användarnas egna turer och bilder.

## Kom igång

```bash
npm install
docker compose -f docker-compose.dev.yml up -d
npm run seed
npm run dev:client
```

Appen ligger sen på http://localhost:3001 och API:et pa http://localhost:4000.

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
- `client/` – Vue 3 + Vite

## Deploy

Fråga Marcus.

## M1-kommandon

- `npm run dev:client` – startar Vue-klienten på port 3001.
- `npm run lint` – kör ESLint.
- `npm run format:check` – kontrollerar Prettier-formattering.
- `npm test` – kör Vitest en gång och avslutas.
- `npm run build` – bygger Vue-klienten för produktion.

Projektet har inget `npm start`-script. Använd `npm run dev:client` för Vue-klienten.
