-- Alarm & White Noise App Database Schema
-- Initial database setup with all tables, enums, and constraints
-- Optimized for privacy, performance, and real-time functionality

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create custom enums
CREATE TYPE audio_output AS ENUM ('speaker', 'headphones', 'auto');
CREATE TYPE repeat_pattern AS ENUM ('none', 'daily', 'weekdays', 'weekends', 'custom');
CREATE TYPE session_status AS ENUM ('active', 'paused', 'completed', 'cancelled');
CREATE TYPE white_noise_category AS ENUM ('nature', 'ambient', 'mechanical', 'binaural', 'custom');
CREATE TYPE subscription_status AS ENUM ('free', 'premium', 'trial');
CREATE TYPE theme_preference AS ENUM ('light', 'dark', 'auto');

-- Users table - extends auth.users with app-specific data
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  subscription_status subscription_status DEFAULT 'free' NOT NULL,
  subscription_expires_at TIMESTAMPTZ,
  timezone TEXT DEFAULT 'UTC' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_seen_at TIMESTAMPTZ,
  is_premium BOOLEAN DEFAULT FALSE NOT NULL,
  
  -- Constraints
  CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$'),
  CONSTRAINT users_timezone_length CHECK (LENGTH(timezone) <= 50),
  CONSTRAINT users_subscription_logic CHECK (
    (subscription_status = 'free' AND subscription_expires_at IS NULL) OR
    (subscription_status IN ('premium', 'trial') AND subscription_expires_at IS NOT NULL)
  )
);

-- Alarms table - core alarm configuration
CREATE TABLE alarms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  time TIME NOT NULL, -- 24-hour format
  enabled BOOLEAN DEFAULT TRUE NOT NULL,
  repeat_pattern repeat_pattern DEFAULT 'none' NOT NULL,
  repeat_days INTEGER[] CHECK (
    repeat_days IS NULL OR 
    (array_length(repeat_days, 1) <= 7 AND 
     repeat_days <@ ARRAY[0,1,2,3,4,5,6])
  ), -- 0=Sunday, 6=Saturday
  
  -- Audio settings
  audio_file_url TEXT,
  audio_output audio_output DEFAULT 'auto' NOT NULL,
  volume NUMERIC(3,2) DEFAULT 0.7 NOT NULL CHECK (volume >= 0.0 AND volume <= 1.0),
  
  -- Alarm behavior
  vibration_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  snooze_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  snooze_duration INTEGER DEFAULT 5 NOT NULL CHECK (snooze_duration > 0 AND snooze_duration <= 60),
  snooze_count_limit INTEGER DEFAULT 3 NOT NULL CHECK (snooze_count_limit > 0 AND snooze_count_limit <= 10),
  
  -- White noise integration
  white_noise_enabled BOOLEAN DEFAULT FALSE NOT NULL,
  white_noise_file_url TEXT,
  white_noise_category white_noise_category,
  white_noise_volume NUMERIC(3,2) DEFAULT 0.5 NOT NULL CHECK (white_noise_volume >= 0.0 AND white_noise_volume <= 1.0),
  white_noise_duration INTEGER CHECK (white_noise_duration IS NULL OR white_noise_duration > 0), -- minutes, NULL for continuous
  
  -- Audio effects
  fade_in_duration INTEGER DEFAULT 0 NOT NULL CHECK (fade_in_duration >= 0 AND fade_in_duration <= 300), -- seconds
  fade_out_duration INTEGER DEFAULT 0 NOT NULL CHECK (fade_out_duration >= 0 AND fade_out_duration <= 300), -- seconds
  
  -- Premium features
  is_premium_feature BOOLEAN DEFAULT FALSE NOT NULL,
  
  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_triggered_at TIMESTAMPTZ,
  next_trigger_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT alarms_name_length CHECK (LENGTH(name) >= 1 AND LENGTH(name) <= 100),
  CONSTRAINT alarms_repeat_pattern_days CHECK (
    (repeat_pattern = 'custom' AND repeat_days IS NOT NULL AND array_length(repeat_days, 1) > 0) OR
    (repeat_pattern != 'custom')
  ),
  CONSTRAINT alarms_white_noise_logic CHECK (
    (NOT white_noise_enabled) OR 
    (white_noise_enabled AND (white_noise_file_url IS NOT NULL OR white_noise_category IS NOT NULL))
  ),
  CONSTRAINT alarms_audio_url_format CHECK (
    audio_file_url IS NULL OR 
    audio_file_url ~* '^https?://[^\s/$.?#].[^\s]*$'
  ),
  CONSTRAINT alarms_white_noise_url_format CHECK (
    white_noise_file_url IS NULL OR 
    white_noise_file_url ~* '^https?://[^\s/$.?#].[^\s]*$'
  )
);

