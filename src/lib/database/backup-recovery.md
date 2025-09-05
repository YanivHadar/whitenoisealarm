# Database Backup and Recovery Configuration

## Overview

This document outlines the backup and recovery procedures for the Alarm & White Noise App database. The configuration ensures data protection, disaster recovery, and business continuity for user alarm schedules and preferences.

## Supabase Backup Strategy

### Automated Backups

Supabase provides automated backups with the following configuration:

1. **Point-in-Time Recovery (PITR)**
   - Available on Pro plan and above
   - Continuous backup with up to 7 days retention (can be extended)
   - Allows restoration to any point within the retention period

2. **Daily Snapshots**
   - Automated daily database snapshots
   - Retained for 7 days on Pro plan
   - Stored in multiple geographic locations

### Manual Backup Configuration

For additional protection, configure manual backups:

```sql
-- Create backup function for critical tables
CREATE OR REPLACE FUNCTION create_manual_backup()
RETURNS TABLE (
  table_name TEXT,
  backup_status TEXT,
  record_count BIGINT,
  backup_timestamp TIMESTAMPTZ
) AS $$
DECLARE
  backup_time TIMESTAMPTZ := NOW();
BEGIN
  -- Create backup schema if it doesn't exist
  CREATE SCHEMA IF NOT EXISTS backups;
  
  -- Backup users table
  EXECUTE format('CREATE TABLE IF NOT EXISTS backups.users_%s AS SELECT * FROM users', 
    to_char(backup_time, 'YYYYMMDD_HH24MISS'));
  
  -- Backup alarms table
  EXECUTE format('CREATE TABLE IF NOT EXISTS backups.alarms_%s AS SELECT * FROM alarms', 
    to_char(backup_time, 'YYYYMMDD_HH24MISS'));
  
  -- Backup user_preferences table
  EXECUTE format('CREATE TABLE IF NOT EXISTS backups.user_preferences_%s AS SELECT * FROM user_preferences', 
    to_char(backup_time, 'YYYYMMDD_HH24MISS'));
  
  -- Backup active_sessions table
  EXECUTE format('CREATE TABLE IF NOT EXISTS backups.active_sessions_%s AS SELECT * FROM active_sessions', 
    to_char(backup_time, 'YYYYMMDD_HH24MISS'));
  
  -- Return backup status
  RETURN QUERY
  SELECT 
    'users' AS table_name,
    'completed' AS backup_status,
    (SELECT COUNT(*) FROM users) AS record_count,
    backup_time AS backup_timestamp
  UNION ALL
  SELECT 
    'alarms' AS table_name,
    'completed' AS backup_status,
    (SELECT COUNT(*) FROM alarms) AS record_count,
    backup_time AS backup_timestamp
  UNION ALL
  SELECT 
    'user_preferences' AS table_name,
    'completed' AS backup_status,
    (SELECT COUNT(*) FROM user_preferences) AS record_count,
    backup_time AS backup_timestamp
  UNION ALL
  SELECT 
    'active_sessions' AS table_name,
    'completed' AS backup_status,
    (SELECT COUNT(*) FROM active_sessions) AS record_count,
    backup_time AS backup_timestamp;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION create_manual_backup TO service_role;
```

## Recovery Procedures

### Point-in-Time Recovery

1. **Access Supabase Dashboard**
   - Navigate to project settings
   - Go to Database > Backups section
   - Select "Point-in-time Recovery"

2. **Select Recovery Point**
   - Choose specific timestamp for recovery
   - Verify the recovery point covers the data loss incident
   - Initiate recovery process

3. **Validate Recovery**
   - Test database connectivity
   - Verify data integrity
   - Check application functionality

### Manual Table Recovery

