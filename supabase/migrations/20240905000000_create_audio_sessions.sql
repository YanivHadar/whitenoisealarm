-- ============================================================================
-- Audio Sessions Database Schema Migration
-- Phase 2.2: Audio Processing & White Noise Engine
-- 
-- Creates comprehensive database schema for audio session management,
-- real-time synchronization, performance monitoring, and sound library
-- management for the Alarm & White Noise app.
-- ============================================================================

-- Create custom enums for audio system
CREATE TYPE audio_session_type AS ENUM (
  'alarm',
  'white_noise',
  'preview',
  'sleep_session',
  'test',
  'background_continuous'
);

CREATE TYPE audio_session_state AS ENUM (
  'idle',
  'loading',
  'ready',
  'playing',
  'paused',
  'stopped',
  'ended',
  'error',
  'interrupted',
  'fading_in',
  'fading_out'
);

CREATE TYPE playback_mode AS ENUM (
  'continuous',
  'timed',
  'progressive',
  'alarm_integrated',
  'sleep_cycle',
  'focus_mode',
  'meditation',
  'nap_mode'
);

CREATE TYPE conflict_resolution_strategy AS ENUM (
  'last_write_wins',
  'manual',
  'merge'
);

-- ============================================================================
-- MAIN AUDIO SESSIONS TABLE
-- ============================================================================

CREATE TABLE audio_sessions (
  -- Core identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type audio_session_type NOT NULL,
  state audio_session_state NOT NULL DEFAULT 'idle',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ NULL,
  ended_at TIMESTAMPTZ NULL,
  
  -- Duration tracking
  duration_target INTEGER NULL, -- Target duration in seconds, NULL for infinite
  duration_actual INTEGER NULL, -- Actual playback duration in seconds
  progress_seconds INTEGER NOT NULL DEFAULT 0, -- Current progress in seconds
  progress_percentage DECIMAL(5,2) NULL, -- Progress as percentage (0.00-100.00)
  
  -- Session configuration (JSON fields for flexibility)
  sound_config JSONB NOT NULL DEFAULT '{}',
  volume_config JSONB NOT NULL DEFAULT '{}',
  fade_config JSONB NOT NULL DEFAULT '{}',
  loop_config JSONB NOT NULL DEFAULT '{}',
  routing_config JSONB NOT NULL DEFAULT '{}',
  session_config JSONB NOT NULL DEFAULT '{}', -- Mode, progression, integration settings
  
  -- Device and sync information
  device_id TEXT NOT NULL,
  device_name TEXT NOT NULL DEFAULT 'Unknown Device',
  sync_version INTEGER NOT NULL DEFAULT 1,
  last_heartbeat_at TIMESTAMPTZ NULL,
  
  -- Performance and monitoring
  performance_metrics JSONB NOT NULL DEFAULT '{}',
  
  -- Background processing flags
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_background BOOLEAN NOT NULL DEFAULT false,
  requires_background_processing BOOLEAN NOT NULL DEFAULT false,
  
  -- Indexing for performance
  CONSTRAINT audio_sessions_progress_check CHECK (progress_seconds >= 0),
  CONSTRAINT audio_sessions_progress_percentage_check CHECK (
    progress_percentage IS NULL OR (progress_percentage >= 0 AND progress_percentage <= 100)
  )
);

-- ============================================================================
-- SOUND LIBRARY MANAGEMENT
-- ============================================================================

