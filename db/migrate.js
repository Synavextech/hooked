const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is missing in .env file');
  process.exit(1);
}

const client = new Client({
  connectionString,
});

async function migrate() {
  try {
    await client.connect();
    console.log('Connected to Supabase database successfully.');

    const query = `
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pending_gender TEXT;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pending_height TEXT;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pending_skin_tone TEXT;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pending_eye_color TEXT;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pending_body_shape TEXT;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pending_images JSONB DEFAULT '[]'::JSONB;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'none';
    `;

    await client.query(query);
    console.log('Database migration executed successfully! Added pending profile columns.');
  } catch (error) {
    console.error('Database migration failed:', error);
  } finally {
    await client.end();
  }
}

migrate();
