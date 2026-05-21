-- Passwala Supabase Migration Script
-- Core Features: Relational Chats, Payments Column, and FCM Tokens
-- =================================================================

-- 1. Add FCM Token support to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- 2. Add Payment Status and Razorpay Tracking to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'PENDING';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;

-- 3. Create relational chats table
CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL,
    vendor_name VARCHAR(255) NOT NULL,
    vendor_title VARCHAR(255),
    vendor_image TEXT,
    category VARCHAR(100),
    price DECIMAL(10,2),
    provider_id UUID,
    last_message TEXT,
    timestamp VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, vendor_id)
);

-- 4. Create relational chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    sender VARCHAR(50) NOT NULL, -- 'user' or 'vendor'
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies

-- Drop policies if they exist to avoid conflict
DROP POLICY IF EXISTS "Allow users to CRUD their own chats" ON chats;
DROP POLICY IF EXISTS "Allow users to CRUD chat messages" ON chat_messages;

CREATE POLICY "Allow users to CRUD their own chats" ON chats
    FOR ALL USING (auth.uid() = user_id OR (user_id IS NOT NULL AND auth.role() = 'authenticated'));

CREATE POLICY "Allow users to CRUD chat messages" ON chat_messages
    FOR ALL USING (
        chat_id IN (
            SELECT id FROM chats WHERE user_id = auth.uid() OR auth.role() = 'authenticated'
        )
    );

-- 7. Configure Supabase Realtime for instant delivery
-- Enable Realtime by adding tables to publication if it's set up
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER publication supabase_realtime ADD TABLE chats;
        ALTER publication supabase_realtime ADD TABLE chat_messages;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not automatically add tables to supabase_realtime publication';
END $$;
