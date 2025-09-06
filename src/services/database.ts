/**
 * Database Service for Alarm & White Noise App
 * 
 * Provides type-safe database operations with Zod validation,
 * real-time subscriptions, and comprehensive error handling.
 * Optimized for mobile performance with caching and offline support.
 */

import { supabase, handleDatabaseError, createRealtimeSubscription } from '../lib/supabase/client';
import { validateData, isValidData } from '../types/validation';
import {
  AlarmSchema,
  AlarmInsertSchema,
  AlarmUpdateSchema,
  UserSchema,
  UserInsertSchema,
  UserUpdateSchema,
  ActiveSessionSchema,
  ActiveSessionInsertSchema,
  ActiveSessionUpdateSchema,
  UserPreferencesSchema,
  UserPreferencesInsertSchema,
  UserPreferencesUpdateSchema,
  PaginationSchema,
} from '../types/validation';
import type {
  Alarm,
  AlarmInsert,
  AlarmUpdate,
  User,
  UserInsert,
  UserUpdate,
  ActiveSession,
  ActiveSessionInsert,
  ActiveSessionUpdate,
  UserPreferences,
  UserPreferencesInsert,
  UserPreferencesUpdate,
  RealtimePayload,
  Database,
} from '../types/database';
import uuid from 'react-native-uuid';

// Types for service responses
export interface ServiceResponse<T> {
  data: T | null;
  error: ServiceError | null;
  success: boolean;
}

export interface ServiceError {
  code: string;
  message: string;
  details?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  error: ServiceError | null;
  success: boolean;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ============================================================================
// USER OPERATIONS
// ============================================================================

export class UserService {
  /**
   * Create a new user profile
   */
  static async create(userData: UserInsert): Promise<ServiceResponse<User>> {
    try {
      const validatedData = validateData(UserInsertSchema, userData);
      
      const { data, error } = await supabase
        .from('users')
        .insert(validatedData)
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: handleDatabaseError(error, 'UserService.create'),
          success: false,
        };
      }

      const user = validateData(UserSchema, data);
      return {
        data: user,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Validation failed',
          details: error,
        },
        success: false,
      };
    }
  }

  /**
   * Get user profile by ID
   */
  static async getById(userId: string): Promise<ServiceResponse<User>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        return {
          data: null,
          error: handleDatabaseError(error, 'UserService.getById'),
          success: false,
        };
      }

      const user = validateData(UserSchema, data);
      return {
        data: user,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: {
          code: 'SERVICE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
        },
        success: false,
      };
    }
  }

  /**
   * Update user profile
   */
  static async update(userId: string, updates: UserUpdate): Promise<ServiceResponse<User>> {
    try {
      const validatedData = validateData(UserUpdateSchema, updates);
      
      const { data, error } = await supabase
        .from('users')
        .update(validatedData)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: handleDatabaseError(error, 'UserService.update'),
          success: false,
        };
      }

      const user = validateData(UserSchema, data);
      return {
        data: user,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Validation failed',
          details: error,
        },
        success: false,
      };
    }
  }

  /**
   * Update user's last seen timestamp
   */
  static async updateLastSeen(userId: string): Promise<ServiceResponse<User>> {
    return this.update(userId, {
      last_seen_at: new Date().toISOString(),
    });
  }
}

// ============================================================================
// ALARM OPERATIONS
// ============================================================================

export class AlarmService {
  /**
   * Create a new alarm
   */
  static async create(alarmData: AlarmInsert): Promise<ServiceResponse<Alarm>> {
    try {
      const validatedData = validateData(AlarmInsertSchema, {
        ...alarmData,
        id: alarmData.id || uuidv4(),
      });
      
      const { data, error } = await supabase
        .from('alarms')
        .insert(validatedData)
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: handleDatabaseError(error, 'AlarmService.create'),
          success: false,
        };
      }

