/**
 * User Preferences Store for Alarm & White Noise App
 * 
 * Zustand-based state management for user preferences including
 * default alarm settings, white noise preferences, volume preferences,
 * and notification preferences. Syncs with Supabase user_preferences table.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { supabase } from '../lib/supabase/client';
import { useAuthStore } from './auth-store';
import type { UserPreferences, UserPreferencesUpdate } from '../types/database';

// Default alarm configuration
export interface DefaultAlarmConfig {
  defaultVolume: number;
  defaultAudioOutput: 'speaker' | 'headphones' | 'auto';
  defaultSnoozeDuration: number; // minutes
  defaultSnoozeEnabled: boolean;
  defaultVibrationEnabled: boolean;
  defaultFadeInDuration: number; // seconds
  defaultFadeOutDuration: number; // seconds
}

// Default white noise configuration
export interface DefaultWhiteNoiseConfig {
  defaultWhiteNoiseVolume: number;
  defaultWhiteNoiseCategory: 'nature' | 'ambient' | 'mechanical' | 'binaural' | 'custom' | null;
  defaultWhiteNoiseDuration: number | null; // minutes, null for continuous
  preferredSounds: string[]; // Array of sound file URLs or IDs
  shuffleEnabled: boolean;
  crossfadeEnabled: boolean;
  crossfadeDuration: number; // seconds
}

// Notification preferences
export interface NotificationPreferences {
  notificationsEnabled: boolean;
  pushNotificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  weeklyReportsEnabled: boolean;
  reminderNotificationsEnabled: boolean;
  reminderAdvanceTime: number; // minutes before alarm
  doNotDisturbEnabled: boolean;
  doNotDisturbStart: string | null; // HH:MM format
  doNotDisturbEnd: string | null; // HH:MM format
  respectSystemDoNotDisturb: boolean;
}

// App preferences
export interface AppPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  batteryOptimizationEnabled: boolean;
  analytics_enabled: boolean;
  crash_reporting_enabled: boolean;
  hapticFeedbackEnabled: boolean;
  keepScreenOn: boolean;
  showTutorialTips: boolean;
  autoStartLastSession: boolean;
}

// Combined preferences interface
export interface CombinedPreferences {
  defaultAlarmConfig: DefaultAlarmConfig;
  defaultWhiteNoiseConfig: DefaultWhiteNoiseConfig;
  notificationPreferences: NotificationPreferences;
  appPreferences: AppPreferences;
}

export interface UserPreferencesState {
  // Current preferences
  preferences: CombinedPreferences | null;
  serverPreferences: UserPreferences | null;
  
  // Synchronization
  isSyncing: boolean;
  lastSyncTime: Date | null;
  hasPendingChanges: boolean;
  syncConflicts: string[];
  
  // Loading states
  isLoading: boolean;
  isUpdating: boolean;
  
  // Error handling
  error: string | null;
  
  // Methods - Initialization & Sync
  initializePreferences: () => Promise<{ success: boolean; error?: string }>;
  syncWithServer: () => Promise<{ success: boolean; error?: string }>;
  resetToDefaults: () => Promise<{ success: boolean; error?: string }>;
  
  // Methods - Default Alarm Config
  updateDefaultAlarmConfig: (config: Partial<DefaultAlarmConfig>) => Promise<{ success: boolean; error?: string }>;
  
  // Methods - Default White Noise Config
  updateDefaultWhiteNoiseConfig: (config: Partial<DefaultWhiteNoiseConfig>) => Promise<{ success: boolean; error?: string }>;
  addPreferredSound: (soundUrl: string) => Promise<{ success: boolean; error?: string }>;
  removePreferredSound: (soundUrl: string) => Promise<{ success: boolean; error?: string }>;
  reorderPreferredSounds: (soundUrls: string[]) => Promise<{ success: boolean; error?: string }>;
  
  // Methods - Notification Preferences
  updateNotificationPreferences: (preferences: Partial<NotificationPreferences>) => Promise<{ success: boolean; error?: string }>;
  
  // Methods - App Preferences
  updateAppPreferences: (preferences: Partial<AppPreferences>) => Promise<{ success: boolean; error?: string }>;
  
  // Methods - Bulk Operations
  updateAllPreferences: (preferences: Partial<CombinedPreferences>) => Promise<{ success: boolean; error?: string }>;
  exportPreferences: () => string;
  importPreferences: (preferencesJson: string) => Promise<{ success: boolean; error?: string }>;
  
  // Methods - Utility
  clearError: () => void;
  getDefaultsForNewAlarm: () => Partial<any>; // Returns default values for new alarm creation
  getDefaultsForNewWhiteNoiseSession: () => Partial<any>; // Returns default values for new white noise session
}

// Default preference values
const DEFAULT_ALARM_CONFIG: DefaultAlarmConfig = {
  defaultVolume: 0.7,
  defaultAudioOutput: 'auto',
  defaultSnoozeDuration: 9,
  defaultSnoozeEnabled: true,
  defaultVibrationEnabled: true,
  defaultFadeInDuration: 30,
  defaultFadeOutDuration: 10,
};

const DEFAULT_WHITE_NOISE_CONFIG: DefaultWhiteNoiseConfig = {
  defaultWhiteNoiseVolume: 0.5,
  defaultWhiteNoiseCategory: 'nature',
  defaultWhiteNoiseDuration: null, // Continuous by default
  preferredSounds: [],
  shuffleEnabled: false,
  crossfadeEnabled: true,
  crossfadeDuration: 3,
};

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  notificationsEnabled: true,
  pushNotificationsEnabled: true,
  emailNotificationsEnabled: false,
  weeklyReportsEnabled: false,
  reminderNotificationsEnabled: true,
  reminderAdvanceTime: 15,
  doNotDisturbEnabled: false,
  doNotDisturbStart: '22:00',
  doNotDisturbEnd: '07:00',
  respectSystemDoNotDisturb: true,
};

const DEFAULT_APP_PREFERENCES: AppPreferences = {
  theme: 'auto',
  language: 'en',
  batteryOptimizationEnabled: true,
  analytics_enabled: true,
  crash_reporting_enabled: true,
  hapticFeedbackEnabled: true,
  keepScreenOn: false,
  showTutorialTips: true,
  autoStartLastSession: false,
};

const DEFAULT_COMBINED_PREFERENCES: CombinedPreferences = {
  defaultAlarmConfig: DEFAULT_ALARM_CONFIG,
  defaultWhiteNoiseConfig: DEFAULT_WHITE_NOISE_CONFIG,
  notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
  appPreferences: DEFAULT_APP_PREFERENCES,
};

export const useUserPreferencesStore = create<UserPreferencesState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Initial state
      preferences: null,
      serverPreferences: null,
      
      isSyncing: false,
      lastSyncTime: null,
      hasPendingChanges: false,
      syncConflicts: [],
      
      isLoading: false,
      isUpdating: false,
      
      error: null,

      /**
       * Initialize preferences from server or defaults
       */
      initializePreferences: async () => {
        try {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          const authState = useAuthStore.getState();
          
          if (!authState.isAuthenticated || !authState.user) {
            // Load local defaults for unauthenticated users
            set((state) => {
              state.preferences = DEFAULT_COMBINED_PREFERENCES;
              state.isLoading = false;
            });
            return { success: true };
          }

          // Fetch preferences from server
          const { data: serverPrefs, error } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', authState.user.id)
            .single();

          if (error && error.code !== 'PGRST116') { // Not found is ok
            console.error('Error fetching preferences:', error);
            set((state) => {
              state.error = error.message;
              state.isLoading = false;
            });
            return { success: false, error: error.message };
          }

          if (serverPrefs) {
            // Convert server preferences to combined format
            const combinedPrefs = convertServerToClientPreferences(serverPrefs);
            
            set((state) => {
              state.preferences = combinedPrefs;
              state.serverPreferences = serverPrefs;
              state.lastSyncTime = new Date();
              state.isLoading = false;
            });
          } else {
            // Create default preferences for new user
            const result = await get().resetToDefaults();
            if (!result.success) {
              return result;
            }
          }

          console.log('User preferences initialized');
          return { success: true };

        } catch (error: any) {
          const errorMessage = error?.message || 'Failed to initialize preferences';
          console.error('Preferences initialization error:', error);
          
          set((state) => {
            state.error = errorMessage;
            state.isLoading = false;
          });

          return { success: false, error: errorMessage };
        }
      },

      /**
       * Sync preferences with server
       */
      syncWithServer: async () => {
        try {
          const { preferences, hasPendingChanges } = get();
          const authState = useAuthStore.getState();
          
          if (!authState.isAuthenticated || !authState.user || !preferences || !hasPendingChanges) {
            return { success: true }; // Nothing to sync
          }

          set((state) => {
            state.isSyncing = true;
            state.error = null;
          });

          // Convert client preferences to server format
          const serverPrefs = convertClientToServerPreferences(preferences, authState.user.id);

          // Update or insert preferences
          const { data, error } = await supabase
            .from('user_preferences')
            .upsert(serverPrefs)
            .select('*')
            .single();

          if (error) {
            console.error('Error syncing preferences:', error);
            set((state) => {
              state.error = error.message;
              state.isSyncing = false;
            });
            return { success: false, error: error.message };
          }

          set((state) => {
            state.serverPreferences = data;
            state.lastSyncTime = new Date();
            state.hasPendingChanges = false;
            state.isSyncing = false;
          });

          console.log('Preferences synced successfully');
          return { success: true };

        } catch (error: any) {
          const errorMessage = error?.message || 'Failed to sync preferences';
          console.error('Preferences sync error:', error);
          
          set((state) => {
            state.error = errorMessage;
            state.isSyncing = false;
          });

          return { success: false, error: errorMessage };
        }
      },

      /**
       * Reset preferences to defaults
       */
      resetToDefaults: async () => {
        try {
          set((state) => {
            state.isUpdating = true;
            state.error = null;
          });

          set((state) => {
            state.preferences = { ...DEFAULT_COMBINED_PREFERENCES };
            state.hasPendingChanges = true;
            state.isUpdating = false;
          });

          // Sync with server
          const syncResult = await get().syncWithServer();
          if (!syncResult.success) {
            return syncResult;
          }

          console.log('Preferences reset to defaults');
          return { success: true };

        } catch (error: any) {
          const errorMessage = error?.message || 'Failed to reset preferences';
          console.error('Reset preferences error:', error);
          
          set((state) => {
            state.error = errorMessage;
            state.isUpdating = false;
          });

          return { success: false, error: errorMessage };
        }
      },

      /**
       * Update default alarm configuration
       */
      updateDefaultAlarmConfig: async (config: Partial<DefaultAlarmConfig>) => {
        try {
          const { preferences } = get();
          if (!preferences) {
            return { success: false, error: 'Preferences not initialized' };
          }

          set((state) => {
            if (state.preferences) {
              state.preferences.defaultAlarmConfig = {
                ...state.preferences.defaultAlarmConfig,
                ...config,
              };
              state.hasPendingChanges = true;
            }
          });

          // Auto-sync if user is authenticated
          const authState = useAuthStore.getState();
          if (authState.isAuthenticated) {
            return await get().syncWithServer();
          }

          return { success: true };

        } catch (error: any) {
          const errorMessage = error?.message || 'Failed to update alarm config';
          console.error('Update alarm config error:', error);
          return { success: false, error: errorMessage };
        }
      },

      /**
       * Update default white noise configuration
       */
      updateDefaultWhiteNoiseConfig: async (config: Partial<DefaultWhiteNoiseConfig>) => {
        try {
          const { preferences } = get();
          if (!preferences) {
            return { success: false, error: 'Preferences not initialized' };
          }

          set((state) => {
            if (state.preferences) {
              state.preferences.defaultWhiteNoiseConfig = {
                ...state.preferences.defaultWhiteNoiseConfig,
                ...config,
              };
              state.hasPendingChanges = true;
            }
          });

          // Auto-sync if user is authenticated
          const authState = useAuthStore.getState();
          if (authState.isAuthenticated) {
            return await get().syncWithServer();
          }

          return { success: true };

        } catch (error: any) {
          const errorMessage = error?.message || 'Failed to update white noise config';
          console.error('Update white noise config error:', error);
          return { success: false, error: errorMessage };
        }
      },

      /**
       * Add preferred sound to list
       */
      addPreferredSound: async (soundUrl: string) => {
        try {
          const { preferences } = get();
          if (!preferences) {
            return { success: false, error: 'Preferences not initialized' };
          }

          set((state) => {
            if (state.preferences && !state.preferences.defaultWhiteNoiseConfig.preferredSounds.includes(soundUrl)) {
              state.preferences.defaultWhiteNoiseConfig.preferredSounds.push(soundUrl);
              state.hasPendingChanges = true;
            }
          });

          // Auto-sync if user is authenticated
          const authState = useAuthStore.getState();
          if (authState.isAuthenticated) {
            return await get().syncWithServer();
          }

          return { success: true };

        } catch (error: any) {
          const errorMessage = error?.message || 'Failed to add preferred sound';
          return { success: false, error: errorMessage };
        }
      },

      /**
       * Remove preferred sound from list
       */
      removePreferredSound: async (soundUrl: string) => {
        try {
          const { preferences } = get();
          if (!preferences) {
            return { success: false, error: 'Preferences not initialized' };
          }

          set((state) => {
            if (state.preferences) {
              state.preferences.defaultWhiteNoiseConfig.preferredSounds = 
                state.preferences.defaultWhiteNoiseConfig.preferredSounds.filter(url => url !== soundUrl);
              state.hasPendingChanges = true;
            }
          });

          // Auto-sync if user is authenticated
          const authState = useAuthStore.getState();
          if (authState.isAuthenticated) {
            return await get().syncWithServer();
          }

          return { success: true };

        } catch (error: any) {
          const errorMessage = error?.message || 'Failed to remove preferred sound';
          return { success: false, error: errorMessage };
        }
      },

      /**
       * Reorder preferred sounds list
       */
      reorderPreferredSounds: async (soundUrls: string[]) => {
        try {
          const { preferences } = get();
          if (!preferences) {
            return { success: false, error: 'Preferences not initialized' };
          }

          set((state) => {
            if (state.preferences) {
              state.preferences.defaultWhiteNoiseConfig.preferredSounds = [...soundUrls];
              state.hasPendingChanges = true;
            }
          });

          // Auto-sync if user is authenticated
          const authState = useAuthStore.getState();
          if (authState.isAuthenticated) {
            return await get().syncWithServer();
          }

          return { success: true };

        } catch (error: any) {
          const errorMessage = error?.message || 'Failed to reorder preferred sounds';
          return { success: false, error: errorMessage };
        }
      },

      /**
       * Update notification preferences
       */
      updateNotificationPreferences: async (newPreferences: Partial<NotificationPreferences>) => {
        try {
          const { preferences } = get();
          if (!preferences) {
            return { success: false, error: 'Preferences not initialized' };
          }

          set((state) => {
            if (state.preferences) {
              state.preferences.notificationPreferences = {
                ...state.preferences.notificationPreferences,
                ...newPreferences,
              };
              state.hasPendingChanges = true;
            }
          });

          // Auto-sync if user is authenticated
          const authState = useAuthStore.getState();
          if (authState.isAuthenticated) {
            return await get().syncWithServer();
          }

          return { success: true };

        } catch (error: any) {
          const errorMessage = error?.message || 'Failed to update notification preferences';
          return { success: false, error: errorMessage };
        }
      },

      /**
       * Update app preferences
       */
      updateAppPreferences: async (newPreferences: Partial<AppPreferences>) => {
        try {
          const { preferences } = get();
          if (!preferences) {
            return { success: false, error: 'Preferences not initialized' };
          }

          set((state) => {
            if (state.preferences) {
              state.preferences.appPreferences = {
                ...state.preferences.appPreferences,
                ...newPreferences,
              };
              state.hasPendingChanges = true;
            }
          });

          // Auto-sync if user is authenticated
          const authState = useAuthStore.getState();
          if (authState.isAuthenticated) {
            return await get().syncWithServer();
          }

          return { success: true };

        } catch (error: any) {
          const errorMessage = error?.message || 'Failed to update app preferences';
          return { success: false, error: errorMessage };
        }
      },

      /**
       * Update all preferences at once
       */
      updateAllPreferences: async (newPreferences: Partial<CombinedPreferences>) => {
        try {
          const { preferences } = get();
          if (!preferences) {
            return { success: false, error: 'Preferences not initialized' };
          }

          set((state) => {
            if (state.preferences) {
              state.preferences = {
                ...state.preferences,
                ...newPreferences,
              };
              state.hasPendingChanges = true;
            }
          });

          // Auto-sync if user is authenticated
          const authState = useAuthStore.getState();
          if (authState.isAuthenticated) {
            return await get().syncWithServer();
          }

          return { success: true };

        } catch (error: any) {
          const errorMessage = error?.message || 'Failed to update preferences';
          return { success: false, error: errorMessage };
        }
      },

      /**
       * Export preferences as JSON string
       */
      exportPreferences: () => {
        const { preferences } = get();
        if (!preferences) {
          return JSON.stringify(DEFAULT_COMBINED_PREFERENCES);
        }
        return JSON.stringify(preferences, null, 2);
      },

      /**
       * Import preferences from JSON string
       */
      importPreferences: async (preferencesJson: string) => {
        try {
          const importedPreferences = JSON.parse(preferencesJson) as CombinedPreferences;
          
          // Validate imported preferences structure
          if (!validatePreferencesStructure(importedPreferences)) {
            return { success: false, error: 'Invalid preferences format' };
          }

          // Merge with defaults to ensure all fields exist
          const mergedPreferences: CombinedPreferences = {
            defaultAlarmConfig: { ...DEFAULT_ALARM_CONFIG, ...importedPreferences.defaultAlarmConfig },
            defaultWhiteNoiseConfig: { ...DEFAULT_WHITE_NOISE_CONFIG, ...importedPreferences.defaultWhiteNoiseConfig },
            notificationPreferences: { ...DEFAULT_NOTIFICATION_PREFERENCES, ...importedPreferences.notificationPreferences },
            appPreferences: { ...DEFAULT_APP_PREFERENCES, ...importedPreferences.appPreferences },
          };

          set((state) => {
            state.preferences = mergedPreferences;
            state.hasPendingChanges = true;
          });

          // Auto-sync if user is authenticated
          const authState = useAuthStore.getState();
          if (authState.isAuthenticated) {
            const syncResult = await get().syncWithServer();
            if (!syncResult.success) {
              return syncResult;
            }
          }

          console.log('Preferences imported successfully');
          return { success: true };

        } catch (error: any) {
          const errorMessage = error?.message || 'Failed to import preferences - invalid JSON';
          console.error('Import preferences error:', error);
          return { success: false, error: errorMessage };
        }
      },

      /**
       * Clear current error
       */
      clearError: () => set((state) => {
        state.error = null;
      }),

      /**
       * Get default values for creating new alarm
       */
      getDefaultsForNewAlarm: () => {
        const { preferences } = get();
        if (!preferences) return {};

        const { defaultAlarmConfig } = preferences;
        return {
          volume: defaultAlarmConfig.defaultVolume,
          audio_output: defaultAlarmConfig.defaultAudioOutput,
          vibration_enabled: defaultAlarmConfig.defaultVibrationEnabled,
          snooze_enabled: defaultAlarmConfig.defaultSnoozeEnabled,
          snooze_duration: defaultAlarmConfig.defaultSnoozeDuration,
          fade_in_duration: defaultAlarmConfig.defaultFadeInDuration,
          fade_out_duration: defaultAlarmConfig.defaultFadeOutDuration,
        };
      },

      /**
       * Get default values for creating new white noise session
       */
      getDefaultsForNewWhiteNoiseSession: () => {
        const { preferences } = get();
        if (!preferences) return {};

        const { defaultWhiteNoiseConfig } = preferences;
        return {
          white_noise_volume: defaultWhiteNoiseConfig.defaultWhiteNoiseVolume,
          white_noise_category: defaultWhiteNoiseConfig.defaultWhiteNoiseCategory,
          white_noise_duration: defaultWhiteNoiseConfig.defaultWhiteNoiseDuration,
        };
      },
    }))
  )
);

