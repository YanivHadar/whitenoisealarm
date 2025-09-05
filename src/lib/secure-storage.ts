/**
 * Secure Storage Utility for Alarm & White Noise App
 * 
 * Provides encrypted storage for sensitive user data including
 * authentication tokens, biometric data, and user preferences.
 * Cross-platform compatibility with expo-secure-store.
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Storage keys
export const STORAGE_KEYS = {
  // Authentication
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_SESSION: 'user_session',
  BIOMETRIC_ENABLED: 'biometric_enabled',
  
  // User preferences (encrypted)
  USER_PREFERENCES: 'user_preferences',
  ALARM_SETTINGS: 'alarm_settings',
  AUDIO_PREFERENCES: 'audio_preferences',
  
  // Subscription data
  SUBSCRIPTION_STATUS: 'subscription_status',
  PURCHASE_TOKENS: 'purchase_tokens',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

/**
 * Secure storage interface for cross-platform compatibility
 */
class SecureStorageManager {
  private readonly isSecureStoreAvailable: boolean;

  constructor() {
    this.isSecureStoreAvailable = SecureStore.isAvailableAsync ? 
      SecureStore.isAvailableAsync() : 
      Platform.OS !== 'web';
  }

  /**
   * Store data securely with encryption
   */
  async setItem(key: StorageKey, value: string): Promise<void> {
    try {
      if (this.isSecureStoreAvailable) {
        await SecureStore.setItemAsync(key, value, {
          requireAuthentication: false, // Don't require biometric for every read
          keychainService: 'alarm-white-noise-app',
          accessGroup: Platform.OS === 'ios' ? 'group.alarm-white-noise-app' : undefined,
        });
      } else {
        // Fallback to AsyncStorage for web/unsupported platforms
        await AsyncStorage.setItem(`secure_${key}`, value);
      }
    } catch (error) {
      console.error(`Failed to store secure item ${key}:`, error);
      throw new Error(`Secure storage failed for key: ${key}`);
    }
  }