```sql
-- Restore from manual backup (replace timestamp)
CREATE OR REPLACE FUNCTION restore_from_backup(backup_timestamp TEXT)
RETURNS TABLE (
  table_name TEXT,
  restore_status TEXT,
  records_restored BIGINT
) AS $$
BEGIN
  -- Restore users table
  EXECUTE format('INSERT INTO users SELECT * FROM backups.users_%s ON CONFLICT (id) DO NOTHING', backup_timestamp);
  
  -- Restore alarms table
  EXECUTE format('INSERT INTO alarms SELECT * FROM backups.alarms_%s ON CONFLICT (id) DO NOTHING', backup_timestamp);
  
  -- Restore user_preferences table
  EXECUTE format('INSERT INTO user_preferences SELECT * FROM backups.user_preferences_%s ON CONFLICT (id) DO NOTHING', backup_timestamp);
  
  -- Restore active_sessions table (usually not needed as these are ephemeral)
  -- EXECUTE format('INSERT INTO active_sessions SELECT * FROM backups.active_sessions_%s ON CONFLICT (id) DO NOTHING', backup_timestamp);
  
  -- Return restore status
  RETURN QUERY
  SELECT 
    'users' AS table_name,
    'completed' AS restore_status,
    (SELECT COUNT(*) FROM users) AS records_restored
  UNION ALL
  SELECT 
    'alarms' AS table_name,
    'completed' AS restore_status,
    (SELECT COUNT(*) FROM alarms) AS records_restored
  UNION ALL
  SELECT 
    'user_preferences' AS table_name,
    'completed' AS restore_status,
    (SELECT COUNT(*) FROM user_preferences) AS records_restored;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION restore_from_backup TO service_role;
```

## Data Retention Policies

### User Data Retention

```sql
-- Function to clean up old user data (GDPR compliance)
CREATE OR REPLACE FUNCTION cleanup_inactive_users()
RETURNS TABLE (
  cleanup_type TEXT,
  records_affected BIGINT,
  cleanup_timestamp TIMESTAMPTZ
) AS $$
DECLARE
  cleanup_time TIMESTAMPTZ := NOW();
  inactive_threshold INTERVAL := INTERVAL '2 years';
BEGIN
  -- Delete users who haven't been seen in 2 years and have no subscription
  WITH inactive_users AS (
    DELETE FROM users 
    WHERE last_seen_at < (NOW() - inactive_threshold)
    AND subscription_status = 'free'
    AND is_premium = FALSE
    RETURNING id
  )
  SELECT 
    'inactive_users' AS cleanup_type,
    COUNT(*) AS records_affected,
    cleanup_time AS cleanup_timestamp
  FROM inactive_users;
  
  -- Clean up old active sessions (older than 30 days)
  WITH old_sessions AS (
    DELETE FROM active_sessions 
    WHERE created_at < (NOW() - INTERVAL '30 days')
    RETURNING id
  )
  SELECT 
    'old_sessions' AS cleanup_type,
    COUNT(*) AS records_affected,
    cleanup_time AS cleanup_timestamp
  FROM old_sessions;
END;
$$ LANGUAGE plpgsql;
```

### Backup Retention

