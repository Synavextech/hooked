-- =======================================================
-- HOOKED.INK DATABASE UPDATE SCRIPT
-- Run this script in your Supabase SQL Editor or Postgres CLI
-- =======================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('stripe', 'paypal', 'mpesa', 'crypto')),
    package_type TEXT NOT NULL CHECK (package_type IN ('premium', 'tokens_50', 'tokens_150')),
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    provider_transaction_id TEXT UNIQUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add private_gallery column to profiles table if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS private_gallery TEXT[] DEFAULT '{}';

-- 3. Add last_active and telegram columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS telegram_id TEXT UNIQUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS telegram_username TEXT;

-- 4. Create LIKES TABLE
CREATE TABLE IF NOT EXISTS public.likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    target_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, target_id)
);

-- 5. Add chat_status column to connections table for chat approval workflow
ALTER TABLE public.connections ADD COLUMN IF NOT EXISTS chat_status TEXT DEFAULT 'pending' CHECK (chat_status IN ('pending', 'approved', 'declined'));

-- 6. Update notifications type constraint to include 'like'
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('connection_request', 'connection_accepted', 'message', 'like'));

-- 7. Performance and Query Indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_tx ON public.payments(provider_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON public.likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_target_id ON public.likes(target_id);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON public.users(last_active);
CREATE INDEX IF NOT EXISTS idx_connections_chat_status ON public.connections(chat_status);

-- 8. Row Level Security (RLS)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies for Payments
DROP POLICY IF EXISTS "Payments viewable by user" ON public.payments;
CREATE POLICY "Payments viewable by user" 
  ON public.payments 
  FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Payments manageable by admins" ON public.payments;
CREATE POLICY "Payments manageable by admins" 
  ON public.payments 
  FOR ALL 
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- 10. RLS Policies for Likes
DROP POLICY IF EXISTS "Likes viewable by involved users" ON public.likes;
CREATE POLICY "Likes viewable by involved users"
  ON public.likes
  FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = target_id);

DROP POLICY IF EXISTS "Likes manageable by sender" ON public.likes;
CREATE POLICY "Likes manageable by sender"
  ON public.likes
  FOR ALL
  USING (auth.uid() = user_id);

-- Verification Query
SELECT 'update script finished successfully' AS status;