-- Active sessions table - track current alarm/white noise playback
CREATE TABLE active_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alarm_id UUID REFERENCES alarms(id) ON DELETE SET NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('alarm', 'white_noise', 'combined')),
  status session_status DEFAULT 'active' NOT NULL,
  
  -- Session timing
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER CHECK (duration_seconds >= 0),
  
  -- Audio configuration
  audio_file_url TEXT,
  volume NUMERIC(3,2) DEFAULT 0.7 NOT NULL CHECK (volume >= 0.0 AND volume <= 1.0),
  white_noise_enabled BOOLEAN DEFAULT FALSE NOT NULL,
  white_noise_file_url TEXT,
  white_noise_volume NUMERIC(3,2) DEFAULT 0.5 NOT NULL CHECK (white_noise_volume >= 0.0 AND white_noise_volume <= 1.0),
  
  -- Progress tracking
  progress_percentage NUMERIC(5,2) DEFAULT 0.0 NOT NULL CHECK (progress_percentage >= 0.0 AND progress_percentage <= 100.0),
  
  -- Additional metadata (JSON for flexibility)
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT active_sessions_timing CHECK (
    (status = 'active' AND ended_at IS NULL) OR
    (status IN ('completed', 'cancelled', 'paused') AND (ended_at IS NULL OR ended_at >= started_at))
  ),
  CONSTRAINT active_sessions_duration CHECK (
    (ended_at IS NULL AND duration_seconds IS NULL) OR
    (ended_at IS NOT NULL AND duration_seconds IS NOT NULL)
  )
);

-- User preferences table - app settings and preferences
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  
  -- Default audio settings
  default_audio_output audio_output DEFAULT 'auto' NOT NULL,
  default_volume NUMERIC(3,2) DEFAULT 0.7 NOT NULL CHECK (default_volume >= 0.0 AND default_volume <= 1.0),
  default_white_noise_volume NUMERIC(3,2) DEFAULT 0.5 NOT NULL CHECK (default_white_noise_volume >= 0.0 AND default_white_noise_volume <= 1.0),
  
  -- Default alarm settings
  default_snooze_duration INTEGER DEFAULT 5 NOT NULL CHECK (default_snooze_duration > 0 AND default_snooze_duration <= 60),
  default_fade_in_duration INTEGER DEFAULT 0 NOT NULL CHECK (default_fade_in_duration >= 0 AND default_fade_in_duration <= 300),
  default_fade_out_duration INTEGER DEFAULT 0 NOT NULL CHECK (default_fade_out_duration >= 0 AND default_fade_out_duration <= 300),
  
  -- Notification settings
  notifications_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  do_not_disturb_enabled BOOLEAN DEFAULT FALSE NOT NULL,
  do_not_disturb_start TIME, -- 24-hour format
  do_not_disturb_end TIME, -- 24-hour format
  
  -- App preferences
  theme theme_preference DEFAULT 'auto' NOT NULL,
  language CHAR(2) DEFAULT 'en' NOT NULL CHECK (LENGTH(language) = 2),
  
  -- Performance settings
  battery_optimization_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  
  -- Privacy settings
  analytics_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  crash_reporting_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  
  -- Onboarding
  premium_features_intro_shown BOOLEAN DEFAULT FALSE NOT NULL,
  onboarding_completed BOOLEAN DEFAULT FALSE NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT user_preferences_dnd_logic CHECK (
    (NOT do_not_disturb_enabled) OR
    (do_not_disturb_enabled AND do_not_disturb_start IS NOT NULL AND do_not_disturb_end IS NOT NULL)
  )
);

-- Indexes for performance optimization
-- User lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_subscription_status ON users(subscription_status) WHERE subscription_status != 'free';
CREATE INDEX idx_users_last_seen ON users(last_seen_at) WHERE last_seen_at IS NOT NULL;

-- Alarm queries (most critical for performance)
CREATE INDEX idx_alarms_user_enabled ON alarms(user_id, enabled) WHERE enabled = TRUE;
CREATE INDEX idx_alarms_next_trigger ON alarms(next_trigger_at) WHERE next_trigger_at IS NOT NULL AND enabled = TRUE;
CREATE INDEX idx_alarms_user_updated ON alarms(user_id, updated_at);
CREATE INDEX idx_alarms_premium ON alarms(is_premium_feature) WHERE is_premium_feature = TRUE;

-- Session queries
CREATE INDEX idx_active_sessions_user_status ON active_sessions(user_id, status);
CREATE INDEX idx_active_sessions_alarm ON active_sessions(alarm_id) WHERE alarm_id IS NOT NULL;
CREATE INDEX idx_active_sessions_started ON active_sessions(started_at);
CREATE UNIQUE INDEX idx_active_sessions_user_active ON active_sessions(user_id) 
  WHERE status = 'active'; -- Only one active session per user

