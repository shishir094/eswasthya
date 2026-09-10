import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Supabase connections
  }
});

// Optional: Test the connection on boot
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error acquiring Supabase client:', err.stack);
  } else {
    console.log('Successfully connected to Supabase PostgreSQL database!');
    release();
  }
});

export default pool;