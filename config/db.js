import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/civicsense_db',
  connectionTimeoutMillis: 3000,
});

let isDbConnected = false;

// Test connection & ensure PostGIS spatial tables exist if database is running
export async function initDatabase() {
  try {
    const client = await pool.connect();
    isDbConnected = true;
    console.log('PostgreSQL/PostGIS Database Connected Successfully.');

    // Enable PostGIS extension
    await client.query('CREATE EXTENSION IF NOT EXISTS postgis;');

    // Create Local Bodies spatial table
    await client.query(`
      CREATE TABLE IF NOT EXISTS local_bodies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        zone VARCHAR(255) NOT NULL,
        geom GEOMETRY(Point, 4326)
      );
    `);

    // Create Issues spatial table
    await client.query(`
      CREATE TABLE IF NOT EXISTS issues (
        id VARCHAR(100) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        priority VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        location VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        image_url TEXT,
        assigned_authority VARCHAR(255),
        geom GEOMETRY(Point, 4326),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    client.release();
  } catch (err) {
    isDbConnected = false;
    console.log('ℹ PostgreSQL/PostGIS db notice: Using embedded spatial calculator mode.');
  }
}

export function checkDbConnected() {
  return isDbConnected;
}

export default pool;
