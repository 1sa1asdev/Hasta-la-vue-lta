import { MongoClient } from 'mongodb';
import { config } from '../config.js';

if (!config.mongoUrl) {
  throw new Error(
    'MONGO_URL is not set. Add it to the project .env file or provide it in the process environment.',
  );
}

export const mongo = new MongoClient(config.mongoUrl, { serverSelectionTimeoutMS: 3000 });
export const mongoDb = () => mongo.db();

export const toursCollection = () => mongoDb().collection('tours');
