# Decision: Database choice

One of the team's six decision documents. Written in M3 and kept up to date. Same template as `docs/testing.md`.

**Date:** 2026-10-08
**Status:** Sketch for the team. Not signed.
**Decision:** Tours live in MongoDB, one document per tour, with the GPS track, photo metadata, and precomputed totals embedded. Users and guides stay in Postgres, because many tours share them and they have their own write paths (login and editorial).

## Background

We inherited tours, measurement points, and photos as three Postgres tables (`tours`, `tour_logs`, `photos`). `GET /api/tours` loads up to 50 tours and then, for each tour, queries the user, the guide, the photos, and `tour_logs` (`api/src/routes/tours.js`). That is up to 201 database queries for one list response. The list only shows title, name, guide title, distance, and photo count. The profile page fetches the same response and filters it down to the current user's tours in the browser (debt item 10 in `docs/debt.md`).

Elevation gain is calculated in the client every time the tour page opens (`elevationGain` in `client/lib/tours.ts`).

Measured on 2026-10-08 against the local database after `npm run seed` (seed data, not real users):

| What | Result |
| --- | ---: |
| `/api/tours` response size | 283 894 bytes (about 277 KB) for 50 tours |
| `/api/tours` response time | 0.10 s, local machine |
| Rows in `tour_logs` | 5 882 |
| Points on the largest tour | 39 (tour 149) |

The seed script gives every tour 20–39 points, which matches the largest tour. The schema comment says a tour grows by about 300 points, so real tours may be several times larger than the seed data.

## Document model for tours

One document per tour. The track is embedded. A measurement point is a few numbers and a timestamp, on the order of 150 bytes in JSON. Our largest tour has 39 points, which is about 6 KB. Even at the 300 points the schema comment expects, a track is about 45 KB. At that estimate, the 16 MB document limit sits around 100 000 points per tour. We are far below that, so the track fits in the same document as the tour, and the tour page can read everything in one call.

The list response omits the track. `GET /api/tours` and `GET /api/tours/latest` read the document without the `logs` field. The totals in `stats` remain, so the table can be drawn without recalculating the points.

**Embedded**

- `logs` — the track belongs to the tour and is read only on the tour page.
- `photos` — a few pictures per tour. The embedded fields are filename, width, height, and time. The image file itself is not in the database.
- `author.displayName` and `guide.title` — copies, so the list does not look them up in Postgres. `author.id` and `guide.id` are references to the rows that still own the data. When someone changes a display name or a guide title, the copy has to be updated on the tours that carry it.

**Precomputed** (`stats`, rewritten when points or photos change)

- `distanceM` — already stored as `tours.distance_m`.
- `elevationGainM` — the same sum as `elevationGain()`: skip points with no elevation, add only the climbs.
- `pointCount` — so the summary on the tour page does not have to count `logs` in the client.
- `photoCount` — so the list can omit `photos` as well, if we want that later.

**Indexes for the queries the client already makes**

- `{ startedAt: -1 }` — the tour list and `/api/tours/latest`, sorted by most recent start.
- `{ "author.id": 1, startedAt: -1 }` — the profile's "my tours", instead of fetching every tour and filtering in the browser.

```json
{
  "id": 1842,
  "title": "Tour 12",
  "startedAt": "2026-06-14T08:12:00.000Z",
  "notes": "Wet weather, crowded at the rest stop.",
  "author": { "id": 4, "displayName": "Sara Lind" },
  "guide": { "id": 17, "title": "Norra Björnleden 17" },
  "stats": {
    "distanceM": 12400,
    "elevationGainM": 430,
    "pointCount": 286,
    "photoCount": 2
  },
  "photos": [
    { "filename": "tour-1842-1.jpg", "width": 4032, "height": 3024, "createdAt": "2026-06-14T09:05:00.000Z" }
  ],
  "logs": [
    { "recordedAt": "2026-06-14T08:17:00.000Z", "lat": 63.12, "lon": 14.55, "elevationM": 412, "heartRate": 128, "note": null }
  ]
}
```

A tour with no guide has `"guide": null`. A tour with no points has `"logs": []` and zeros in `stats`.

## What stays in Postgres

**Users.** Login, `password_hash`, and email belong in a table of unique rows with a transaction around the account. The password hash is never copied to MongoDB.

**Guides.** One guide is used by many tours. The article (`body_html`), region, difficulty, and `published` are editorial content with their own updates. The tour document stores only the id and the title.

**Photos as files.** Only metadata travels with the tour. Image replacement and duplicate detection in `api/src/routes/photos.js` update the tour document's `photos` list, rather than a separate photo table, once the migration is done.

## How the migration will work (carried out in M5)

1. A script reads `tours`, `tour_logs`, and `photos` from Postgres, computes `stats`, and writes one MongoDB document per tour.
2. Verification before any route changes source: the number of tours matches, the sum of embedded points matches `tour_logs`, and a sample of tours is compared field by field (title, distance, first and last point, photo count).
3. `/api/tours`, `/api/tours/latest`, and `/api/tours/:id` read from MongoDB. The list omits `logs`. Creating and deleting a tour writes to MongoDB.
4. When the sample check is green, `tour_logs` is emptied. The table is dropped only after the team has seen that no route reads it anymore. The `tours` and `photos` rows for migrated data follow the same path.

## Alternatives we compared

**Keep everything in Postgres, with a `jsonb` column for the track.** One database, one backup, no new connection strings. The list can stop sending the track. We would not be practicing the document model M3 asks for, and the N+1 queries against users and guides remain unless we rewrite them anyway.

**Move everything to MongoDB.** One call can fetch the tour, the author, and the guide. Users and guides are shared by many documents, so names, passwords, and article text are either copied or given their own collections with references. Login and editorial content lose Postgres transactions, and those tables gain nothing from the move.

**MongoDB only for `tour_logs`, Postgres for the rest.** The track grows the fastest, and 16 MB is not the problem at about 300 points. The tour list would still join users, guide, and photos, which is the cost `/api/tours` has today. The boundary cuts through the tour, so the tour page reads two databases for one screen.

We chose the whole tour document in MongoDB and shared data in Postgres. The track is small enough to embed, and users and guides are what is actually shared.

## Consequences

We run and back up two databases. The environment gets two connection strings, one for Postgres and one for MongoDB.

`docker-compose.dev.yml` starts only Postgres today. MongoDB is added there as its own service. The pipeline needs a MongoDB for the tests that hit the tour routes, or those tests mock it the same way client tests already mock API calls. In M6 that is two database services to configure in the cloud, each with its own secret.

Copies of display names and guide titles can go stale. Whoever changes a name or a guide title has to update the tour documents that carry the copy, or accept that the list shows the old name until the next write.

**Written by:** Not signed. Whoever puts their name here should be able to defend the document out loud.
