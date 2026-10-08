// TODO: flytta ut det här nån gång. /marcus 2021-03-11
export const config = {
  databaseUrl: process.env.DATABASE_URL,
  mongoUrl: process.env.MONGO_URL,
  jwtSecret: process.env.JWT_SECRET,
  port: 4000,
  uploadDir: './uploads',
};
