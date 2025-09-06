-- ============================================================================
-- Complete Database Schema Recreation for Alarm & White Noise App
-- Phase 1.2: Supabase Backend Foundation - Complete Implementation
-- 
-- Recreates all database tables, enums, RLS policies, indexes, and functions
-- from scratch based on Phase 1.2 requirements in roadmap.md
-- ============================================================================

-- ============================================================================
-- 1. ENABLE REQUIRED EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 2. CREATE CUSTOM ENUMS
-- ============================================================================

-- Audio output routing options
CREATE TYPE audio_output AS ENUM (
  'speaker',
  'headphones', 
  'auto'
);

-- Repeat pattern options for alarms
CREATE TYPE repeat_pattern AS ENUM (
  'none',
  'daily',
  'weekdays',
  'weekends',
  'custom'
);

-- Session status for active sessions
CREATE TYPE session_status AS ENUM (
  'active',
  'paused',
  'completed',
  'cancelled'
);

-- White noise sound categories
CREATE TYPE white_noise_category AS ENUM (
  'nature',
  'ambient', 
  'mechanical',
  'binaural',
  'custom'
);

-- ============================================================================
-- 3. CREATE CORE TABLES
-- ============================================================================

-- Users table with authentication fields
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Profile information
  first_name TEXT,
  last_name TEXT,
  timezone TEXT DEFAULT 'UTC',
  
  -- Subscription status
  subscription_status TEXT DEFAULT 'free',
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  is_premium BOOLEAN DEFAULT FALSE,
  
  -- App settings
  onboarding_completed BOOLEAN DEFAULT FALSE,
  biometric_enabled BOOLEAN DEFAULT FALSE,
  push_notifications_enabled BOOLEAN DEFAULT TRUE,
  
  -- Audit fields
  last_login_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Alarms table with all configuration options
CREATE TABLE alarms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Basic alarm info
  name TEXT NOT NULL,
  time TIME NOT NULL,
  enabled BOOLEAN DEFAULT true,
  
  -- Repeat configuration
  repeat_pattern repeat_pattern DEFAULT 'none',
  repeat_days INTEGER[], -- 0-6 (Sunday-Saturday) for custom patterns
  timezone TEXT DEFAULT 'UTC',
  
  -- Audio configuration  
  alarm_sound TEXT DEFAULT 'default',
  volume DECIMAL(3,2) DEFAULT 0.8 CHECK (volume >= 0.0 AND volume <= 1.0),
  fade_in_duration INTEGER DEFAULT 30, -- seconds
  
  -- White noise integration
  white_noise_enabled BOOLEAN DEFAULT false,
  white_noise_sound TEXT,
  white_noise_volume DECIMAL(3,2) DEFAULT 0.5 CHECK (white_noise_volume >= 0.0 AND white_noise_volume <= 1.0),
  
  -- Advanced features
  vibration_enabled BOOLEAN DEFAULT true,
  snooze_enabled BOOLEAN DEFAULT true,
  snooze_duration INTEGER DEFAULT 9, -- minutes
  snooze_count_limit INTEGER DEFAULT 3,
  auto_dismiss_duration INTEGER DEFAULT 300, -- seconds (5 minutes)
  audio_output audio_output DEFAULT 'auto',
  
  -- Do Not Disturb integration
  dnd_override BOOLEAN DEFAULT false,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Active sessions for real-time tracking
CREATE TABLE active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  alarm_id UUID REFERENCES alarms(id) ON DELETE CASCADE,
  
  -- Session details
  session_type TEXT NOT NULL CHECK (session_type IN ('alarm', 'white_noise', 'preview')),
  status session_status DEFAULT 'active',
  
  -- Timing information
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scheduled_end_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  
  -- Progress tracking
  progress_seconds INTEGER DEFAULT 0,
  total_duration_seconds INTEGER,
  progress_percentage DECIMAL(5,2) DEFAULT 0.0,
  
  -- Audio settings during session
  current_volume DECIMAL(3,2) DEFAULT 0.8,
  white_noise_volume DECIMAL(3,2) DEFAULT 0.5,
  
  -- Session metadata
  device_info JSONB,
  battery_level INTEGER,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences for app settings
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  
  -- Default alarm settings
  default_alarm_volume DECIMAL(3,2) DEFAULT 0.8,
  default_white_noise_volume DECIMAL(3,2) DEFAULT 0.5,
  default_snooze_duration INTEGER DEFAULT 9,
  default_audio_output audio_output DEFAULT 'auto',
  
  -- App preferences
  dark_mode_enabled BOOLEAN DEFAULT TRUE,
  haptic_feedback_enabled BOOLEAN DEFAULT TRUE,
  sound_preview_enabled BOOLEAN DEFAULT TRUE,
  
  -- Notification preferences
  notification_sound TEXT DEFAULT 'default',
  notification_vibration BOOLEAN DEFAULT TRUE,
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  
  -- Sleep tracking preferences
  bedtime_reminder_enabled BOOLEAN DEFAULT FALSE,
  bedtime_reminder_time TIME,
  wake_up_light_enabled BOOLEAN DEFAULT FALSE,
  
  -- Premium preferences
  preferred_white_noise_category white_noise_category DEFAULT 'nature',
  custom_sounds_enabled BOOLEAN DEFAULT FALSE,
  
  -- Analytics preferences
  usage_analytics_enabled BOOLEAN DEFAULT TRUE,
  crash_reporting_enabled BOOLEAN DEFAULT TRUE,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_subscription_status ON users(subscription_status);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Alarms table indexes  
CREATE INDEX idx_alarms_user_id ON alarms(user_id);
CREATE INDEX idx_alarms_enabled ON alarms(enabled);
CREATE INDEX idx_alarms_time ON alarms(time);
CREATE INDEX idx_alarms_repeat_pattern ON alarms(repeat_pattern);
CREATE INDEX idx_alarms_user_enabled ON alarms(user_id, enabled);