CREATE TABLE sound_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category white_noise_category NOT NULL,
  subcategory TEXT NULL,
  
  -- File information
  file_url TEXT NOT NULL,
  local_path TEXT NULL, -- Cached file path
  preview_url TEXT NULL,
  
  -- Audio properties
  format TEXT NOT NULL DEFAULT 'mp3',
  duration INTEGER NULL, -- Duration in seconds, NULL for loopable
  sample_rate INTEGER NOT NULL DEFAULT 44100,
  bit_depth INTEGER NOT NULL DEFAULT 16,
  channels INTEGER NOT NULL DEFAULT 2,
  bitrate INTEGER NOT NULL DEFAULT 192,
  file_size_bytes BIGINT NULL,
  
  -- Metadata
  description TEXT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_premium BOOLEAN NOT NULL DEFAULT false,
  is_loopable BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  
  -- Loop configuration
  loop_start_point DECIMAL(8,3) NOT NULL DEFAULT 0.0, -- Start point in seconds
  loop_end_point DECIMAL(8,3) NULL, -- End point in seconds, NULL for file end
  
  -- Performance optimization
  preload_priority TEXT NOT NULL DEFAULT 'medium' CHECK (preload_priority IN ('low', 'medium', 'high')),
  cache_duration_hours INTEGER NOT NULL DEFAULT 24,
  download_count INTEGER NOT NULL DEFAULT 0,
  play_count INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ NULL,
  
  -- Indexing
  CONSTRAINT sound_library_url_unique UNIQUE (file_url),
  CONSTRAINT sound_library_duration_check CHECK (duration IS NULL OR duration > 0),
  CONSTRAINT sound_library_loop_points_check CHECK (
    loop_start_point >= 0 AND (loop_end_point IS NULL OR loop_end_point > loop_start_point)
  )
);

-- ============================================================================
-- SESSION ANALYTICS & PERFORMANCE
-- ============================================================================

CREATE TABLE session_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES audio_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Session completion data
  completed_successfully BOOLEAN NOT NULL DEFAULT false,
  completion_reason TEXT NULL, -- 'natural_end', 'user_stopped', 'alarm_fired', 'error', etc.
  completion_percentage DECIMAL(5,2) NULL,
  
  -- Performance metrics
  average_cpu_usage DECIMAL(5,2) NULL,
  peak_memory_usage INTEGER NULL, -- MB
  battery_usage_estimate DECIMAL(8,4) NULL, -- Percentage
  audio_dropouts INTEGER NOT NULL DEFAULT 0,
  buffer_underruns INTEGER NOT NULL DEFAULT 0,
  interruption_count INTEGER NOT NULL DEFAULT 0,
  recovery_count INTEGER NOT NULL DEFAULT 0,
  
  -- User engagement
  user_interactions INTEGER NOT NULL DEFAULT 0, -- Pause, resume, volume changes
  background_duration INTEGER NOT NULL DEFAULT 0, -- Seconds in background
  foreground_duration INTEGER NOT NULL DEFAULT 0, -- Seconds in foreground
  
  -- Quality metrics
  audio_quality_used TEXT NULL, -- 'low', 'medium', 'high', 'premium'
  network_usage_bytes BIGINT NULL,
  cache_hit_rate DECIMAL(5,2) NULL, -- Percentage of cached vs downloaded content
  
  -- Platform and device context
  platform TEXT NOT NULL, -- 'ios', 'android', 'web'
  device_model TEXT NULL,
  os_version TEXT NULL,
  app_version TEXT NOT NULL DEFAULT '1.0.0',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- SYNC CONFLICTS & RESOLUTION
-- ============================================================================

CREATE TABLE session_sync_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES audio_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Conflict details
  conflict_type TEXT NOT NULL, -- 'state_mismatch', 'progress_discrepancy', 'config_divergence'
  local_version INTEGER NOT NULL,
  remote_version INTEGER NOT NULL,
  
  -- Conflicting data
  local_data JSONB NOT NULL,
  remote_data JSONB NOT NULL,
  
  -- Resolution information
  resolution_strategy conflict_resolution_strategy NOT NULL DEFAULT 'last_write_wins',
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ NULL,
  resolution_data JSONB NULL,
  
  -- Device context
  local_device_id TEXT NOT NULL,
  remote_device_id TEXT NOT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT sync_conflicts_versions_different CHECK (local_version != remote_version)
);

-- ============================================================================
-- PERFORMANCE MONITORING
-- ============================================================================