```sql
-- Function to clean up old manual backups
CREATE OR REPLACE FUNCTION cleanup_old_backups()
RETURNS TABLE (
  backup_table TEXT,
  cleanup_status TEXT
) AS $$
DECLARE
  backup_table_record RECORD;
  retention_days INTEGER := 30;
BEGIN
  -- Get all backup tables older than retention period
  FOR backup_table_record IN 
    SELECT schemaname, tablename
    FROM pg_tables 
    WHERE schemaname = 'backups'
    AND tablename ~ '_\d{8}_\d{6}$'
    AND to_timestamp(
      regexp_replace(tablename, '.*_(\d{8}_\d{6})$', '\1'),
      'YYYYMMDD_HH24MISS'
    ) < NOW() - (retention_days || ' days')::INTERVAL
  LOOP
    -- Drop old backup table
    EXECUTE format('DROP TABLE IF EXISTS backups.%I', backup_table_record.tablename);
    
    RETURN QUERY SELECT 
      backup_table_record.tablename AS backup_table,
      'deleted' AS cleanup_status;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

## Monitoring and Alerts

### Backup Monitoring

```sql
-- Function to check backup health
CREATE OR REPLACE FUNCTION check_backup_health()
RETURNS TABLE (
  health_check TEXT,
  status TEXT,
  details JSONB,
  last_updated TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'backup_tables' AS health_check,
    CASE 
      WHEN COUNT(*) > 0 THEN 'healthy'
      ELSE 'warning'
    END AS status,
    jsonb_build_object(
      'backup_count', COUNT(*),
      'latest_backup', MAX(
        to_timestamp(
          regexp_replace(tablename, '.*_(\d{8}_\d{6})$', '\1'),
          'YYYYMMDD_HH24MISS'
        )
      )
    ) AS details,
    NOW() AS last_updated
  FROM pg_tables 
  WHERE schemaname = 'backups'
  AND tablename ~ '_\d{8}_\d{6}$';
END;
$$ LANGUAGE plpgsql;
```

## Mobile App Integration

### Backup Status Service

```typescript
// TypeScript service for backup status
export class BackupService {
  /**
   * Check backup health status
   */
  static async checkBackupHealth(): Promise<ServiceResponse<any>> {
    try {
      const { data, error } = await supabase.rpc('check_backup_health');
      
      if (error) {
        return {
          data: null,
          error: handleDatabaseError(error, 'BackupService.checkBackupHealth'),
          success: false,
        };
      }

      return {
        data: data,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: {
          code: 'BACKUP_CHECK_ERROR',
          message: 'Failed to check backup health',
          details: error,
        },
        success: false,
      };
    }
  }

  /**
   * Request manual backup
   */
  static async createManualBackup(): Promise<ServiceResponse<any>> {
    try {
      const { data, error } = await supabase.rpc('create_manual_backup');
      
      if (error) {
        return {
          data: null,
          error: handleDatabaseError(error, 'BackupService.createManualBackup'),
          success: false,
        };
      }

      return {
        data: data,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: {
          code: 'BACKUP_CREATE_ERROR',
          message: 'Failed to create manual backup',
          details: error,
        },
        success: false,
      };
    }
  }
}
```

## Disaster Recovery Plan

### Recovery Time Objectives (RTO) and Recovery Point Objectives (RPO)

- **RTO (Recovery Time Objective)**: 4 hours maximum downtime
- **RPO (Recovery Point Objective)**: Maximum 1 hour of data loss
- **Critical Systems**: Alarm scheduling must be restored within 1 hour

### Recovery Procedures

1. **Immediate Response (0-30 minutes)**
   - Assess impact and scope of data loss
   - Notify stakeholders and users if necessary
   - Begin recovery procedures

2. **Recovery Execution (30 minutes - 2 hours)**
   - Execute point-in-time recovery or manual restore
   - Validate data integrity
   - Test critical alarm functionality

3. **Verification and Monitoring (2-4 hours)**
   - Comprehensive system testing
   - User notification of service restoration
   - Monitor for issues or data inconsistencies

### Emergency Contacts

- **Database Administrator**: [Contact Information]
- **DevOps Team**: [Contact Information]
- **Product Owner**: [Contact Information]

## Testing and Validation

### Regular Backup Testing

- **Monthly**: Test backup creation process
- **Quarterly**: Test complete recovery procedure
- **Annually**: Full disaster recovery simulation

### Automated Monitoring

- Set up alerts for backup failures
- Monitor backup storage usage
- Track recovery time metrics

## Compliance and Security

### Data Protection

- All backups encrypted at rest
- Access logging for backup operations
- Regular security audits

### GDPR Compliance

- User data deletion procedures
- Right to data portability support
- Audit trail for data operations

---

**Note**: This configuration assumes Supabase Pro plan or higher for advanced backup features. Adjust retention periods and procedures based on your specific plan and requirements.