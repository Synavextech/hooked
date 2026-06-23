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
      -- 1. Add about_me and pending_about_me columns to profiles if not exists
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS about_me TEXT;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pending_about_me TEXT;

      -- 2. Create reviews table if not exists
      CREATE TABLE IF NOT EXISTS public.reviews (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
          message TEXT NOT NULL,
          status TEXT DEFAULT 'pending' NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 3. Create set_timestamp trigger for reviews
      DROP TRIGGER IF EXISTS set_timestamp_reviews ON public.reviews;
      CREATE TRIGGER set_timestamp_reviews
      BEFORE UPDATE ON public.reviews
      FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
    `;

    await client.query(query);
    console.log('Database migration executed successfully! Added about_me columns and reviews table.');
  } catch (error) {
    console.error('Database migration failed:', error);
  } finally {
    await client.end();
  }
}

migrate();