// Helper functions
function convertServerToClientPreferences(serverPrefs: UserPreferences): CombinedPreferences {
  return {
    defaultAlarmConfig: {
      defaultVolume: serverPrefs.default_volume,
      defaultAudioOutput: serverPrefs.default_audio_output,
      defaultSnoozeDuration: serverPrefs.default_snooze_duration,
      defaultSnoozeEnabled: true, // Not stored in DB, using sensible default
      defaultVibrationEnabled: true, // Not stored in DB, using sensible default
      defaultFadeInDuration: serverPrefs.default_fade_in_duration,
      defaultFadeOutDuration: serverPrefs.default_fade_out_duration,
    },
    defaultWhiteNoiseConfig: {
      defaultWhiteNoiseVolume: serverPrefs.default_white_noise_volume,
      defaultWhiteNoiseCategory: null, // Not stored in DB
      defaultWhiteNoiseDuration: null, // Not stored in DB
      preferredSounds: [], // Would need to be stored as JSON in DB
      shuffleEnabled: false, // Not stored in DB
      crossfadeEnabled: true, // Not stored in DB
      crossfadeDuration: 3, // Not stored in DB
    },
    notificationPreferences: {
      notificationsEnabled: serverPrefs.notifications_enabled,
      pushNotificationsEnabled: serverPrefs.notifications_enabled,
      emailNotificationsEnabled: false, // Not stored in DB
      weeklyReportsEnabled: false, // Not stored in DB
      reminderNotificationsEnabled: true, // Not stored in DB
      reminderAdvanceTime: 15, // Not stored in DB
      doNotDisturbEnabled: serverPrefs.do_not_disturb_enabled,
      doNotDisturbStart: serverPrefs.do_not_disturb_start,
      doNotDisturbEnd: serverPrefs.do_not_disturb_end,
      respectSystemDoNotDisturb: true, // Not stored in DB
    },
    appPreferences: {
      theme: serverPrefs.dark_mode_enabled ? 'dark' : 'light',
      language: 'en', // Not stored in database
      batteryOptimizationEnabled: true, // Not stored in database
      analytics_enabled: serverPrefs.usage_analytics_enabled || false,
      crash_reporting_enabled: serverPrefs.crash_reporting_enabled || false,
      hapticFeedbackEnabled: true, // Not stored in DB
      keepScreenOn: false, // Not stored in DB
      showTutorialTips: true, // Not stored in database
      autoStartLastSession: false, // Not stored in DB
    },
  };
}

