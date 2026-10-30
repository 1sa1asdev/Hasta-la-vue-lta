try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch (error) {
  // Docker and production provide variables through the process environment.
  if (error.code !== 'ENOENT') throw error;
}

export const config = {
  databaseUrl: process.env.DATABASE_URL,
  mongoUrl: process.env.MONGO_URL,
  jwtSecret: process.env.JWT_SECRET,
  port: 4000,
  uploadDir: './uploads',
};
