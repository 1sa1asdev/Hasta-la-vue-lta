import DataLoader from 'dataloader';

const idsOf = (keys) => keys.map((id) => Number(id));

const mapById = (keys, rows) => {
  const byId = new Map(rows.map((row) => [Number(row.id), row]));
  return idsOf(keys).map((id) => byId.get(id) ?? null);
};

const groupByTourId = (keys, rows) => {
  const grouped = new Map(idsOf(keys).map((id) => [id, []]));

  for (const row of rows) {
    grouped.get(Number(row.tour_id))?.push(row);
  }

  return idsOf(keys).map((id) => grouped.get(id) ?? []);
};

export const createLoaders = (db) => ({
  user: new DataLoader(async (ids) => {
    const result = await db.query(
      `SELECT id, display_name, role, created_at
       FROM users WHERE id = ANY($1::int[])`,
      [idsOf(ids)],
    );
    return mapById(ids, result.rows);
  }),

  guide: new DataLoader(async (ids) => {
    const result = await db.query(
      'SELECT * FROM guides WHERE id = ANY($1::int[])',
      [idsOf(ids)],
    );
    return mapById(ids, result.rows);
  }),

  photos: new DataLoader(async (tourIds) => {
    const result = await db.query(
      'SELECT * FROM photos WHERE tour_id = ANY($1::int[])',
      [idsOf(tourIds)],
    );
    return groupByTourId(tourIds, result.rows);
  }),

  logs: new DataLoader(async (tourIds) => {
    const result = await db.query(
      `SELECT * FROM tour_logs
       WHERE tour_id = ANY($1::int[])
       ORDER BY recorded_at`,
      [idsOf(tourIds)],
    );
    return groupByTourId(tourIds, result.rows);
  }),
});