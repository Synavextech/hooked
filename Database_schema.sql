-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- DROP legacy tables if they exist to ensure schema alignment
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS connections CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    phone_number TEXT NOT NULL,
    full_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    country TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    gender TEXT CHECK (gender IN ('man', 'woman')),
    height NUMERIC,
    skin_tone TEXT,
    eye_color TEXT,
    body_shape TEXT,
    sexuality TEXT CHECK (sexuality IN ('straight', 'bisexual', 'gay', 'rather not say')),
    gallery TEXT[] DEFAULT '{}', -- array of public image URLs (at least 6)
    private_gallery TEXT[] DEFAULT '{}', -- array of private image URLs (visible only to accepted connections)
    looking_for TEXT CHECK (looking_for IN (
        'Long term partner',
        'Long term open to short term',
        'short term open to long',
        'short term fun',
        'new friend',
        'still figuring out'
    )),
    drinking TEXT CHECK (drinking IN ('Not for me', 'sober', 'sober curious', 'on special occasion', 'socially on weekends', 'most nights')),
    smoking TEXT CHECK (smoking IN ('Non-smoker', 'social smoker', 'smoker when drinking', 'smoker', 'trying to quit')),
    workout TEXT CHECK (workout IN ('everyday', 'often', 'sometimes', 'never')),
    pets TEXT CHECK (pets IN ('cat', 'dog', 'reptile', 'don''t have but love', 'other', 'allergic to pet', 'want a pet', 'pet free', 'bird', 'all pets')),
    communication_style TEXT CHECK (communication_style IN ('big time texter', 'phone caller', 'video chatter', 'bad texter', 'better in person')),
    love_language TEXT CHECK (love_language IN ('thoughtful gesture', 'presents', 'touch', 'compliment', 'time together')),
    education_level TEXT CHECK (education_level IN ('bachelor', 'in college', 'high school', 'phd', 'in grad schol', 'masters', 'trade school')),
    zodiac TEXT CHECK (zodiac IN ('Capricorn', 'Aquarius', 'Pisces', 'Aries', 'Taurus', 'Gemini', 'cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius')),
    birth_date DATE,
    show_age BOOLEAN DEFAULT true,
    about_me TEXT,
    token_balance INTEGER DEFAULT 0,
    is_premium BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT false, -- Profile verification status managed by admin
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- CONNECTIONS TABLE
CREATE TABLE IF NOT EXISTS connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
    chat_status TEXT NOT NULL DEFAULT 'pending' CHECK (chat_status IN ('pending', 'approved', 'declined')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(sender_id, receiver_id)
);

-- LIKES TABLE
CREATE TABLE IF NOT EXISTS likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    target_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, target_id)
);

-- MESSAGES TABLE
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- REVIEWS TABLE
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    message TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('connection_request', 'connection_accepted', 'message', 'like')),
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
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

-- Enable RLS for all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- POLICIES
-- Users Policies
CREATE POLICY "Allow select for authenticated users" ON users FOR SELECT USING (true);
CREATE POLICY "Allow insert for everyone (signup)" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for users on themselves" ON users FOR UPDATE USING (auth.uid() = id);

-- Profiles Policies
CREATE POLICY "Profiles are viewable by authenticated users" ON profiles FOR SELECT USING (true);
CREATE POLICY "Profiles can be updated by owner" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Profiles can be inserted by owner" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Connections Policies
CREATE POLICY "Connections viewable by sender or receiver" ON connections FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Connections insertable by sender" ON connections FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Connections updatable by receiver" ON connections FOR UPDATE USING (auth.uid() = receiver_id);
CREATE POLICY "Connections deletable by parties" ON connections FOR DELETE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Likes Policies
CREATE POLICY "Likes viewable by involved users" ON likes FOR SELECT USING (auth.uid() = user_id OR auth.uid() = target_id);
CREATE POLICY "Likes manageable by sender" ON likes FOR ALL USING (auth.uid() = user_id);

-- Messages Policies
CREATE POLICY "Messages viewable by sender or receiver" ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Messages insertable by sender" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Reviews Policies
CREATE POLICY "Reviews viewable by everyone" ON reviews FOR SELECT USING (true);
CREATE POLICY "Reviews insertable by authenticated users" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Reviews manageable by admins" ON reviews FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- Notifications Policies
CREATE POLICY "Notifications viewable by recipient" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Notifications updatable by recipient" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Payments Policies
CREATE POLICY "Payments viewable by user" ON payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Payments manageable by admins" ON payments FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- AUTOMATIC PROFILE CREATION TRIGGER
-- Triggers profile row insertion when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, token_balance, is_premium, is_approved)
  VALUES (new.id, 0, false, false);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON profiles(is_approved);
CREATE INDEX IF NOT EXISTS idx_connections_users ON connections(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_connections_chat_status ON connections(chat_status);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_target_id ON likes(target_id);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(sender_id, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_tx ON payments(provider_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
