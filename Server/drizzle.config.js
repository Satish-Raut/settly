import dotenv from 'dotenv';
dotenv.config();

export default {
  schema: './src/db/schema.js',
  out: './src/db/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL
  }
};