-- User preferences
CREATE UNIQUE INDEX idx_user_preferences_user ON user_preferences(user_id);

-- Composite indexes for common queries
CREATE INDEX idx_alarms_user_time_enabled ON alarms(user_id, time, enabled);
CREATE INDEX idx_active_sessions_user_type_status ON active_sessions(user_id, session_type, status);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic timestamp updates
CREATE TRIGGER tr_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_alarms_updated_at
  BEFORE UPDATE ON alarms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_active_sessions_updated_at
  BEFORE UPDATE ON active_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Function to calculate next alarm trigger time
CREATE OR REPLACE FUNCTION calculate_next_trigger(
  alarm_time TIME,
  repeat_pattern repeat_pattern,
  repeat_days INTEGER[],
  current_tz TEXT DEFAULT 'UTC'
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  base_datetime TIMESTAMPTZ;
  next_datetime TIMESTAMPTZ;
  current_day INTEGER;
  target_day INTEGER;
  days_ahead INTEGER;
BEGIN
  -- Get current time in user's timezone
  base_datetime = NOW() AT TIME ZONE current_tz;
  
  -- Start with today at the alarm time
  next_datetime = (CURRENT_DATE AT TIME ZONE current_tz) + alarm_time;
  
  -- If alarm time has passed today, start with tomorrow
  IF next_datetime <= base_datetime THEN
    next_datetime = next_datetime + INTERVAL '1 day';
  END IF;
  
  -- Handle repeat patterns
  IF repeat_pattern = 'none' THEN
    -- One-time alarm - return the calculated next occurrence
    RETURN next_datetime AT TIME ZONE current_tz;
    
  ELSIF repeat_pattern = 'daily' THEN
    -- Daily alarm - return the calculated next occurrence
    RETURN next_datetime AT TIME ZONE current_tz;
    
  ELSIF repeat_pattern = 'weekdays' THEN
    -- Monday to Friday (1-5)
    current_day = EXTRACT(DOW FROM next_datetime);
    
    -- If it's weekend, move to Monday
    IF current_day = 0 THEN -- Sunday
      next_datetime = next_datetime + INTERVAL '1 day';
    ELSIF current_day = 6 THEN -- Saturday  
      next_datetime = next_datetime + INTERVAL '2 days';
    END IF;
    
    RETURN next_datetime AT TIME ZONE current_tz;
    
  ELSIF repeat_pattern = 'weekends' THEN
    -- Saturday and Sunday (0, 6)
    current_day = EXTRACT(DOW FROM next_datetime);
    
    -- If it's weekday, move to Saturday
    IF current_day BETWEEN 1 AND 5 THEN
      days_ahead = 6 - current_day;
      next_datetime = next_datetime + (days_ahead || ' days')::INTERVAL;
    END IF;
    
    RETURN next_datetime AT TIME ZONE current_tz;
    
  ELSIF repeat_pattern = 'custom' AND repeat_days IS NOT NULL THEN
    -- Custom days
    current_day = EXTRACT(DOW FROM next_datetime);
    
    -- Find the next matching day
    FOR i IN 0..6 LOOP
      target_day = (current_day + i) % 7;
      IF target_day = ANY(repeat_days) THEN
        next_datetime = next_datetime + (i || ' days')::INTERVAL;
        EXIT;
      END IF;
    END LOOP;
    
    RETURN next_datetime AT TIME ZONE current_tz;
  END IF;
  
  -- Fallback
  RETURN next_datetime AT TIME ZONE current_tz;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to automatically update next_trigger_at when alarm is modified
CREATE OR REPLACE FUNCTION update_alarm_next_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.enabled THEN
    -- Calculate next trigger time using user's timezone
    SELECT timezone INTO NEW.next_trigger_at 
    FROM users WHERE id = NEW.user_id;
    
    NEW.next_trigger_at = calculate_next_trigger(
      NEW.time,
      NEW.repeat_pattern,
      NEW.repeat_days,
      COALESCE((SELECT timezone FROM users WHERE id = NEW.user_id), 'UTC')
    );
  ELSE
    NEW.next_trigger_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_alarms_next_trigger
  BEFORE INSERT OR UPDATE ON alarms
  FOR EACH ROW
  EXECUTE FUNCTION update_alarm_next_trigger();

-- Comments for documentation
COMMENT ON TABLE users IS 'User accounts with subscription and preference data';
COMMENT ON TABLE alarms IS 'User alarm configurations with scheduling and audio settings';
COMMENT ON TABLE active_sessions IS 'Currently active alarm or white noise playback sessions';
COMMENT ON TABLE user_preferences IS 'User app preferences and default settings';

COMMENT ON FUNCTION calculate_next_trigger IS 'Calculates the next trigger time for an alarm based on its schedule';
COMMENT ON FUNCTION update_alarm_next_trigger IS 'Automatically updates next_trigger_at when alarm is modified';