function convertClientToServerPreferences(clientPrefs: CombinedPreferences, userId: string): UserPreferencesUpdate {
  return {
    user_id: userId,
    default_audio_output: clientPrefs.defaultAlarmConfig.defaultAudioOutput,
    default_alarm_volume: clientPrefs.defaultAlarmConfig.defaultVolume,
    default_white_noise_volume: clientPrefs.defaultWhiteNoiseConfig.defaultWhiteNoiseVolume,
    default_snooze_duration: clientPrefs.defaultAlarmConfig.defaultSnoozeDuration,
    // default_fade_in_duration not in schema
    // default_fade_out_duration not in schema
    // notifications_enabled not in schema
    quiet_hours_enabled: clientPrefs.notificationPreferences.doNotDisturbEnabled,
    quiet_hours_start: clientPrefs.notificationPreferences.doNotDisturbStart,
    quiet_hours_end: clientPrefs.notificationPreferences.doNotDisturbEnd,
    dark_mode_enabled: clientPrefs.appPreferences.theme === 'dark',
    // language not in schema
    // battery_optimization_enabled not in schema
    usage_analytics_enabled: clientPrefs.appPreferences.analytics_enabled,
    crash_reporting_enabled: clientPrefs.appPreferences.crash_reporting_enabled,
    updated_at: new Date().toISOString(),
  };
}

function validatePreferencesStructure(preferences: any): preferences is CombinedPreferences {
  return (
    preferences &&
    typeof preferences === 'object' &&
    preferences.defaultAlarmConfig &&
    preferences.defaultWhiteNoiseConfig &&
    preferences.notificationPreferences &&
    preferences.appPreferences
  );
}

/**
 * Initialize user preferences store (call this in App.tsx)
 */
export const initializeUserPreferences = async () => {
  const result = await useUserPreferencesStore.getState().initializePreferences();
  if (result.success) {
    console.log('User preferences store initialized');
  } else {
    console.error('Failed to initialize user preferences:', result.error);
  }
  return result;
};