
import { BSON } from 'mongodb';
import { pool } from './client.js';
import { mongo, toursCollection } from './mongo.js';

const tourId = Number(process.argv[2] ?? 1);

const run = async () => {
  const tour = (await pool.query('select * from tours where id = $1', [tourId])).rows[0];
  if (!tour) throw new Error(`No tour with id ${tourId} in Postgres – run npm run seed first`);
  const logs = (
    await pool.query('select * from tour_logs where tour_id = $1 order by recorded_at', [tourId])
  ).rows;

  const doc = {
    tour_id: tour.id, 
    user_id: tour.user_id,
    guide_id: tour.guide_id,
    title: tour.title,
    started_at: tour.started_at,
    distance_m: tour.distance_m,
    notes: tour.notes,
    logs: logs.map((l) => ({
      t: l.recorded_at,
      lat: l.lat,
      lon: l.lon,
      elevation_m: l.elevation_m,
      heart_rate: l.heart_rate,
      note: l.note,
    })),
    stats: { points: logs.length },
  };

  await mongo.connect();
  const tours = toursCollection();
  await tours.createIndex({ tour_id: 1 }, { unique: true });
  await tours.replaceOne({ tour_id: tour.id }, doc, { upsert: true });

  const back = await tours.findOne({ tour_id: tour.id }, { projection: { logs: { $slice: 2 } } });

  console.log(`Postgres: 1 row in tours + ${logs.length} rows in tour_logs`);
  console.log(`MongoDB:  1 document, ${(BSON.calculateObjectSize(doc) / 1024).toFixed(1)} kB`);
  console.log(`Document in collection tours: ${await tours.countDocuments()}`);
  console.log(JSON.stringify(back, null, 2));
  await mongo.close();
  await pool.end();
};

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});