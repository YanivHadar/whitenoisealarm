-- Row Level Security (RLS) Policies for Alarm & White Noise App
-- Implements privacy-grade security ensuring users can only access their own data
-- Includes policies for premium features and subscription-based access control

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE alarms ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Users can view their own profile
CREATE POLICY "users_select_own" ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (during signup)
CREATE POLICY "users_insert_own" ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Prevent users from deleting their own profile (handled by auth.users cascade)
-- Users table deletion is managed by Supabase Auth

-- ============================================================================
-- ALARMS TABLE POLICIES
-- ============================================================================

-- Users can view their own alarms
CREATE POLICY "alarms_select_own" ON alarms
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own alarms
CREATE POLICY "alarms_insert_own" ON alarms
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    -- Check premium feature access
    (NOT is_premium_feature OR 
     EXISTS (
       SELECT 1 FROM users 
       WHERE id = auth.uid() 
       AND is_premium = TRUE 
       AND subscription_status IN ('premium', 'trial')
       AND (subscription_expires_at IS NULL OR subscription_expires_at > NOW())
     )
    )
  );

-- Users can update their own alarms
CREATE POLICY "alarms_update_own" ON alarms
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    -- Check premium feature access for updates
    (NOT is_premium_feature OR 
     EXISTS (
       SELECT 1 FROM users 
       WHERE id = auth.uid() 
       AND is_premium = TRUE 
       AND subscription_status IN ('premium', 'trial')
       AND (subscription_expires_at IS NULL OR subscription_expires_at > NOW())
     )
    )
  );

-- Users can delete their own alarms
CREATE POLICY "alarms_delete_own" ON alarms
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- ACTIVE SESSIONS TABLE POLICIES  
-- ============================================================================

-- Users can view their own active sessions
CREATE POLICY "active_sessions_select_own" ON active_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own active sessions
CREATE POLICY "active_sessions_insert_own" ON active_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own active sessions
CREATE POLICY "active_sessions_update_own" ON active_sessions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own active sessions
CREATE POLICY "active_sessions_delete_own" ON active_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- USER PREFERENCES TABLE POLICIES
-- ============================================================================

-- Users can view their own preferences
CREATE POLICY "user_preferences_select_own" ON user_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own preferences (one-time setup)
CREATE POLICY "user_preferences_insert_own" ON user_preferences
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    -- Ensure only one preferences record per user
    NOT EXISTS (SELECT 1 FROM user_preferences WHERE user_id = auth.uid())
  );

-- Users can update their own preferences
CREATE POLICY "user_preferences_update_own" ON user_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own preferences
CREATE POLICY "user_preferences_delete_own" ON user_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- UTILITY FUNCTIONS FOR RLS
-- ============================================================================

