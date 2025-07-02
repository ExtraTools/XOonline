import pkg from 'pg';
const { Pool } = pkg;

// Railway provides DATABASE_URL env variable for PostgreSQL connection
// In local development you can create a .env file with your own DATABASE_URL.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Railway Postgres requires SSL. Disable strict certificate verification.
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

export default pool;