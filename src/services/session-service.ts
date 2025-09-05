/**
 * Session Management Service for Alarm & White Noise App
 * 
 * Handles authentication sessions, token refresh,
 * and background app state management.
 */

import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '../lib/supabase/client';
import { AuthStorage } from '../lib/secure-storage';
import { Session, User } from '@supabase/supabase-js';

export interface SessionInfo {
  isValid: boolean;
  expiresAt?: Date;
  refreshExpiresAt?: Date;
  timeUntilExpiry?: number;
  timeUntilRefreshExpiry?: number;
  shouldRefresh: boolean;
  isExpired: boolean;
}

export interface SessionSettings {
  autoRefreshEnabled: boolean;
  refreshThresholdMinutes: number;
  sessionTimeoutMinutes: number;
  backgroundRefreshEnabled: boolean;
  maxRetryAttempts: number;
}

/**
 * Session Management Service Class
 */
export class SessionService {
  private static instance: SessionService;
  private refreshTimer: NodeJS.Timeout | null = null;
  private backgroundTimer: NodeJS.Timeout | null = null;
  private appStateSubscription: any = null;
  private isRefreshing = false;
  private retryCount = 0;

  private settings: SessionSettings = {
    autoRefreshEnabled: true,
    refreshThresholdMinutes: 5, // Refresh when 5 minutes left
    sessionTimeoutMinutes: 60 * 24, // 24 hours
    backgroundRefreshEnabled: true,
    maxRetryAttempts: 3,
  };

  private constructor() {}