CREATE TABLE audio_performance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES audio_sessions(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Performance metrics snapshot
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cpu_usage_percent DECIMAL(5,2) NOT NULL,
  memory_usage_mb INTEGER NOT NULL,
  memory_peak_mb INTEGER NOT NULL,
  battery_usage_rate DECIMAL(8,4) NOT NULL, -- Percentage per hour
  
  -- Audio quality metrics
  audio_dropouts INTEGER NOT NULL DEFAULT 0,
  buffer_underruns INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  jitter_ms INTEGER NOT NULL DEFAULT 0,
  
  -- Network and I/O
  network_bytes_downloaded BIGINT NOT NULL DEFAULT 0,
  download_speed_kbps INTEGER NULL,
  disk_io_bytes BIGINT NOT NULL DEFAULT 0,
  
  -- System context
  app_state TEXT NOT NULL DEFAULT 'active', -- 'active', 'background', 'inactive'
  system_memory_pressure TEXT NULL, -- 'normal', 'warning', 'critical'
  thermal_state TEXT NULL, -- 'nominal', 'fair', 'serious', 'critical'
  low_power_mode BOOLEAN NOT NULL DEFAULT false,
  
  -- Device context
  device_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  
  -- Partitioning hint for time-series data
  created_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- ============================================================================
-- USER PREFERENCES & SETTINGS
-- ============================================================================

CREATE TABLE audio_user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Audio preferences
  default_volume_config JSONB NOT NULL DEFAULT '{}',
  preferred_audio_quality TEXT NOT NULL DEFAULT 'high' CHECK (
    preferred_audio_quality IN ('low', 'medium', 'high', 'premium')
  ),
  auto_cache_sounds BOOLEAN NOT NULL DEFAULT true,
  max_cache_size_mb INTEGER NOT NULL DEFAULT 500,
  
  -- Background processing preferences
  battery_optimization_enabled BOOLEAN NOT NULL DEFAULT true,
  background_sync_enabled BOOLEAN NOT NULL DEFAULT true,
  sync_frequency_seconds INTEGER NOT NULL DEFAULT 30,
  
  -- Conflict resolution preferences
  default_conflict_resolution conflict_resolution_strategy NOT NULL DEFAULT 'last_write_wins',
  manual_resolution_timeout_seconds INTEGER NOT NULL DEFAULT 300,
  
  -- Privacy and data
  analytics_enabled BOOLEAN NOT NULL DEFAULT true,
  performance_monitoring_enabled BOOLEAN NOT NULL DEFAULT true,
  crash_reporting_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Device sync settings
  cross_device_sync_enabled BOOLEAN NOT NULL DEFAULT true,
  max_synced_devices INTEGER NOT NULL DEFAULT 5,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Audio sessions indexes
CREATE INDEX idx_audio_sessions_user_id ON audio_sessions(user_id);
CREATE INDEX idx_audio_sessions_state ON audio_sessions(state);
CREATE INDEX idx_audio_sessions_type ON audio_sessions(type);
CREATE INDEX idx_audio_sessions_active ON audio_sessions(is_active) WHERE is_active = true;
CREATE INDEX idx_audio_sessions_background ON audio_sessions(is_background) WHERE is_background = true;
CREATE INDEX idx_audio_sessions_created_at ON audio_sessions(created_at);
CREATE INDEX idx_audio_sessions_updated_at ON audio_sessions(updated_at);
CREATE INDEX idx_audio_sessions_device_id ON audio_sessions(device_id);
CREATE INDEX idx_audio_sessions_heartbeat ON audio_sessions(last_heartbeat_at) WHERE last_heartbeat_at IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX idx_audio_sessions_user_active ON audio_sessions(user_id, is_active, state);
CREATE INDEX idx_audio_sessions_user_type_state ON audio_sessions(user_id, type, state);
CREATE INDEX idx_audio_sessions_sync ON audio_sessions(user_id, device_id, sync_version);

-- Sound library indexes
CREATE INDEX idx_sound_library_category ON sound_library(category);
CREATE INDEX idx_sound_library_premium ON sound_library(is_premium);
CREATE INDEX idx_sound_library_featured ON sound_library(is_featured) WHERE is_featured = true;
CREATE INDEX idx_sound_library_tags ON sound_library USING GIN (tags);
CREATE INDEX idx_sound_library_play_count ON sound_library(play_count DESC);
CREATE INDEX idx_sound_library_last_accessed ON sound_library(last_accessed_at DESC NULLS LAST);

-- Analytics indexes
CREATE INDEX idx_session_analytics_session_id ON session_analytics(session_id);
CREATE INDEX idx_session_analytics_user_id ON session_analytics(user_id);
CREATE INDEX idx_session_analytics_created_at ON session_analytics(created_at);
CREATE INDEX idx_session_analytics_completion ON session_analytics(completed_successfully, completion_percentage);

-- Performance logs indexes (time-series optimization)
CREATE INDEX idx_audio_performance_logs_session_id ON audio_performance_logs(session_id);
CREATE INDEX idx_audio_performance_logs_user_id ON audio_performance_logs(user_id);
CREATE INDEX idx_audio_performance_logs_timestamp ON audio_performance_logs(timestamp DESC);
CREATE INDEX idx_audio_performance_logs_date ON audio_performance_logs(created_date);
CREATE INDEX idx_audio_performance_logs_device ON audio_performance_logs(device_id, timestamp DESC);

-- Conflict resolution indexes
CREATE INDEX idx_sync_conflicts_session_id ON session_sync_conflicts(session_id);
CREATE INDEX idx_sync_conflicts_user_id ON session_sync_conflicts(user_id);
CREATE INDEX idx_sync_conflicts_unresolved ON session_sync_conflicts(resolved) WHERE resolved = false;
CREATE INDEX idx_sync_conflicts_created_at ON session_sync_conflicts(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE audio_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sound_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_sync_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_performance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_user_preferences ENABLE ROW LEVEL SECURITY;

-- Audio sessions policies
CREATE POLICY "Users can manage their own audio sessions"
ON audio_sessions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Sound library policies (read-only for users, admin can manage)
CREATE POLICY "Anyone can read sound library"
ON sound_library
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage sound library"
ON sound_library
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data ->> 'role' = 'admin'
  )
);

