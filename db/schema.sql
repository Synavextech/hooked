-- Hooked platform Database Schema

-- 1. Custom Types
CREATE TYPE interaction_type AS ENUM ('just_chat', 'plan_meet', 'friendship', 'serious_relationship');
CREATE TYPE connection_status AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE user_role AS ENUM ('admin', 'user');

-- 2. Tables

-- users table extending auth.users would be ideal, but for standard setup, we can use our own users table or link to Supabase auth.users
-- Assuming we use our own users table for simplicity, but it's better to link if using Supabase Auth.
-- Let's define the base users table.
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, -- Storing hashed password since we implement our own JWT auth via Express
    names TEXT NOT NULL,
    phone_number TEXT,
    country TEXT,
    interaction_preference interaction_type NOT NULL,
    role user_role DEFAULT 'user'::user_role NOT NULL,
    is_premium BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- profiles table
CREATE TABLE public.profiles (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    gender TEXT,
    height TEXT,
    skin_tone TEXT,
    eye_color TEXT,
    body_shape TEXT,
    images JSONB DEFAULT '[]'::JSONB, -- Array of image URLs (min 6 per requirements)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- connections table
CREATE TABLE public.connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    status connection_status DEFAULT 'pending'::connection_status,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(requester_id, recipient_id)
);

-- payments table for tracking payhero transactions
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    merchant_reference TEXT UNIQUE NOT NULL,
    checkout_request_id TEXT,
    amount DECIMAL NOT NULL,
    status TEXT DEFAULT 'pending',
    provider_reference TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Storage Buckets configuration
-- We need to enable the storage extension if not enabled, but Supabase has it by default
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile_images', 'profile_images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies (assuming users authenticate with our backend, our backend will upload using service role, 
-- but if we want direct client uploads, we'd need to link to Supabase Auth. 
-- Since we use Express for auth, backend will handle uploads using the service role key, so public read is enough).
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'profile_images');

-- 4. Triggers for updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_profiles
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_connections
BEFORE UPDATE ON public.connections
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_payments
BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