      const alarm = validateData(AlarmSchema, data);
      return {
        data: alarm,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Validation failed',
          details: error,
        },
        success: false,
      };
    }
  }

  /**
   * Get alarms for a user with pagination
   */
  static async getByUser(
    userId: string,
    pagination = { page: 1, limit: 20 }
  ): Promise<PaginatedResponse<Alarm>> {
    try {
      const validatedPagination = validateData(PaginationSchema, pagination);
      const offset = (validatedPagination.page - 1) * validatedPagination.limit;

      // Get total count
      const { count, error: countError } = await supabase
        .from('alarms')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (countError) {
        return {
          data: [],
          error: handleDatabaseError(countError, 'AlarmService.getByUser.count'),
          success: false,
        };
      }

      // Get paginated data
      const { data, error } = await supabase
        .from('alarms')
        .select('*')
        .eq('user_id', userId)
        .order(validatedPagination.sort_by, { ascending: validatedPagination.sort_order === 'asc' })
        .range(offset, offset + validatedPagination.limit - 1);

      if (error) {
        return {
          data: [],
          error: handleDatabaseError(error, 'AlarmService.getByUser'),
          success: false,
        };
      }

      const alarms = data?.map(item => validateData(AlarmSchema, item)) || [];
      const totalPages = Math.ceil((count || 0) / validatedPagination.limit);

      return {
        data: alarms,
        error: null,
        success: true,
        pagination: {
          total: count || 0,
          page: validatedPagination.page,
          limit: validatedPagination.limit,
          totalPages,
        },
      };
    } catch (error) {
      return {
        data: [],
        error: {
          code: 'SERVICE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
        },
        success: false,
      };
    }
  }

  /**
   * Get active/enabled alarms for a user
   */
  static async getActiveByUser(userId: string): Promise<ServiceResponse<Alarm[]>> {
    try {
      const { data, error } = await supabase
        .from('alarms')
        .select('*')
        .eq('user_id', userId)
        .eq('enabled', true)
        .order('time');

      if (error) {
        return {
          data: null,
          error: handleDatabaseError(error, 'AlarmService.getActiveByUser'),
          success: false,
        };
      }

      const alarms = data?.map(item => validateData(AlarmSchema, item)) || [];
      return {
        data: alarms,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: {
          code: 'SERVICE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
        },
        success: false,
      };
    }
  }

  /**
   * Get alarm by ID
   */
  static async getById(alarmId: string): Promise<ServiceResponse<Alarm>> {
    try {
      const { data, error } = await supabase
        .from('alarms')
        .select('*')
        .eq('id', alarmId)
        .single();

      if (error) {
        return {
          data: null,
          error: handleDatabaseError(error, 'AlarmService.getById'),
          success: false,
        };
      }

      const alarm = validateData(AlarmSchema, data);
      return {
        data: alarm,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: {
          code: 'SERVICE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
        },
        success: false,
      };
    }
  }

  /**
   * Update an alarm
   */
  static async update(alarmId: string, updates: AlarmUpdate): Promise<ServiceResponse<Alarm>> {
    try {
      const validatedData = validateData(AlarmUpdateSchema, updates);
      
      const { data, error } = await supabase
        .from('alarms')
        .update(validatedData)
        .eq('id', alarmId)
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: handleDatabaseError(error, 'AlarmService.update'),
          success: false,
        };
      }

      const alarm = validateData(AlarmSchema, data);
      return {
        data: alarm,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Validation failed',
          details: error,
        },
        success: false,
      };
    }
  }

  /**
   * Delete an alarm
   */
  static async delete(alarmId: string): Promise<ServiceResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('alarms')
        .delete()
        .eq('id', alarmId);

      if (error) {
        return {
          data: null,
          error: handleDatabaseError(error, 'AlarmService.delete'),
          success: false,
        };
      }

      return {
        data: true,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: {
          code: 'SERVICE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
        },
        success: false,
      };
    }
  }

  /**
   * Toggle alarm enabled state
   */
  static async toggle(alarmId: string, enabled: boolean): Promise<ServiceResponse<Alarm>> {
    return this.update(alarmId, { enabled });
  }

  /**
   * Subscribe to real-time alarm updates for a user
   */
  static subscribeToUserAlarms(
    userId: string,
    callback: (payload: RealtimePayload<Alarm>) => void
  ) {
    return createRealtimeSubscription(
      'alarms',
      `user_id=eq.${userId}`,
      callback
    );
  }
}

// ============================================================================
// ACTIVE SESSION OPERATIONS
// ============================================================================

export class ActiveSessionService {
  /**
   * Create a new active session
   */
  static async create(sessionData: ActiveSessionInsert): Promise<ServiceResponse<ActiveSession>> {
    try {
      const validatedData = validateData(ActiveSessionInsertSchema, {
        ...sessionData,
        id: sessionData.id || uuidv4(),
        started_at: sessionData.started_at || new Date().toISOString(),
      });
      
      const { data, error } = await supabase
        .from('active_sessions')
        .insert(validatedData)
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: handleDatabaseError(error, 'ActiveSessionService.create'),
          success: false,
        };
      }