-- Session analytics policies
CREATE POLICY "Users can read their own session analytics"
ON session_analytics
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System can create session analytics"
ON session_analytics
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Sync conflicts policies
CREATE POLICY "Users can manage their own sync conflicts"
ON session_sync_conflicts
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Performance logs policies
CREATE POLICY "Users can read their own performance logs"
ON audio_performance_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System can create performance logs"
ON audio_performance_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- User preferences policies
CREATE POLICY "Users can manage their own preferences"
ON audio_user_preferences
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Update timestamps automatically
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp triggers
CREATE TRIGGER audio_sessions_updated_at
  BEFORE UPDATE ON audio_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER sound_library_updated_at
  BEFORE UPDATE ON sound_library
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER audio_user_preferences_updated_at
  BEFORE UPDATE ON audio_user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- FUNCTIONS FOR AUDIO SESSION MANAGEMENT
-- ============================================================================

-- Function to calculate session progress percentage
CREATE OR REPLACE FUNCTION calculate_session_progress(
  p_session_id UUID,
  p_current_seconds INTEGER
)
RETURNS DECIMAL(5,2)
LANGUAGE plpgsql
AS $$
DECLARE
  v_duration_target INTEGER;
  v_percentage DECIMAL(5,2);
BEGIN
  SELECT duration_target INTO v_duration_target
  FROM audio_sessions
  WHERE id = p_session_id;
  
  IF v_duration_target IS NULL OR v_duration_target = 0 THEN
    RETURN NULL;
  END IF;
  
  v_percentage := (p_current_seconds::DECIMAL / v_duration_target::DECIMAL) * 100;
  
  -- Ensure percentage doesn't exceed 100%
  IF v_percentage > 100 THEN
    v_percentage := 100;
  END IF;
  
  RETURN ROUND(v_percentage, 2);
END;
$$;

