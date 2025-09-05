/**
 * Authentication Store for Alarm & White Noise App
 * 
 * Zustand-based state management for user authentication,
 * session management, and authorization state.
 * Integrates with Supabase Auth and secure storage.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { User, Session } from '@supabase/supabase-js';
import { supabase, onAuthStateChange } from '../lib/supabase/client';
import { AuthStorage, BiometricStorage } from '../lib/secure-storage';
import * as LocalAuthentication from 'expo-local-authentication';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_premium: boolean;
  subscription_status: 'free' | 'trial' | 'premium' | 'canceled';
  subscription_expires_at: string | null;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    notifications_enabled: boolean;
    vibration_enabled: boolean;
    biometric_auth_enabled: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  // Authentication state
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  
  // Loading states
  isLoading: boolean;
  isInitializing: boolean;
  
  // Biometric authentication
  biometricSupported: boolean;
  biometricEnabled: boolean;
  biometricTypes: LocalAuthentication.AuthenticationType[];
  
  // Error handling
  error: string | null;
  
  // Methods
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  
  // OAuth methods
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signInWithApple: () => Promise<{ success: boolean; error?: string }>;
  
  // Biometric authentication
  setupBiometric: () => Promise<{ success: boolean; error?: string }>;
  authenticateWithBiometric: () => Promise<{ success: boolean; error?: string }>;
  disableBiometric: () => Promise<void>;
  
  // Profile management
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
  
  // Session management
  refreshSession: () => Promise<void>;
  
  // Utility methods
  clearError: () => void;
  isPremiumUser: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    isAuthenticated: false,
    user: null,
    session: null,
    userProfile: null,
    
    isLoading: false,
    isInitializing: true,
    
    biometricSupported: false,
    biometricEnabled: false,
    biometricTypes: [],
    
    error: null,

    /**
     * Initialize authentication state and listeners
     */
    initialize: async () => {
      try {
        set({ isInitializing: true, error: null });

        // Check biometric support
        const biometricSupported = await LocalAuthentication.hasHardwareAsync();
        const biometricTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
        const biometricEnabled = await BiometricStorage.isBiometricEnabled();

        set({
          biometricSupported,
          biometricTypes,
          biometricEnabled,
        });

        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting initial session:', error);
          set({ error: error.message });
        } else if (session) {
          set({
            isAuthenticated: true,
            user: session.user,
            session,
          });

          // Load user profile
          await get().refreshProfile();
        }

        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('Auth state changed:', event, session?.user?.email);

          switch (event) {
            case 'SIGNED_IN':
              if (session) {
                set({
                  isAuthenticated: true,
                  user: session.user,
                  session,
                  error: null,
                });
                await get().refreshProfile();
              }
              break;

            case 'SIGNED_OUT':
              set({
                isAuthenticated: false,
                user: null,
                session: null,
                userProfile: null,
                error: null,
              });
              // Clear secure storage
              await AuthStorage.clearAuth();
              break;

            case 'TOKEN_REFRESHED':
              if (session) {
                set({
                  session,
                  user: session.user,
                });
                // Store refreshed session
                await AuthStorage.storeSession(session);
              }
              break;

            case 'PASSWORD_RECOVERY':
              set({ error: null });
              break;

            default:
              break;
          }
        });

        // Store subscription for cleanup
        (window as any).__authSubscription = subscription;

      } catch (error: any) {
        console.error('Authentication initialization error:', error);
        set({ error: error?.message || 'Failed to initialize authentication' });
      } finally {
        set({ isInitializing: false });
      }
    },

    /**
     * Sign in with email and password
     */
    signIn: async (email: string, password: string) => {
      try {
        set({ isLoading: true, error: null });

        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (error) {
          set({ error: error.message });
          return { success: false, error: error.message };
        }

        if (data.session) {
          await AuthStorage.storeSession(data.session);
        }

        return { success: true };
      } catch (error: any) {
        const errorMessage = error?.message || 'Sign in failed';
        set({ error: errorMessage });
        return { success: false, error: errorMessage };
      } finally {
        set({ isLoading: false });
      }
    },

    /**
     * Sign up with email and password
     */
    signUp: async (email: string, password: string, fullName?: string) => {
      try {
        set({ isLoading: true, error: null });

        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              full_name: fullName?.trim() || null,
            },
          },
        });

        if (error) {
          set({ error: error.message });
          return { success: false, error: error.message };
        }

        // Check if email confirmation is required
        if (data.user && !data.session) {
          return { 
            success: true, 
            error: 'Please check your email and click the confirmation link to complete registration.' 
          };
        }

        return { success: true };
      } catch (error: any) {
        const errorMessage = error.message || 'Sign up failed';
        set({ error: errorMessage });
        return { success: false, error: errorMessage };
      } finally {
        set({ isLoading: false });
      }
    },

    /**
     * Sign out current user
     */
    signOut: async () => {
      try {
        set({ isLoading: true, error: null });

        const { error } = await supabase.auth.signOut();

        if (error) {
          console.error('Sign out error:', error);
          set({ error: error.message });
        }

        // Clear local state and storage
        set({
          isAuthenticated: false,
          user: null,
          session: null,
          userProfile: null,
          error: null,
        });

        await AuthStorage.clearAuth();

      } catch (error: any) {
        console.error('Sign out error:', error);
        set({ error: error.message || 'Sign out failed' });
      } finally {
        set({ isLoading: false });
      }
    },

    /**
     * Reset password
     */
    resetPassword: async (email: string) => {
      try {
        set({ isLoading: true, error: null });

        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: 'alarmwhitenoiseapp://auth/reset-password',
        });

        if (error) {
          set({ error: error.message });
          return { success: false, error: error.message };
        }

        return { success: true };
      } catch (error: any) {
        const errorMessage = error.message || 'Password reset failed';
        set({ error: errorMessage });
        return { success: false, error: errorMessage };
      } finally {
        set({ isLoading: false });
      }
    },

    /**
     * Sign in with Google OAuth
     */
    signInWithGoogle: async () => {
      try {
        set({ isLoading: true, error: null });

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: 'alarmwhitenoiseapp://auth/callback',
          },
        });

        if (error) {
          set({ error: error.message });
          return { success: false, error: error.message };
        }

        return { success: true };
      } catch (error: any) {
        const errorMessage = error.message || 'Google sign in failed';
        set({ error: errorMessage });
        return { success: false, error: errorMessage };
      } finally {
        set({ isLoading: false });
      }
    },

    /**
     * Sign in with Apple OAuth
     */
    signInWithApple: async () => {
      try {
        set({ isLoading: true, error: null });

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'apple',
          options: {
            redirectTo: 'alarmwhitenoiseapp://auth/callback',
          },
        });

        if (error) {
          set({ error: error.message });
          return { success: false, error: error.message };
        }

        return { success: true };
      } catch (error: any) {
        const errorMessage = error.message || 'Apple sign in failed';
        set({ error: errorMessage });
        return { success: false, error: errorMessage };
      } finally {
        set({ isLoading: false });
      }
    },

    /**
     * Set up biometric authentication
     */
    setupBiometric: async () => {
      try {
        const { biometricSupported } = get();
        
        if (!biometricSupported) {
          return { success: false, error: 'Biometric authentication not supported on this device' };
        }

        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Enable biometric authentication for quick access',
          cancelLabel: 'Cancel',
          fallbackLabel: 'Use password',
        });

        if (result.success) {
          await BiometricStorage.setBiometricEnabled(true);
          set({ biometricEnabled: true });
          return { success: true };
        } else {
          return { success: false, error: 'Biometric authentication setup cancelled' };
        }
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to set up biometric authentication' };
      }
    },

    /**
     * Authenticate using biometrics
     */
    authenticateWithBiometric: async () => {
      try {
        const { biometricSupported, biometricEnabled } = get();
        
        if (!biometricSupported || !biometricEnabled) {
          return { success: false, error: 'Biometric authentication not available' };
        }

        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Authenticate to access your alarms',
          cancelLabel: 'Cancel',
          fallbackLabel: 'Use password',
        });

        if (result.success) {
          return { success: true };
        } else {
          return { success: false, error: 'Biometric authentication failed' };
        }
      } catch (error: any) {
        return { success: false, error: error.message || 'Biometric authentication error' };
      }
    },

    /**
     * Disable biometric authentication
     */
    disableBiometric: async () => {
      await BiometricStorage.setBiometricEnabled(false);
      set({ biometricEnabled: false });
    },

    /**
     * Update user profile
     */
    updateProfile: async (updates: Partial<UserProfile>) => {
      try {
        set({ isLoading: true, error: null });

        const { user } = get();
        if (!user) {
          return { success: false, error: 'Not authenticated' };
        }

        const { data, error } = await supabase
          .from('users')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)
          .select('*')
          .single();

        if (error) {
          set({ error: error.message });
          return { success: false, error: error.message };
        }

        if (data) {
          set({ userProfile: data as UserProfile });
        }

        return { success: true };
      } catch (error: any) {
        const errorMessage = error.message || 'Profile update failed';
        set({ error: errorMessage });
        return { success: false, error: errorMessage };
      } finally {
        set({ isLoading: false });
      }
    },

    /**
     * Refresh user profile from database
     */
    refreshProfile: async () => {
      try {
        const { user } = get();
        if (!user) return;

        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error refreshing profile:', error);
          return;
        }

        if (data) {
          set({ userProfile: data as UserProfile });
        }
      } catch (error) {
        console.error('Profile refresh error:', error);
      }
    },

    /**
     * Refresh session
     */
    refreshSession: async () => {
      try {
        const { data, error } = await supabase.auth.refreshSession();

        if (error) {
          console.error('Session refresh error:', error);
          return;
        }

        if (data.session) {
          set({
            session: data.session,
            user: data.user,
          });
          await AuthStorage.storeSession(data.session);
        }
      } catch (error) {
        console.error('Session refresh error:', error);
      }
    },

    /**
     * Clear current error
     */
    clearError: () => set({ error: null }),

    /**
     * Check if user has premium subscription
     */
    isPremiumUser: () => {
      const { userProfile } = get();
      if (!userProfile) return false;

      const now = new Date();
      const expiresAt = userProfile.subscription_expires_at 
        ? new Date(userProfile.subscription_expires_at) 
        : null;

      return (
        userProfile.is_premium &&
        userProfile.subscription_status === 'premium' &&
        (!expiresAt || now < expiresAt)
      );
    },
  }))
);

/**
 * Initialize auth store (call this in App.tsx)
 */
export const initializeAuth = async () => {
  await useAuthStore.getState().initialize();
};

/**
 * Clean up auth subscriptions
 */
export const cleanupAuth = () => {
  const subscription = (window as any).__authSubscription;
  if (subscription) {
    subscription.unsubscribe();
    delete (window as any).__authSubscription;
  }
};