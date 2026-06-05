-- ================================================================
-- PASSWALA — COMMUNITY (POSTS) TABLE FIX
-- ================================================================
-- This script safely drops any existing broken table and recreates 
-- it with the correct foreign key relationships, then explicitly 
-- reloads the Supabase API schema cache.

-- 1. Drop existing broken table
DROP TABLE IF EXISTS posts CASCADE;

-- 2. Create correct table with foreign keys
CREATE TABLE posts (
    id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID         REFERENCES users(id) ON DELETE CASCADE,
    content          TEXT         NOT NULL,
    image_url        TEXT,
    likes_count      INTEGER      DEFAULT 0,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Indexes for fast fetching
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);

-- 4. RLS Policies
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts_all" ON posts FOR ALL USING (true);

-- 5. Force the Supabase API to recognize the new foreign key
NOTIFY pgrst, 'reload schema';
