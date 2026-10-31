import { pool } from './client.js';
import { seedDatabase } from './seed.js';

try {
  await seedDatabase();
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await pool.end();
}