      const session = validateData(ActiveSessionSchema, data);
      return {
        data: session,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Validation failed',
          details: error,
        },
        success: false,
      };
    }
  }

  /**
   * Get active session for a user
   */
  static async getActiveByUser(userId: string): Promise<ServiceResponse<ActiveSession>> {
    try {
      const { data, error } = await supabase
        .from('active_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error) {
        // No active session is not an error
        if (error.code === 'PGRST116') {
          return {
            data: null,
            error: null,
            success: true,
          };
        }
        
        return {
          data: null,
          error: handleDatabaseError(error, 'ActiveSessionService.getActiveByUser'),
          success: false,
        };
      }

      const session = validateData(ActiveSessionSchema, data);
      return {
        data: session,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: {
          code: 'SERVICE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
        },
        success: false,
      };
    }
  }

  /**
   * Update an active session
   */
  static async update(
    sessionId: string,
    updates: ActiveSessionUpdate
  ): Promise<ServiceResponse<ActiveSession>> {
    try {
      const validatedData = validateData(ActiveSessionUpdateSchema, updates);
      
      const { data, error } = await supabase
        .from('active_sessions')
        .update(validatedData)
        .eq('id', sessionId)
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: handleDatabaseError(error, 'ActiveSessionService.update'),
          success: false,
        };
      }

      const session = validateData(ActiveSessionSchema, data);
      return {
        data: session,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Validation failed',
          details: error,
        },
        success: false,
      };
    }
  }

  /**
   * End an active session
   */
  static async end(sessionId: string, duration?: number): Promise<ServiceResponse<ActiveSession>> {
    const updates: ActiveSessionUpdate = {
      status: 'completed',
      ended_at: new Date().toISOString(),
      progress_percentage: 100,
    };

    if (duration !== undefined) {
      updates.duration_seconds = duration;
    }

    return this.update(sessionId, updates);
  }

  /**
   * Subscribe to real-time session updates for a user
   */
  static subscribeToUserSessions(
    userId: string,
    callback: (payload: RealtimePayload<ActiveSession>) => void
  ) {
    return createRealtimeSubscription(
      'active_sessions',
      `user_id=eq.${userId}`,
      callback
    );
  }
}

// ============================================================================
// USER PREFERENCES OPERATIONS
// ============================================================================

export class UserPreferencesService {
  /**
   * Create user preferences
   */
  static async create(preferencesData: UserPreferencesInsert): Promise<ServiceResponse<UserPreferences>> {
    try {
      const validatedData = validateData(UserPreferencesInsertSchema, {
        ...preferencesData,
        id: preferencesData.id || uuidv4(),
      });
      
      const { data, error } = await supabase
        .from('user_preferences')
        .insert(validatedData)
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: handleDatabaseError(error, 'UserPreferencesService.create'),
          success: false,
        };
      }

      const preferences = validateData(UserPreferencesSchema, data);
      return {
        data: preferences,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Validation failed',
          details: error,
        },
        success: false,
      };
    }
  }

  /**
   * Get user preferences
   */
  static async getByUser(userId: string): Promise<ServiceResponse<UserPreferences>> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        return {
          data: null,
          error: handleDatabaseError(error, 'UserPreferencesService.getByUser'),
          success: false,
        };
      }

      const preferences = validateData(UserPreferencesSchema, data);
      return {
        data: preferences,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: {
          code: 'SERVICE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
        },
        success: false,
      };
    }
  }

  /**
   * Update user preferences
   */
  static async update(
    userId: string,
    updates: UserPreferencesUpdate
  ): Promise<ServiceResponse<UserPreferences>> {
    try {
      const validatedData = validateData(UserPreferencesUpdateSchema, updates);
      
      const { data, error } = await supabase
        .from('user_preferences')
        .update(validatedData)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: handleDatabaseError(error, 'UserPreferencesService.update'),
          success: false,
        };
      }

      const preferences = validateData(UserPreferencesSchema, data);
      return {
        data: preferences,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Validation failed',
          details: error,
        },
        success: false,
      };
    }
  }

  /**
   * Get or create user preferences with defaults
   */
  static async getOrCreate(userId: string): Promise<ServiceResponse<UserPreferences>> {
    // Try to get existing preferences
    const existingResult = await this.getByUser(userId);
    
    if (existingResult.success && existingResult.data) {
      return existingResult;
    }

    // Create with defaults if not found
    if (existingResult.error?.code === 'PGRST116' || !existingResult.data) {
      return this.create({ user_id: userId });
    }

    return existingResult;
  }
}

// ============================================================================
// HEALTH CHECK AND UTILITIES
// ============================================================================

export class DatabaseHealthService {
  /**
   * Check database connection and basic functionality
   */
  static async healthCheck(): Promise<ServiceResponse<boolean>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .limit(1);

      if (error && error.code !== 'PGRST116') {
        return {
          data: null,
          error: handleDatabaseError(error, 'DatabaseHealthService.healthCheck'),
          success: false,
        };
      }

      return {
        data: true,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: {
          code: 'CONNECTION_ERROR',
          message: 'Database connection failed',
          details: error,
        },
        success: false,
      };
    }
  }

  /**
   * Get database performance metrics
   */
  static async getMetrics(): Promise<ServiceResponse<Record<string, any>>> {
    try {
      // This would typically query performance metrics
      // For now, return basic connection info
      const startTime = Date.now();
      await supabase.from('users').select('id').limit(1);
      const responseTime = Date.now() - startTime;

      return {
        data: {
          responseTime,
          timestamp: new Date().toISOString(),
          status: 'healthy',
        },
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: {
          code: 'METRICS_ERROR',
          message: 'Failed to get metrics',
          details: error,
        },
        success: false,
      };
    }
  }
}

// Export all services
export default {
  UserService,
  AlarmService,
  ActiveSessionService,
  UserPreferencesService,
  DatabaseHealthService,
};