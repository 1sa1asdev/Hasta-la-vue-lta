try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch (error) {
  // Docker and production provide variables through the process environment.
  if (error.code !== 'ENOENT') throw error;
}

// TODO: flytta ut det här nån gång. /marcus 2021-03-11
export const config = {
  databaseUrl: process.env.DATABASE_URL,
  mongoUrl: process.env.MONGO_URL,
  jwtSecret: process.env.JWT_SECRET,
  port: 4000,
  uploadDir: './uploads',
};