  static getInstance(): SessionService {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService();
    }
    return SessionService.instance;
  }

  /**
   * Initialize session management
   */
  async initialize(): Promise<void> {
    try {
      console.log('Initializing session service');

      // Set up app state listener for background/foreground transitions
      this.appStateSubscription = AppState.addEventListener(
        'change',
        this.handleAppStateChange
      );

      // Check current session status
      await this.checkSessionStatus();

      // Start automatic refresh if enabled
      if (this.settings.autoRefreshEnabled) {
        this.scheduleRefresh();
      }

      console.log('Session service initialized');

    } catch (error) {
      console.error('Session service initialization error:', error);
      throw error;
    }
  }

  /**
   * Get current session information
   */
  async getSessionInfo(): Promise<SessionInfo> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        return {
          isValid: false,
          isExpired: true,
          shouldRefresh: false,
        };
      }

      const now = Date.now();
      const expiresAt = new Date(session.expires_at! * 1000);
      const timeUntilExpiry = expiresAt.getTime() - now;
      
      // Refresh token typically expires later, but we don't have exact time
      const refreshExpiresAt = new Date(expiresAt.getTime() + (30 * 24 * 60 * 60 * 1000)); // Estimate 30 days
      const timeUntilRefreshExpiry = refreshExpiresAt.getTime() - now;

      const thresholdMs = this.settings.refreshThresholdMinutes * 60 * 1000;
      const isExpired = timeUntilExpiry <= 0;
      const shouldRefresh = timeUntilExpiry <= thresholdMs && timeUntilExpiry > 0;

      return {
        isValid: !isExpired,
        expiresAt,
        refreshExpiresAt,
        timeUntilExpiry: Math.max(0, timeUntilExpiry),
        timeUntilRefreshExpiry: Math.max(0, timeUntilRefreshExpiry),
        shouldRefresh,
        isExpired,
      };

    } catch (error) {
      console.error('Error getting session info:', error);
      return {
        isValid: false,
        isExpired: true,
        shouldRefresh: false,
      };
    }
  }

  /**
   * Refresh the current session
   */
  async refreshSession(): Promise<{ success: boolean; error?: string }> {
    if (this.isRefreshing) {
      console.log('Session refresh already in progress');
      return { success: false, error: 'Refresh already in progress' };
    }

    try {
      this.isRefreshing = true;
      console.log('Refreshing session...');

      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        console.error('Session refresh error:', error);
        this.retryCount++;

        if (this.retryCount < this.settings.maxRetryAttempts) {
          console.log(`Session refresh retry ${this.retryCount}/${this.settings.maxRetryAttempts}`);
          // Schedule retry with exponential backoff
          setTimeout(() => this.refreshSession(), Math.pow(2, this.retryCount) * 1000);
        } else {
          console.error('Max session refresh retries reached');
          await this.handleSessionExpired();
        }

        return { success: false, error: error.message };
      }

      if (data.session) {
        console.log('Session refreshed successfully');
        await AuthStorage.storeSession(data.session);
        this.retryCount = 0; // Reset retry count on success
        this.scheduleRefresh(); // Schedule next refresh
      }

      return { success: true };

    } catch (error: any) {
      console.error('Session refresh exception:', error);
      return { success: false, error: error.message || 'Session refresh failed' };
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Check session status and handle expiry
   */
  async checkSessionStatus(): Promise<void> {
    try {
      const sessionInfo = await this.getSessionInfo();

      if (sessionInfo.isExpired) {
        console.log('Session expired');
        await this.handleSessionExpired();
      } else if (sessionInfo.shouldRefresh) {
        console.log('Session should be refreshed');
        await this.refreshSession();
      } else {
        console.log('Session is valid');
        this.scheduleRefresh();
      }

    } catch (error) {
      console.error('Session status check error:', error);
    }
  }

  /**
   * Handle session expiration
   */
  private async handleSessionExpired(): Promise<void> {
    try {
      console.log('Handling expired session');

      // Clear stored session
      await AuthStorage.clearAuth();

      // Clear refresh timer
      this.clearRefreshTimer();

      // Sign out from Supabase
      await supabase.auth.signOut();

      console.log('Session expired - user signed out');

    } catch (error) {
      console.error('Error handling expired session:', error);
    }
  }

  /**
   * Schedule automatic session refresh
   */
  private scheduleRefresh(): void {
    if (!this.settings.autoRefreshEnabled) return;

    this.clearRefreshTimer();

    const scheduleNext = async () => {
      const sessionInfo = await this.getSessionInfo();

      if (!sessionInfo.isValid) return;

      // Calculate when to refresh (threshold minutes before expiry)
      const refreshIn = Math.max(
        sessionInfo.timeUntilExpiry! - (this.settings.refreshThresholdMinutes * 60 * 1000),
        60 * 1000 // Minimum 1 minute
      );

      console.log(`Next session refresh scheduled in ${Math.round(refreshIn / 60000)} minutes`);

      this.refreshTimer = setTimeout(async () => {
        await this.refreshSession();
      }, refreshIn);
    };

    scheduleNext();
  }

  /**
   * Clear refresh timer
   */
  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Handle app state changes (background/foreground)
   */
  private handleAppStateChange = async (nextAppState: AppStateStatus) => {
    console.log('App state changed:', nextAppState);

    if (nextAppState === 'active') {
      // App came to foreground - check session status
      console.log('App became active - checking session status');
      await this.checkSessionStatus();
    } else if (nextAppState === 'background') {
      // App went to background
      console.log('App went to background');
      
      if (this.settings.backgroundRefreshEnabled) {
        this.scheduleBackgroundRefresh();
      }
    }
  };

  /**
   * Schedule background session refresh
   */
  private scheduleBackgroundRefresh(): void {
    // Clear any existing background timer
    if (this.backgroundTimer) {
      clearTimeout(this.backgroundTimer);
    }

    // Schedule refresh for when app might come back
    this.backgroundTimer = setTimeout(async () => {
      if (AppState.currentState === 'background') {
        console.log('Background session refresh');
        await this.refreshSession();
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Manually invalidate session
   */
  async invalidateSession(): Promise<void> {
    try {
      console.log('Invalidating session');
      
      this.clearRefreshTimer();
      await AuthStorage.clearAuth();
      await supabase.auth.signOut();

    } catch (error) {
      console.error('Error invalidating session:', error);
    }
  }

  /**
   * Update session settings
   */
  updateSettings(newSettings: Partial<SessionSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    
    console.log('Session settings updated:', this.settings);

    // Restart refresh scheduling with new settings
    if (this.settings.autoRefreshEnabled) {
      this.scheduleRefresh();
    } else {
      this.clearRefreshTimer();
    }
  }

  /**
   * Get current session settings
   */
  getSettings(): SessionSettings {
    return { ...this.settings };
  }

  /**
   * Get session health metrics
   */
  async getHealthMetrics(): Promise<{
    status: 'healthy' | 'warning' | 'error';
    issues: string[];
    recommendations: string[];
    lastRefresh?: Date;
    nextRefresh?: Date;
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let status: 'healthy' | 'warning' | 'error' = 'healthy';

    try {
      const sessionInfo = await this.getSessionInfo();

      if (!sessionInfo.isValid) {
        status = 'error';
        issues.push('Session is invalid or expired');
        recommendations.push('Please sign in again');
      } else {
        if (sessionInfo.shouldRefresh) {
          status = 'warning';
          issues.push('Session needs to be refreshed');
        }

        if (sessionInfo.timeUntilExpiry! < 60 * 60 * 1000) { // Less than 1 hour
          if (status !== 'error') status = 'warning';
          issues.push('Session expires soon');
        }
      }

      if (!this.settings.autoRefreshEnabled) {
        recommendations.push('Consider enabling automatic session refresh');
      }

    } catch (error) {
      status = 'error';
      issues.push('Unable to check session health');
    }

    return {
      status,
      issues,
      recommendations,
    };
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    console.log('Cleaning up session service');

    this.clearRefreshTimer();

    if (this.backgroundTimer) {
      clearTimeout(this.backgroundTimer);
      this.backgroundTimer = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }
}

// Export singleton instance
export const sessionService = SessionService.getInstance();

// Convenience functions
export const initializeSession = () => sessionService.initialize();
export const refreshSession = () => sessionService.refreshSession();
export const getSessionInfo = () => sessionService.getSessionInfo();
export const checkSessionStatus = () => sessionService.checkSessionStatus();
export const invalidateSession = () => sessionService.invalidateSession();

export default sessionService;