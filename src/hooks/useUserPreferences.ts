/**
 * User Preferences Hook
 * 
 * Custom React hook for managing user preferences with automatic syncing,
 * validation, and convenient access to preference values for components.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useUserPreferencesStore } from '../store/user-preferences-store';
import { useAuthStore } from '../store/auth-store';
import { analyticsService } from '../services/analytics-service';
import type {
  DefaultAlarmConfig,
  DefaultWhiteNoiseConfig,
  NotificationPreferences,
  AppPreferences,
  CombinedPreferences,
} from '../store/user-preferences-store';

export interface UseUserPreferencesOptions {
  /** Auto-sync changes with server */
  autoSync?: boolean;
  /** Track preference changes in analytics */
  trackAnalytics?: boolean;
  /** Initialize preferences on mount */
  autoInitialize?: boolean;
  /** Callback when preferences are updated */
  onPreferencesUpdate?: (preferences: CombinedPreferences) => void;
  /** Callback when sync fails */
  onSyncError?: (error: string) => void;
}

export interface UseUserPreferencesReturn {
  // Current preferences
  preferences: CombinedPreferences | null;
  defaultAlarmConfig: DefaultAlarmConfig | null;
  defaultWhiteNoiseConfig: DefaultWhiteNoiseConfig | null;
  notificationPreferences: NotificationPreferences | null;
  appPreferences: AppPreferences | null;
  
  // Sync status
  isSyncing: boolean;
  lastSyncTime: Date | null;
  hasPendingChanges: boolean;
  syncConflicts: string[];
  
  // Loading states
  isLoading: boolean;
  isInitialized: boolean;
  
  // Error handling
  error: string | null;
  clearError: () => void;
  
  // Preference management
  updateAlarmDefaults: (config: Partial<DefaultAlarmConfig>) => Promise<{ success: boolean; error?: string }>;
  updateWhiteNoiseDefaults: (config: Partial<DefaultWhiteNoiseConfig>) => Promise<{ success: boolean; error?: string }>;
  updateNotificationPreferences: (prefs: Partial<NotificationPreferences>) => Promise<{ success: boolean; error?: string }>;
  updateAppPreferences: (prefs: Partial<AppPreferences>) => Promise<{ success: boolean; error?: string }>;
  updateAllPreferences: (prefs: Partial<CombinedPreferences>) => Promise<{ success: boolean; error?: string }>;
  
  // Sound management
  addPreferredSound: (soundUrl: string) => Promise<{ success: boolean; error?: string }>;
  removePreferredSound: (soundUrl: string) => Promise<{ success: boolean; error?: string }>;
  reorderPreferredSounds: (soundUrls: string[]) => Promise<{ success: boolean; error?: string }>;
  
  // Utility methods
  getDefaultsForAlarm: () => Partial<any>;
  getDefaultsForWhiteNoise: () => Partial<any>;
  resetToDefaults: () => Promise<{ success: boolean; error?: string }>;
  syncWithServer: () => Promise<{ success: boolean; error?: string }>;
  
  // Import/Export
  exportPreferences: () => string;
  importPreferences: (json: string) => Promise<{ success: boolean; error?: string }>;
  
  // Theme and appearance helpers
  isDarkMode: boolean;
  systemTheme: 'light' | 'dark';
  effectiveTheme: 'light' | 'dark';
  
  // Notification helpers
  areNotificationsEnabled: boolean;
  isPushNotificationsEnabled: boolean;
  isDoNotDisturbActive: boolean;
  
  // Validation helpers
  validateAlarmConfig: (config: Partial<DefaultAlarmConfig>) => { valid: boolean; errors: string[] };
  validateWhiteNoiseConfig: (config: Partial<DefaultWhiteNoiseConfig>) => { valid: boolean; errors: string[] };
}