-- Function to check if user has premium access
CREATE OR REPLACE FUNCTION user_has_premium_access(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Return false if no user is authenticated
  IF user_uuid IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get user subscription info
  SELECT is_premium, subscription_status, subscription_expires_at
  INTO user_record
  FROM users
  WHERE id = user_uuid;
  
  -- User not found
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check premium status
  IF user_record.is_premium AND user_record.subscription_status IN ('premium', 'trial') THEN
    -- Check expiration for premium/trial users
    IF user_record.subscription_expires_at IS NULL OR user_record.subscription_expires_at > NOW() THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can create more alarms (free tier limits)
CREATE OR REPLACE FUNCTION user_can_create_alarm(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
  alarm_count INTEGER;
  is_premium BOOLEAN;
BEGIN
  -- Return false if no user is authenticated
  IF user_uuid IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user has premium access
  is_premium := user_has_premium_access(user_uuid);
  
  -- Premium users have unlimited alarms
  IF is_premium THEN
    RETURN TRUE;
  END IF;
  
  -- Count current alarms for free users
  SELECT COUNT(*)
  INTO alarm_count
  FROM alarms
  WHERE user_id = user_uuid;
  
  -- Free tier limit: 3 alarms
  RETURN alarm_count < 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check rate limiting for session creation
CREATE OR REPLACE FUNCTION user_can_create_session(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
  recent_sessions INTEGER;
BEGIN
  -- Return false if no user is authenticated
  IF user_uuid IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Count sessions created in the last minute
  SELECT COUNT(*)
  INTO recent_sessions
  FROM active_sessions
  WHERE user_id = user_uuid
  AND created_at > NOW() - INTERVAL '1 minute';
  
  -- Rate limit: 5 sessions per minute
  RETURN recent_sessions < 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ENHANCED POLICIES WITH BUSINESS RULES
-- ============================================================================

-- Enhanced alarm insert policy with limits
DROP POLICY IF EXISTS "alarms_insert_own" ON alarms;
CREATE POLICY "alarms_insert_own" ON alarms
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    -- Check if user can create more alarms
    user_can_create_alarm() AND
    -- Check premium feature access
    (NOT is_premium_feature OR user_has_premium_access())
  );

-- Enhanced active sessions insert policy with rate limiting
DROP POLICY IF EXISTS "active_sessions_insert_own" ON active_sessions;
CREATE POLICY "active_sessions_insert_own" ON active_sessions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    -- Rate limiting
    user_can_create_session() AND
    -- Ensure only one active session per user
    NOT EXISTS (
      SELECT 1 FROM active_sessions 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- ============================================================================
-- AUDIT AND SECURITY FUNCTIONS
-- ============================================================================

-- Function to log security violations (for monitoring)
CREATE OR REPLACE FUNCTION log_security_violation(
  violation_type TEXT,
  table_name TEXT,
  user_uuid UUID DEFAULT auth.uid(),
  additional_info JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
BEGIN
  -- In a production environment, this would log to a security audit table
  -- For now, we'll use the PostgreSQL log
  RAISE WARNING 'SECURITY_VIOLATION: % on % by user % - %', 
    violation_type, table_name, COALESCE(user_uuid::text, 'anonymous'), additional_info;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANTS FOR APPLICATION USERS
-- ============================================================================

-- Grant usage on schemas
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA auth TO authenticated;

-- Grant access to tables for authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON alarms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON active_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_preferences TO authenticated;

-- Grant access to sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute on utility functions
GRANT EXECUTE ON FUNCTION user_has_premium_access TO authenticated;
GRANT EXECUTE ON FUNCTION user_can_create_alarm TO authenticated;
GRANT EXECUTE ON FUNCTION user_can_create_session TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_next_trigger TO authenticated;

-- ============================================================================
-- SECURITY MONITORING
-- ============================================================================

-- Create a view for security monitoring (admin access only)
CREATE OR REPLACE VIEW security_audit_summary AS
SELECT 
  u.id as user_id,
  u.email,
  u.subscription_status,
  u.is_premium,
  COUNT(a.id) as alarm_count,
  COUNT(CASE WHEN a.is_premium_feature THEN 1 END) as premium_alarm_count,
  COUNT(s.id) as active_session_count,
  u.last_seen_at,
  u.created_at as user_created_at
FROM users u
LEFT JOIN alarms a ON u.id = a.user_id
LEFT JOIN active_sessions s ON u.id = s.user_id AND s.status = 'active'
GROUP BY u.id, u.email, u.subscription_status, u.is_premium, u.last_seen_at, u.created_at;

-- Restrict view to service role only
REVOKE ALL ON security_audit_summary FROM authenticated;

-- Comments for documentation
COMMENT ON FUNCTION user_has_premium_access IS 'Checks if user has valid premium subscription access';
COMMENT ON FUNCTION user_can_create_alarm IS 'Checks if user can create more alarms based on subscription tier';
COMMENT ON FUNCTION user_can_create_session IS 'Rate limiting check for session creation';
COMMENT ON VIEW security_audit_summary IS 'Security monitoring view for user activity (admin only)';