-- Function to update session progress with automatic percentage calculation
CREATE OR REPLACE FUNCTION update_session_progress(
  p_session_id UUID,
  p_progress_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_percentage DECIMAL(5,2);
BEGIN
  -- Calculate percentage
  v_percentage := calculate_session_progress(p_session_id, p_progress_seconds);
  
  -- Update session
  UPDATE audio_sessions
  SET 
    progress_seconds = p_progress_seconds,
    progress_percentage = v_percentage,
    updated_at = NOW(),
    last_heartbeat_at = NOW()
  WHERE id = p_session_id;
  
  RETURN FOUND;
END;
$$;

-- Function to cleanup old performance logs (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_performance_logs(
  p_days_to_keep INTEGER DEFAULT 30
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM audio_performance_logs
  WHERE created_date < CURRENT_DATE - INTERVAL '1 day' * p_days_to_keep;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- Function to get active session summary for user
CREATE OR REPLACE FUNCTION get_user_active_sessions_summary(
  p_user_id UUID
)
RETURNS TABLE (
  total_active INTEGER,
  playing_count INTEGER,
  paused_count INTEGER,
  background_count INTEGER,
  total_duration_minutes INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER AS total_active,
    COUNT(*) FILTER (WHERE state = 'playing')::INTEGER AS playing_count,
    COUNT(*) FILTER (WHERE state = 'paused')::INTEGER AS paused_count,
    COUNT(*) FILTER (WHERE is_background = true)::INTEGER AS background_count,
    COALESCE(SUM(
      CASE 
        WHEN duration_target IS NOT NULL THEN duration_target / 60
        ELSE 0
      END
    ), 0)::INTEGER AS total_duration_minutes
  FROM audio_sessions
  WHERE user_id = p_user_id 
    AND is_active = true;
END;
$$;

-- ============================================================================
-- INITIAL DATA SETUP
-- ============================================================================

-- Insert default sound library entries
INSERT INTO sound_library (name, category, subcategory, file_url, format, duration, is_premium, is_featured, tags) VALUES
-- Nature sounds
('Rain (Heavy)', 'nature', 'rain', 'https://example.com/sounds/rain_heavy.mp3', 'mp3', NULL, false, true, ARRAY['rain', 'storm', 'heavy']),
('Rain (Gentle)', 'nature', 'rain', 'https://example.com/sounds/rain_gentle.mp3', 'mp3', NULL, false, true, ARRAY['rain', 'gentle', 'light']),
('Ocean Waves', 'nature', 'ocean', 'https://example.com/sounds/ocean_waves.mp3', 'mp3', NULL, false, true, ARRAY['ocean', 'waves', 'beach']),
('Forest Ambience', 'nature', 'forest', 'https://example.com/sounds/forest_ambience.mp3', 'mp3', NULL, true, false, ARRAY['forest', 'birds', 'nature']),
('Thunderstorm', 'nature', 'thunderstorm', 'https://example.com/sounds/thunderstorm.mp3', 'mp3', NULL, true, false, ARRAY['thunder', 'storm', 'rain']),

-- Ambient sounds
('White Noise (Classic)', 'ambient', 'white_noise', 'https://example.com/sounds/white_noise_classic.mp3', 'mp3', NULL, false, true, ARRAY['white_noise', 'static', 'focus']),
('Brown Noise', 'ambient', 'brown_noise', 'https://example.com/sounds/brown_noise.mp3', 'mp3', NULL, false, true, ARRAY['brown_noise', 'deep', 'bass']),
('Pink Noise', 'ambient', 'pink_noise', 'https://example.com/sounds/pink_noise.mp3', 'mp3', NULL, true, false, ARRAY['pink_noise', 'balanced', 'sleep']),

-- Mechanical sounds
('Fan (Medium Speed)', 'mechanical', 'fan', 'https://example.com/sounds/fan_medium.mp3', 'mp3', NULL, false, true, ARRAY['fan', 'medium', 'air']),
('Air Conditioner', 'mechanical', 'air_conditioner', 'https://example.com/sounds/ac_unit.mp3', 'mp3', NULL, true, false, ARRAY['ac', 'cooling', 'hum']),

-- Binaural beats (premium)
('Focus (40Hz)', 'binaural', 'focus', 'https://example.com/sounds/binaural_focus_40hz.mp3', 'mp3', NULL, true, false, ARRAY['binaural', 'focus', '40hz', 'gamma']),
('Relaxation (10Hz)', 'binaural', 'relaxation', 'https://example.com/sounds/binaural_relax_10hz.mp3', 'mp3', NULL, true, false, ARRAY['binaural', 'relaxation', '10hz', 'alpha']),
('Deep Sleep (2Hz)', 'binaural', 'sleep', 'https://example.com/sounds/binaural_sleep_2hz.mp3', 'mp3', NULL, true, false, ARRAY['binaural', 'sleep', '2hz', 'delta']);

-- Update sound counts in categories
UPDATE sound_library SET download_count = floor(random() * 1000), play_count = floor(random() * 5000);

-- ============================================================================
-- PERFORMANCE OPTIMIZATION
-- ============================================================================

-- Analyze tables for query optimization
ANALYZE audio_sessions;
ANALYZE sound_library;
ANALYZE session_analytics;
ANALYZE audio_performance_logs;

-- Create a view for active sessions with common joins
CREATE VIEW active_audio_sessions AS
SELECT 
  s.*,
  u.email as user_email,
  CASE 
    WHEN s.duration_target IS NOT NULL THEN
      ROUND(((s.progress_seconds::DECIMAL / s.duration_target::DECIMAL) * 100), 2)
    ELSE NULL
  END as calculated_progress_percentage,
  CASE
    WHEN s.started_at IS NOT NULL THEN
      EXTRACT(EPOCH FROM (NOW() - s.started_at))::INTEGER
    ELSE NULL
  END as elapsed_seconds
FROM audio_sessions s
JOIN auth.users u ON s.user_id = u.id
WHERE s.is_active = true;

-- Grant permissions on the view
GRANT SELECT ON active_audio_sessions TO authenticated;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE audio_sessions IS 'Main table storing audio session state and configuration for white noise and alarm audio playback';
COMMENT ON TABLE sound_library IS 'Centralized sound library with metadata for white noise and alarm sounds';
COMMENT ON TABLE session_analytics IS 'Analytics data for completed audio sessions including performance and user engagement metrics';
COMMENT ON TABLE session_sync_conflicts IS 'Conflict resolution data for cross-device session synchronization';
COMMENT ON TABLE audio_performance_logs IS 'Time-series performance monitoring data for audio playback optimization';
COMMENT ON TABLE audio_user_preferences IS 'User-specific preferences for audio playback, sync, and privacy settings';

COMMENT ON COLUMN audio_sessions.sound_config IS 'JSON configuration for primary and secondary sounds, format, quality, and caching';
COMMENT ON COLUMN audio_sessions.volume_config IS 'JSON configuration for volume levels, balance, bass/treble, and volume curves';
COMMENT ON COLUMN audio_sessions.fade_config IS 'JSON configuration for fade in/out effects and cross-fade transitions';
COMMENT ON COLUMN audio_sessions.loop_config IS 'JSON configuration for loop behavior, count, duration, and custom loop points';
COMMENT ON COLUMN audio_sessions.routing_config IS 'JSON configuration for audio output routing, device selection, and interruption handling';
COMMENT ON COLUMN audio_sessions.session_config IS 'JSON configuration for playback mode, progression, alarm integration, and sleep optimization';

-- ============================================================================
-- COMPLETION NOTIFICATION
-- ============================================================================

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'Audio Sessions Database Schema Migration Completed Successfully';
  RAISE NOTICE 'Created % tables with comprehensive indexing and RLS policies', (
    SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('audio_sessions', 'sound_library', 'session_analytics', 'session_sync_conflicts', 'audio_performance_logs', 'audio_user_preferences')
  );
END;
$$;