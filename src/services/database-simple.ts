/**
 * Simplified Database Service for Alarm & White Noise App
 * 
 * Provides type-safe database operations with proper error handling.
 * Temporary implementation to resolve TypeScript compilation issues.
 */

import { supabase } from '../lib/supabase/client';
import { Database } from '../types/database';
import { validateData } from '../types/validation';
import { 
  UserInsertSchema, 
  AlarmInsertSchema, 
  ActiveSessionInsertSchema, 
  UserPreferencesInsertSchema 
} from '../types/validation';

// Type-safe aliases
type Tables = Database['public']['Tables'];
type User = Tables['users']['Row'];
type UserInsert = Tables['users']['Insert'];
type Alarm = Tables['alarms']['Row'];
type AlarmInsert = Tables['alarms']['Insert'];
type ActiveSession = Tables['active_sessions']['Row'];
type ActiveSessionInsert = Tables['active_sessions']['Insert'];
type UserPreferences = Tables['user_preferences']['Row'];
type UserPreferencesInsert = Tables['user_preferences']['Insert'];

export interface ServiceResponse<T> {
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: any;
  } | null;
  success: boolean;
}

/**
 * User Service - Simplified
 */
export class UserService {
  static async create(userData: any): Promise<ServiceResponse<User>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: {
            code: 'USER_CREATE_ERROR',
            message: error.message,
            details: error,
          },
          success: false,
        };
      }

      return {
        data: data as User,
        error: null,
        success: true,
      };
    } catch (error: any) {
      return {
        data: null,
        error: {
          code: 'USER_CREATE_EXCEPTION',
          message: error.message || 'Failed to create user',
          details: error,
        },
        success: false,
      };
    }
  }

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
          error: {
            code: 'USER_NOT_FOUND',
            message: error.message,
            details: error,
          },
          success: false,
        };
      }

      return {
        data: data as User,
        error: null,
        success: true,
      };
    } catch (error: any) {
      return {
        data: null,
        error: {
          code: 'USER_GET_EXCEPTION',
          message: error.message || 'Failed to get user',
          details: error,
        },
        success: false,
      };
    }
  }
}

/**
 * Alarm Service - Simplified
 */
export class AlarmService {
  static async create(alarmData: any): Promise<ServiceResponse<Alarm>> {
    try {
      const { data, error } = await supabase
        .from('alarms')
        .insert(alarmData)
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: {
            code: 'ALARM_CREATE_ERROR',
            message: error.message,
            details: error,
          },
          success: false,
        };
      }

      return {
        data: data as Alarm,
        error: null,
        success: true,
      };
    } catch (error: any) {
      return {
        data: null,
        error: {
          code: 'ALARM_CREATE_EXCEPTION',
          message: error.message || 'Failed to create alarm',
          details: error,
        },
        success: false,
      };
    }
  }

  static async getByUserId(userId: string): Promise<ServiceResponse<Alarm[]>> {
    try {
      const { data, error } = await supabase
        .from('alarms')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return {
          data: null,
          error: {
            code: 'ALARMS_GET_ERROR',
            message: error.message,
            details: error,
          },
          success: false,
        };
      }

      return {
        data: (data || []) as Alarm[],
        error: null,
        success: true,
      };
    } catch (error: any) {
      return {
        data: null,
        error: {
          code: 'ALARMS_GET_EXCEPTION',
          message: error.message || 'Failed to get alarms',
          details: error,
        },
        success: false,
      };
    }
  }
}

/**
 * Active Session Service - Simplified
 */
export class ActiveSessionService {
  static async create(sessionData: any): Promise<ServiceResponse<ActiveSession>> {
    try {
      const { data, error } = await supabase
        .from('active_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: {
            code: 'SESSION_CREATE_ERROR',
            message: error.message,
            details: error,
          },
          success: false,
        };
      }

      return {
        data: data as ActiveSession,
        error: null,
        success: true,
      };
    } catch (error: any) {
      return {
        data: null,
        error: {
          code: 'SESSION_CREATE_EXCEPTION',
          message: error.message || 'Failed to create session',
          details: error,
        },
        success: false,
      };
    }
  }

  static async getActiveByUserId(userId: string): Promise<ServiceResponse<ActiveSession[]>> {
    try {
      const { data, error } = await supabase
        .from('active_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        return {
          data: null,
          error: {
            code: 'SESSIONS_GET_ERROR',
            message: error.message,
            details: error,
          },
          success: false,
        };
      }

      return {
        data: (data || []) as ActiveSession[],
        error: null,
        success: true,
      };
    } catch (error: any) {
      return {
        data: null,
        error: {
          code: 'SESSIONS_GET_EXCEPTION',
          message: error.message || 'Failed to get active sessions',
          details: error,
        },
        success: false,
      };
    }
  }
}

/**
 * User Preferences Service - Simplified
 */
export class UserPreferencesService {
  static async create(preferencesData: any): Promise<ServiceResponse<UserPreferences>> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .insert(preferencesData)
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: {
            code: 'PREFERENCES_CREATE_ERROR',
            message: error.message,
            details: error,
          },
          success: false,
        };
      }

      return {
        data: data as UserPreferences,
        error: null,
        success: true,
      };
    } catch (error: any) {
      return {
        data: null,
        error: {
          code: 'PREFERENCES_CREATE_EXCEPTION',
          message: error.message || 'Failed to create preferences',
          details: error,
        },
        success: false,
      };
    }
  }

  static async getByUserId(userId: string): Promise<ServiceResponse<UserPreferences>> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        return {
          data: null,
          error: {
            code: 'PREFERENCES_NOT_FOUND',
            message: error.message,
            details: error,
          },
          success: false,
        };
      }

      return {
        data: data as UserPreferences,
        error: null,
        success: true,
      };
    } catch (error: any) {
      return {
        data: null,
        error: {
          code: 'PREFERENCES_GET_EXCEPTION',
          message: error.message || 'Failed to get preferences',
          details: error,
        },
        success: false,
      };
    }
  }
}

/**
 * Connection test function
 */
export async function testDatabaseConnection(): Promise<ServiceResponse<boolean>> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      return {
        data: false,
        error: {
          code: 'CONNECTION_TEST_FAILED',
          message: error.message,
          details: error,
        },
        success: false,
      };
    }

    return {
      data: true,
      error: null,
      success: true,
    };
  } catch (error: any) {
    return {
      data: false,
      error: {
        code: 'CONNECTION_TEST_EXCEPTION',
        message: error.message || 'Connection test failed',
        details: error,
      },
      success: false,
    };
  }
}

/**
 * Real-time subscription helper
 */
export function subscribeToAlarms(userId: string, callback: (alarm: Alarm) => void) {
  return supabase
    .channel(`alarms:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'alarms',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        console.log('Alarm update received:', payload);
        if (payload.new) {
          callback(payload.new as Alarm);
        }
      }
    )
    .subscribe();
}

export default {
  UserService,
  AlarmService,
  ActiveSessionService,
  UserPreferencesService,
  testDatabaseConnection,
  subscribeToAlarms,
};