-- Create custom loop points table for premium user audio customization
-- Migration: 20240906000005_create_custom_loop_points.sql

-- Create user_custom_loop_points table
CREATE TABLE user_custom_loop_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sound_id TEXT NOT NULL,
    start_time DECIMAL(10,3) NOT NULL CHECK (start_time >= 0),
    end_time DECIMAL(10,3) NOT NULL CHECK (end_time > start_time),
    enabled BOOLEAN NOT NULL DEFAULT true,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure one loop point configuration per user per sound
    UNIQUE(user_id, sound_id)
);

-- Add indexes for performance
CREATE INDEX idx_user_custom_loop_points_user_id ON user_custom_loop_points(user_id);
CREATE INDEX idx_user_custom_loop_points_sound_id ON user_custom_loop_points(sound_id);
CREATE INDEX idx_user_custom_loop_points_updated_at ON user_custom_loop_points(updated_at);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_custom_loop_points_updated_at 
    BEFORE UPDATE ON user_custom_loop_points 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE user_custom_loop_points ENABLE ROW LEVEL SECURITY;

-- Users can only access their own loop points
CREATE POLICY "Users can view own loop points" 
    ON user_custom_loop_points 
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Users can insert their own loop points
CREATE POLICY "Users can insert own loop points" 
    ON user_custom_loop_points 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own loop points
CREATE POLICY "Users can update own loop points" 
    ON user_custom_loop_points 
    FOR UPDATE 
    USING (auth.uid() = user_id);

-- Users can delete their own loop points
CREATE POLICY "Users can delete own loop points" 
    ON user_custom_loop_points 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE user_custom_loop_points IS 'Custom audio loop points set by premium users for individual sounds';
COMMENT ON COLUMN user_custom_loop_points.user_id IS 'Reference to the user who owns this loop point configuration';
COMMENT ON COLUMN user_custom_loop_points.sound_id IS 'Identifier for the sound file (matches sound library)';
COMMENT ON COLUMN user_custom_loop_points.start_time IS 'Loop start time in seconds with millisecond precision';
COMMENT ON COLUMN user_custom_loop_points.end_time IS 'Loop end time in seconds with millisecond precision';
COMMENT ON COLUMN user_custom_loop_points.enabled IS 'Whether this custom loop configuration is active';
COMMENT ON COLUMN user_custom_loop_points.version IS 'Version number for conflict resolution during sync';

-- Insert some example data for testing (optional - remove in production)
-- These would be removed in a production migration
INSERT INTO user_custom_loop_points (user_id, sound_id, start_time, end_time, enabled, version) 
VALUES 
    -- Note: These are example UUIDs for testing. In real usage, these would reference actual user IDs
    ('00000000-0000-0000-0000-000000000001', 'rain-gentle', 5.0, 55.0, true, 1),
    ('00000000-0000-0000-0000-000000000001', 'ocean-waves', 10.0, 50.0, true, 1),
    ('00000000-0000-0000-0000-000000000001', 'forest-deep', 15.0, 45.0, true, 1)
ON CONFLICT (user_id, sound_id) DO NOTHING;