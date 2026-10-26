import { pool } from "./client.js";
import { mongo, toursCollection } from "./mongo.js";

const toLogDoc = (log) => ({
  id: log.id,
  t: log.recorded_at,
  lat: log.lat,
  lon: log.lon,
  elevation_m: log.elevation_m,
  heart_rate: log.heart_rate,
  note: log.note,
});

const toTourDoc = (tour, logs) => ({
  tour_id: tour.id,
  user_id: tour.user_id,
  guide_id: tour.guide_id,
  title: tour.title,
  started_at: tour.started_at,
  distance_m: tour.distance_m,
  notes: tour.notes,
  logs: logs.map(toLogDoc),
  stats: { points: logs.length },
});

const migrate = async () => {
  const tours = (await pool.query("select * from tours order by id")).rows;
  const logRows = (
    await pool.query("select * from tour_logs order by tour_id, recorded_at")
  ).rows;

  const logsByTour = new Map();
  for (const row of logRows) {
    if (!logsByTour.has(row.tour_id)) logsByTour.set(row.tour_id, []);
    logsByTour.get(row.tour_id).push(row);
  }

  const collection = toursCollection();
  await collection.createIndex({ tour_id: 1 }, { unique: true });

  if (tours.length > 0) {
    await collection.bulkWrite(
      tours.map((tour) => ({
        replaceOne: {
          filter: { tour_id: tour.id },
          replacement: toTourDoc(tour, logsByTour.get(tour.id) ?? []),
          upsert: true,
        },
      })),
    );
  }
};

const verify = async () => {
  const pgTours = Number(
    (await pool.query("select count(*) from tours")).rows[0].count,
  );
  const pgLogs = Number(
    (await pool.query("select count(*) from tour_logs")).rows[0].count,
  );

  const collection = toursCollection();
  const mongoTours = await collection.countDocuments();
  const [aggregate] = await collection
    .aggregate([
      { $group: { _id: null, points: { $sum: { $size: "$logs" } } } },
    ])
    .toArray();
  const mongoLogs = aggregate?.points ?? 0;

  console.log(`Tours:  Postgres ${pgTours}, MongoDB ${mongoTours}`);
  console.log(`Points: Postgres ${pgLogs}, MongoDB ${mongoLogs}`);

  const ok = pgTours === mongoTours && pgLogs === mongoLogs;
  console.log(ok ? "Verification OK" : "Verification FAILED");
  return ok;
};

const run = async () => {
  await mongo.connect();
  try {
    if (!process.argv.includes("--verify-only")) await migrate();
    if (!(await verify())) process.exitCode = 1;
  } finally {
    await mongo.close();
    await pool.end();
  }
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