  /**
   * Retrieve data from secure storage
   */
  async getItem(key: StorageKey): Promise<string | null> {
    try {
      if (this.isSecureStoreAvailable) {
        return await SecureStore.getItemAsync(key, {
          keychainService: 'alarm-white-noise-app',
          accessGroup: Platform.OS === 'ios' ? 'group.alarm-white-noise-app' : undefined,
        });
      } else {
        // Fallback to AsyncStorage
        return await AsyncStorage.getItem(`secure_${key}`);
      }
    } catch (error) {
      console.error(`Failed to retrieve secure item ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove data from secure storage
   */
  async removeItem(key: StorageKey): Promise<void> {
    try {
      if (this.isSecureStoreAvailable) {
        await SecureStore.deleteItemAsync(key, {
          keychainService: 'alarm-white-noise-app',
        });
      } else {
        await AsyncStorage.removeItem(`secure_${key}`);
      }
    } catch (error) {
      console.error(`Failed to remove secure item ${key}:`, error);
      // Don't throw here - removal failures shouldn't block logout
    }
  }

  /**
   * Check if key exists in secure storage
   */
  async hasItem(key: StorageKey): Promise<boolean> {
    try {
      const value = await this.getItem(key);
      return value !== null;
    } catch (error) {
      console.error(`Failed to check secure item ${key}:`, error);
      return false;
    }
  }

  /**
   * Clear all secure data (for logout/account deletion)
   */
  async clearAll(): Promise<void> {
    const keys = Object.values(STORAGE_KEYS);
    
    await Promise.allSettled(
      keys.map(key => this.removeItem(key))
    );

    console.log('Secure storage cleared');
  }

  /**
   * Store JSON data securely
   */
  async setJSON<T>(key: StorageKey, value: T): Promise<void> {
    const jsonString = JSON.stringify(value);
    await this.setItem(key, jsonString);
  }

  /**
   * Retrieve JSON data from secure storage
   */
  async getJSON<T>(key: StorageKey): Promise<T | null> {
    try {
      const jsonString = await this.getItem(key);
      if (!jsonString) return null;
      
      return JSON.parse(jsonString) as T;
    } catch (error) {
      console.error(`Failed to parse JSON for ${key}:`, error);
      return null;
    }
  }
}

// Export singleton instance
export const secureStorage = new SecureStorageManager();

/**
 * Authentication token storage helpers
 */
export const AuthStorage = {
  /**
   * Store authentication session
   */
  async storeSession(session: any): Promise<void> {
    if (session?.access_token) {
      await secureStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, session.access_token);
    }
    if (session?.refresh_token) {
      await secureStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, session.refresh_token);
    }
    
    // Store complete session data
    await secureStorage.setJSON(STORAGE_KEYS.USER_SESSION, session);
  },

  /**
   * Retrieve stored authentication session
   */
  async getSession(): Promise<any | null> {
    return await secureStorage.getJSON(STORAGE_KEYS.USER_SESSION);
  },

  /**
   * Get stored access token
   */
  async getAccessToken(): Promise<string | null> {
    return await secureStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  },

  /**
   * Get stored refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    return await secureStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  },

  /**
   * Clear all authentication data
   */
  async clearAuth(): Promise<void> {
    await Promise.allSettled([
      secureStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN),
      secureStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
      secureStorage.removeItem(STORAGE_KEYS.USER_SESSION),
    ]);
  },
};

/**
 * Biometric authentication helpers
 */
export const BiometricStorage = {
  /**
   * Store biometric enablement status
   */
  async setBiometricEnabled(enabled: boolean): Promise<void> {
    await secureStorage.setItem(STORAGE_KEYS.BIOMETRIC_ENABLED, enabled.toString());
  },

  /**
   * Check if biometrics are enabled
   */
  async isBiometricEnabled(): Promise<boolean> {
    const enabled = await secureStorage.getItem(STORAGE_KEYS.BIOMETRIC_ENABLED);
    return enabled === 'true';
  },
};

/**
 * User preferences storage helpers
 */
export const PreferencesStorage = {
  /**
   * Store user preferences securely
   */
  async storePreferences<T>(preferences: T): Promise<void> {
    await secureStorage.setJSON(STORAGE_KEYS.USER_PREFERENCES, preferences);
  },

  /**
   * Retrieve user preferences
   */
  async getPreferences<T>(): Promise<T | null> {
    return await secureStorage.getJSON<T>(STORAGE_KEYS.USER_PREFERENCES);
  },

  /**
   * Store alarm settings
   */
  async storeAlarmSettings<T>(settings: T): Promise<void> {
    await secureStorage.setJSON(STORAGE_KEYS.ALARM_SETTINGS, settings);
  },

  /**
   * Retrieve alarm settings
   */
  async getAlarmSettings<T>(): Promise<T | null> {
    return await secureStorage.getJSON<T>(STORAGE_KEYS.ALARM_SETTINGS);
  },

  /**
   * Store audio preferences
   */
  async storeAudioPreferences<T>(preferences: T): Promise<void> {
    await secureStorage.setJSON(STORAGE_KEYS.AUDIO_PREFERENCES, preferences);
  },

  /**
   * Retrieve audio preferences
   */
  async getAudioPreferences<T>(): Promise<T | null> {
    return await secureStorage.getJSON<T>(STORAGE_KEYS.AUDIO_PREFERENCES);
  },
};

/**
 * Subscription storage helpers
 */
export const SubscriptionStorage = {
  /**
   * Store subscription status
   */
  async storeSubscriptionStatus(status: any): Promise<void> {
    await secureStorage.setJSON(STORAGE_KEYS.SUBSCRIPTION_STATUS, status);
  },

  /**
   * Get subscription status
   */
  async getSubscriptionStatus(): Promise<any | null> {
    return await secureStorage.getJSON(STORAGE_KEYS.SUBSCRIPTION_STATUS);
  },

  /**
   * Store purchase tokens for verification
   */
  async storePurchaseTokens(tokens: any): Promise<void> {
    await secureStorage.setJSON(STORAGE_KEYS.PURCHASE_TOKENS, tokens);
  },

  /**
   * Get purchase tokens
   */
  async getPurchaseTokens(): Promise<any | null> {
    return await secureStorage.getJSON(STORAGE_KEYS.PURCHASE_TOKENS);
  },
};

export default secureStorage;