-- Active sessions indexes
CREATE INDEX idx_active_sessions_user_id ON active_sessions(user_id);
CREATE INDEX idx_active_sessions_alarm_id ON active_sessions(alarm_id);
CREATE INDEX idx_active_sessions_status ON active_sessions(status);
CREATE INDEX idx_active_sessions_started_at ON active_sessions(started_at);
CREATE INDEX idx_active_sessions_user_status ON active_sessions(user_id, status);

-- User preferences indexes
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- ============================================================================
-- 5. CREATE ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE alarms ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Alarms policies
CREATE POLICY "Users can view own alarms" ON alarms FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own alarms" ON alarms FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alarms" ON alarms FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own alarms" ON alarms FOR DELETE USING (auth.uid() = user_id);

-- Active sessions policies
CREATE POLICY "Users can view own sessions" ON active_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON active_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON active_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions" ON active_sessions FOR DELETE USING (auth.uid() = user_id);

-- User preferences policies
CREATE POLICY "Users can view own preferences" ON user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own preferences" ON user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON user_preferences FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- 6. CREATE UTILITY FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at fields
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alarms_updated_at BEFORE UPDATE ON alarms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_active_sessions_updated_at BEFORE UPDATE ON active_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create default user preferences when user is created
CREATE OR REPLACE FUNCTION create_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_preferences (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically create user preferences
CREATE TRIGGER create_user_preferences_trigger
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION create_user_preferences();

-- Function to calculate session progress percentage
CREATE OR REPLACE FUNCTION calculate_session_progress(
  session_id UUID
) RETURNS DECIMAL AS $$
DECLARE
  session_record active_sessions%ROWTYPE;
  progress_percentage DECIMAL;
BEGIN
  SELECT * INTO session_record FROM active_sessions WHERE id = session_id;
  
  IF session_record.total_duration_seconds IS NULL OR session_record.total_duration_seconds = 0 THEN
    RETURN 0.0;
  END IF;
  
  progress_percentage := (session_record.progress_seconds::DECIMAL / session_record.total_duration_seconds::DECIMAL) * 100.0;
  
  -- Ensure percentage doesn't exceed 100%
  IF progress_percentage > 100.0 THEN
    progress_percentage := 100.0;
  END IF;
  
  RETURN progress_percentage;
END;
$$ LANGUAGE plpgsql;

-- Function to get active alarms for a user
CREATE OR REPLACE FUNCTION get_active_alarms(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  time TIME,
  repeat_pattern repeat_pattern,
  repeat_days INTEGER[],
  next_scheduled_time TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    a.time,
    a.repeat_pattern,
    a.repeat_days,
    -- Calculate next scheduled time based on repeat pattern
    CASE 
      WHEN a.repeat_pattern = 'none' THEN NULL
      WHEN a.repeat_pattern = 'daily' THEN 
        CASE 
          WHEN CURRENT_TIME <= a.time THEN CURRENT_DATE + a.time
          ELSE CURRENT_DATE + INTERVAL '1 day' + a.time
        END
      ELSE CURRENT_DATE + a.time -- Simplified for other patterns
    END as next_scheduled_time
  FROM alarms a
  WHERE a.user_id = user_uuid 
    AND a.enabled = true
    AND a.deleted_at IS NULL
  ORDER BY a.time;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. CREATE REAL-TIME SUBSCRIPTIONS SETUP
-- ============================================================================

-- Enable real-time for critical tables
ALTER PUBLICATION supabase_realtime ADD TABLE alarms;
ALTER PUBLICATION supabase_realtime ADD TABLE active_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE user_preferences;

-- ============================================================================
-- 8. INSERT INITIAL DATA (Optional)
-- ============================================================================

-- Default alarm sounds (can be referenced by alarm_sound field)
CREATE TABLE IF NOT EXISTS alarm_sounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  filename TEXT NOT NULL,
  category TEXT DEFAULT 'default',
  is_premium BOOLEAN DEFAULT FALSE,
  duration_seconds INTEGER,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Default white noise sounds
CREATE TABLE IF NOT EXISTS white_noise_sounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  filename TEXT NOT NULL,
  category white_noise_category DEFAULT 'nature',
  is_premium BOOLEAN DEFAULT FALSE,
  duration_seconds INTEGER,
  description TEXT,
  loop_friendly BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default alarm sounds
INSERT INTO alarm_sounds (name, filename, category, is_premium, description) VALUES
('Default Alarm', 'default_alarm.mp3', 'default', false, 'Classic alarm sound'),
('Gentle Wake', 'gentle_wake.mp3', 'gentle', false, 'Soft progressive alarm'),
('Nature Birds', 'nature_birds.mp3', 'nature', false, 'Gentle bird sounds');

-- Insert default white noise sounds  
INSERT INTO white_noise_sounds (name, filename, category, is_premium, description) VALUES
('Rain Sounds', 'rain.mp3', 'nature', false, 'Peaceful rainfall'),
('Ocean Waves', 'ocean_waves.mp3', 'nature', false, 'Calming ocean sounds'),
('White Noise', 'white_noise.mp3', 'mechanical', false, 'Classic white noise');

-- ============================================================================
-- SCHEMA CREATION COMPLETE
-- ============================================================================

-- Verify schema creation with a summary query
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'alarms', 'active_sessions', 'user_preferences', 'alarm_sounds', 'white_noise_sounds')
ORDER BY tablename;

-- Show created enums
SELECT 
  n.nspname AS schema_name,
  t.typname AS enum_name,
  e.enumlabel AS enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
ORDER BY t.typname, e.enumsortorder;