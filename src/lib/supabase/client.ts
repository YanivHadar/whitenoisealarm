/**
 * Supabase Client Configuration for Alarm & White Noise App
 * 
 * Configures and exports a typed Supabase client with proper
 * authentication, real-time subscriptions, and error handling.
 * Optimized for React Native and cross-platform compatibility.
 */

import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { Database } from '../../types/database';
import { AuthStorage } from '../secure-storage';

// Environment validation
const supabaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL is not defined. Please check your environment variables.'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_ANON_KEY is not defined. Please check your environment variables.'
  );
}

// Deep linking configuration for OAuth
const getURL = (path: string = '') => {
  const url = Linking.createURL(path);
  return url;
};

// Custom secure storage adapter for Supabase
const customStorage = {
  getItem: async (key: string) => {
    try {
      return await AuthStorage.getSession().then(session => {
        if (key === 'sb-auth-token') {
          return session ? JSON.stringify(session) : null;
        }
        return null;
      });
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      if (key === 'sb-auth-token' && value) {
        const session = JSON.parse(value);
        await AuthStorage.storeSession(session);
      }
    } catch (error) {
      console.error('Storage setItem error:', error);
    }
  },
  removeItem: async (key: string) => {
    try {
      if (key === 'sb-auth-token') {
        await AuthStorage.clearAuth();
      }
    } catch (error) {
      console.error('Storage removeItem error:', error);
    }
  },
};

// Supabase client configuration
export const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS !== 'web' ? customStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce', // Use PKCE flow for mobile security
    ...(Platform.OS !== 'web' && {
      redirectTo: getURL('auth/callback'),
    }),
  },
  realtime: {
    params: {
      eventsPerSecond: 10, // Rate limiting for mobile
    },
  },
  global: {
    headers: {
      'X-Client-Info': 'alarm-white-noise-app',
    },
  },
});

/**
 * Type-safe helper to get the current user session
 */
export const getCurrentSession = async () => {
  const { data: session, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('Error getting session:', error);
    return null;
  }
  
  return session?.session || null;
};

/**
 * Type-safe helper to get the current user
 */
export const getCurrentUser = async () => {
  const session = await getCurrentSession();
  return session?.user || null;
};

/**
 * Helper to check if user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const session = await getCurrentSession();
  return !!session?.user;
};

/**
 * Helper to check if user has premium subscription
 */
export const isPremiumUser = async (): Promise<boolean> => {
  const user = await getCurrentUser();
  if (!user) return false;
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('is_premium, subscription_status, subscription_expires_at')
      .eq('id', user.id)
      .single();
    
    if (error || !data) return false;
    
    // Check if subscription is active
    if (data.subscription_status === 'free') return false;
    
    // Check if subscription hasn't expired
    if (data.subscription_expires_at) {
      const expiresAt = new Date(data.subscription_expires_at);
      const now = new Date();
      if (now > expiresAt) return false;
    }
    
    return data.is_premium || data.subscription_status === 'premium';
  } catch (error) {
    console.error('Error checking premium status:', error);
    return false;
  }
};

/**
 * Authentication state change listener
 */
export const onAuthStateChange = (callback: (authenticated: boolean, user: any) => void) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    const authenticated = !!session?.user;
    callback(authenticated, session?.user || null);
  });
};

/**
 * Sign out the current user
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

/**
 * Real-time subscription helper with error handling
 */
export const createRealtimeSubscription = <T = any>(
  table: string,
  filter?: string,
  callback?: (payload: any) => void
) => {
  const channel = supabase
    .channel(`public:${table}${filter ? `:${filter}` : ''}`)
    .on(
      'postgres_changes',
      { 
        event: '*', 
        schema: 'public', 
        table,
        filter 
      } as any,
      (payload) => {
        console.log(`Real-time update for ${table}:`, payload);
        callback?.(payload);
      }
    )
    .on('error', (error) => {
      console.error(`Real-time subscription error for ${table}:`, error);
    })
    .subscribe((status) => {
      console.log(`Real-time subscription status for ${table}:`, status);
    });

  return channel;
};

/**
 * Generic database error handler
 */
export const handleDatabaseError = (error: any, operation: string) => {
  console.error(`Database error in ${operation}:`, error);
  
  // Map common Supabase errors to user-friendly messages
  const errorMap: Record<string, string> = {
    'duplicate key value violates unique constraint': 'This record already exists',
    'foreign key constraint': 'Referenced record not found',
    'check constraint': 'Invalid data provided',
    'not null violation': 'Required field is missing',
    'permission denied': 'You do not have permission to perform this action',
    'row level security': 'Access denied due to security policies',
  };
  
  const errorMessage = error?.message || 'Unknown database error';
  const userFriendlyMessage = Object.keys(errorMap).find(key => 
    errorMessage.toLowerCase().includes(key)
  );
  
  return {
    code: error?.code || 'DATABASE_ERROR',
    message: userFriendlyMessage ? errorMap[userFriendlyMessage] : errorMessage,
    originalError: error,
  };
};

/**
 * Connection health check
 */
export const checkConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    return !error;
  } catch (error) {
    console.error('Connection check failed:', error);
    return false;
  }
};

export default supabase;