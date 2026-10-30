import { pool } from './db/client.js';
import { createTables } from './db/migrate.js';
import { seedDatabase } from './db/seed.js';
import { app } from './index.js';
import { config } from './config.js';

const boot = async () => {
  try {
    await createTables();

    const result = await pool.query(
      'select count(*)::int as count from users',
    );

    if (result.rows[0].count === 0) {
      console.log('boot: tom databas – seedar');
      await seedDatabase();
    }

    // app.listen(4000, () => {
    app.listen(config.port, () => {
      console.log(`API lyssnar på http://localhost:${config.port}`);
    });
  } catch (err) {
    console.error('API kunde inte starta:', err);
    process.exit(1);
  }
};

boot();