export function useUserPreferences(
  options: UseUserPreferencesOptions = {}
): UseUserPreferencesReturn {
  const {
    autoSync = true,
    trackAnalytics = true,
    autoInitialize = true,
    onPreferencesUpdate,
    onSyncError,
  } = options;

  // Store state
  const store = useUserPreferencesStore();
  const { isAuthenticated } = useAuthStore();
  
  // Initialize preferences on mount
  useEffect(() => {
    if (autoInitialize && !store.preferences) {
      store.initializePreferences();
    }
  }, [autoInitialize, store.preferences]);

  // Auto-sync when authenticated status changes
  useEffect(() => {
    if (isAuthenticated && store.hasPendingChanges && autoSync) {
      store.syncWithServer().catch(error => {
        console.error('Auto-sync failed:', error);
        onSyncError?.(error.message || 'Sync failed');
      });
    }
  }, [isAuthenticated, store.hasPendingChanges, autoSync, onSyncError]);

  // Handle preference updates callback
  useEffect(() => {
    if (store.preferences && onPreferencesUpdate) {
      onPreferencesUpdate(store.preferences);
    }
  }, [store.preferences, onPreferencesUpdate]);

  // Derived state
  const derivedState = useMemo(() => {
    const preferences = store.preferences;
    const defaultAlarmConfig = preferences?.defaultAlarmConfig || null;
    const defaultWhiteNoiseConfig = preferences?.defaultWhiteNoiseConfig || null;
    const notificationPreferences = preferences?.notificationPreferences || null;
    const appPreferences = preferences?.appPreferences || null;
    
    // Theme calculations
    const systemTheme = 'light' as 'light' | 'dark'; // Would get from system
    const isDarkMode = appPreferences?.theme === 'dark' || 
                       (appPreferences?.theme === 'auto' && systemTheme === 'dark');
    const effectiveTheme: 'light' | 'dark' = isDarkMode ? 'dark' : 'light';
    
    // Notification helpers
    const areNotificationsEnabled = notificationPreferences?.notificationsEnabled ?? true;
    const isPushNotificationsEnabled = notificationPreferences?.pushNotificationsEnabled ?? true;
    
    // Do not disturb calculation
    const isDoNotDisturbActive = calculateDoNotDisturbStatus(notificationPreferences);
    
    return {
      defaultAlarmConfig,
      defaultWhiteNoiseConfig,
      notificationPreferences,
      appPreferences,
      systemTheme,
      isDarkMode,
      effectiveTheme,
      areNotificationsEnabled,
      isPushNotificationsEnabled,
      isDoNotDisturbActive,
    };
  }, [store.preferences]);

  // Enhanced update methods with analytics
  const updateAlarmDefaults = useCallback(async (config: Partial<DefaultAlarmConfig>) => {
    const result = await store.updateDefaultAlarmConfig(config);
    
    if (trackAnalytics && result.success) {
      await analyticsService.trackEvent('preference_updated', {
        category: 'alarm_defaults',
        changed_fields: Object.keys(config),
      });
    }
    
    return result;
  }, [store.updateDefaultAlarmConfig, trackAnalytics]);

  const updateWhiteNoiseDefaults = useCallback(async (config: Partial<DefaultWhiteNoiseConfig>) => {
    const result = await store.updateDefaultWhiteNoiseConfig(config);
    
    if (trackAnalytics && result.success) {
      await analyticsService.trackEvent('preference_updated', {
        category: 'white_noise_defaults',
        changed_fields: Object.keys(config),
      });
    }
    
    return result;
  }, [store.updateDefaultWhiteNoiseConfig, trackAnalytics]);

  const updateNotificationPreferences = useCallback(async (prefs: Partial<NotificationPreferences>) => {
    const result = await store.updateNotificationPreferences(prefs);
    
    if (trackAnalytics && result.success) {
      await analyticsService.trackEvent('preference_updated', {
        category: 'notifications',
        changed_fields: Object.keys(prefs),
      });
    }
    
    return result;
  }, [store.updateNotificationPreferences, trackAnalytics]);

  const updateAppPreferences = useCallback(async (prefs: Partial<AppPreferences>) => {
    const result = await store.updateAppPreferences(prefs);
    
    if (trackAnalytics && result.success) {
      await analyticsService.trackEvent('preference_updated', {
        category: 'app_preferences',
        changed_fields: Object.keys(prefs),
      });
    }
    
    return result;
  }, [store.updateAppPreferences, trackAnalytics]);

  const updateAllPreferences = useCallback(async (prefs: Partial<CombinedPreferences>) => {
    const result = await store.updateAllPreferences(prefs);
    
    if (trackAnalytics && result.success) {
      await analyticsService.trackEvent('preference_updated', {
        category: 'bulk_update',
        changed_categories: Object.keys(prefs),
      });
    }
    
    return result;
  }, [store.updateAllPreferences, trackAnalytics]);

  const addPreferredSound = useCallback(async (soundUrl: string) => {
    const result = await store.addPreferredSound(soundUrl);
    
    if (trackAnalytics && result.success) {
      await analyticsService.trackEvent('white_noise_changed', {
        action: 'sound_added',
        sound_url: soundUrl,
      });
    }
    
    return result;
  }, [store.addPreferredSound, trackAnalytics]);

  const removePreferredSound = useCallback(async (soundUrl: string) => {
    const result = await store.removePreferredSound(soundUrl);
    
    if (trackAnalytics && result.success) {
      await analyticsService.trackEvent('white_noise_changed', {
        action: 'sound_removed',
        sound_url: soundUrl,
      });
    }
    
    return result;
  }, [store.removePreferredSound, trackAnalytics]);

  const reorderPreferredSounds = useCallback(async (soundUrls: string[]) => {
    const result = await store.reorderPreferredSounds(soundUrls);
    
    if (trackAnalytics && result.success) {
      await analyticsService.trackEvent('white_noise_changed', {
        action: 'sounds_reordered',
        sound_count: soundUrls.length,
      });
    }
    
    return result;
  }, [store.reorderPreferredSounds, trackAnalytics]);

  const resetToDefaults = useCallback(async () => {
    const result = await store.resetToDefaults();
    
    if (trackAnalytics && result.success) {
      await analyticsService.trackEvent('preference_updated', {
        category: 'reset_to_defaults',
        action: 'bulk_reset',
      });
    }
    
    return result;
  }, [store.resetToDefaults, trackAnalytics]);

  const syncWithServer = useCallback(async () => {
    const result = await store.syncWithServer();
    
    if (trackAnalytics) {
      await analyticsService.trackEvent('preference_updated', {
        category: 'sync',
        action: result.success ? 'sync_success' : 'sync_failed',
        error: result.success ? undefined : result.error,
      });
    }
    
    return result;
  }, [store.syncWithServer, trackAnalytics]);

  const importPreferences = useCallback(async (json: string) => {
    const result = await store.importPreferences(json);
    
    if (trackAnalytics && result.success) {
      await analyticsService.trackEvent('preference_updated', {
        category: 'import_export',
        action: 'preferences_imported',
      });
    }
    
    return result;
  }, [store.importPreferences, trackAnalytics]);

  // Validation helpers
  const validateAlarmConfig = useCallback((config: Partial<DefaultAlarmConfig>) => {
    const errors: string[] = [];
    let valid = true;

    if (config.defaultVolume !== undefined) {
      if (config.defaultVolume < 0 || config.defaultVolume > 1) {
        errors.push('Volume must be between 0 and 1');
        valid = false;
      }
    }

    if (config.defaultSnoozeDuration !== undefined) {
      if (config.defaultSnoozeDuration < 1 || config.defaultSnoozeDuration > 60) {
        errors.push('Snooze duration must be between 1 and 60 minutes');
        valid = false;
      }
    }

    if (config.defaultFadeInDuration !== undefined) {
      if (config.defaultFadeInDuration < 0 || config.defaultFadeInDuration > 300) {
        errors.push('Fade in duration must be between 0 and 300 seconds');
        valid = false;
      }
    }

    if (config.defaultFadeOutDuration !== undefined) {
      if (config.defaultFadeOutDuration < 0 || config.defaultFadeOutDuration > 300) {
        errors.push('Fade out duration must be between 0 and 300 seconds');
        valid = false;
      }
    }

    return { valid, errors };
  }, []);

  const validateWhiteNoiseConfig = useCallback((config: Partial<DefaultWhiteNoiseConfig>) => {
    const errors: string[] = [];
    let valid = true;

    if (config.defaultWhiteNoiseVolume !== undefined) {
      if (config.defaultWhiteNoiseVolume < 0 || config.defaultWhiteNoiseVolume > 1) {
        errors.push('White noise volume must be between 0 and 1');
        valid = false;
      }
    }

    if (config.defaultWhiteNoiseDuration !== undefined && config.defaultWhiteNoiseDuration !== null) {
      if (config.defaultWhiteNoiseDuration < 1 || config.defaultWhiteNoiseDuration > 1440) {
        errors.push('White noise duration must be between 1 and 1440 minutes');
        valid = false;
      }
    }

    if (config.crossfadeDuration !== undefined) {
      if (config.crossfadeDuration < 0 || config.crossfadeDuration > 30) {
        errors.push('Crossfade duration must be between 0 and 30 seconds');
        valid = false;
      }
    }

    return { valid, errors };
  }, []);

  return {
    // Current preferences
    preferences: store.preferences,
    defaultAlarmConfig: derivedState.defaultAlarmConfig,
    defaultWhiteNoiseConfig: derivedState.defaultWhiteNoiseConfig,
    notificationPreferences: derivedState.notificationPreferences,
    appPreferences: derivedState.appPreferences,
    
    // Sync status
    isSyncing: store.isSyncing,
    lastSyncTime: store.lastSyncTime,
    hasPendingChanges: store.hasPendingChanges,
    syncConflicts: store.syncConflicts,
    
    // Loading states
    isLoading: store.isLoading,
    isInitialized: !!store.preferences,
    
    // Error handling
    error: store.error,
    clearError: store.clearError,
    
    // Preference management
    updateAlarmDefaults,
    updateWhiteNoiseDefaults,
    updateNotificationPreferences,
    updateAppPreferences,
    updateAllPreferences,
    
    // Sound management
    addPreferredSound,
    removePreferredSound,
    reorderPreferredSounds,
    
    // Utility methods
    getDefaultsForAlarm: store.getDefaultsForNewAlarm,
    getDefaultsForWhiteNoise: store.getDefaultsForNewWhiteNoiseSession,
    resetToDefaults,
    syncWithServer,
    
    // Import/Export
    exportPreferences: store.exportPreferences,
    importPreferences,
    
    // Theme and appearance helpers
    isDarkMode: derivedState.isDarkMode,
    systemTheme: derivedState.systemTheme,
    effectiveTheme: derivedState.effectiveTheme,
    
    // Notification helpers
    areNotificationsEnabled: derivedState.areNotificationsEnabled,
    isPushNotificationsEnabled: derivedState.isPushNotificationsEnabled,
    isDoNotDisturbActive: derivedState.isDoNotDisturbActive,
    
    // Validation helpers
    validateAlarmConfig,
    validateWhiteNoiseConfig,
  };
}

// Helper function for do not disturb calculation
function calculateDoNotDisturbStatus(prefs: NotificationPreferences | null): boolean {
  if (!prefs?.doNotDisturbEnabled || !prefs.doNotDisturbStart || !prefs.doNotDisturbEnd) {
    return false;
  }
  
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const [startHour, startMin] = prefs.doNotDisturbStart.split(':').map(Number);
  const [endHour, endMin] = prefs.doNotDisturbEnd.split(':').map(Number);
  
  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;
  
  // Handle overnight do not disturb period
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime <= endTime;
  } else {
    return currentTime >= startTime && currentTime <= endTime;
  }
}