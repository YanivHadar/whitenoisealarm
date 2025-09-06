/**
 * Analytics Service for Alarm & White Noise App
 * 
 * Privacy-focused analytics tracking for usage patterns, session statistics,
 * and user behavior insights. Complies with GDPR/CCPA privacy requirements
 * and provides opt-out capabilities. No sensitive data collection.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase/client';
import { useUserPreferencesStore } from '../store/user-preferences-store';
import { useAuthStore } from '../store/auth-store';

// Analytics event types
export type AnalyticsEventType = 
  | 'session_started'
  | 'session_paused' 
  | 'session_resumed'
  | 'session_completed'
  | 'session_cancelled'
  | 'alarm_triggered'
  | 'alarm_snoozed'
  | 'alarm_dismissed'
  | 'volume_changed'
  | 'white_noise_changed'
  | 'preference_updated'
  | 'app_backgrounded'
  | 'app_foregrounded'
  | 'error_occurred'
  | 'performance_metric';

// Analytics event data structure
export interface AnalyticsEvent {
  id: string;
  event_type: AnalyticsEventType;
  timestamp: string;
  session_id?: string;
  user_id?: string;
  device_info: {
    platform: 'ios' | 'android';
    os_version: string;
    app_version: string;
    device_model?: string;
  };
  event_data: Record<string, any>;
  performance_metrics?: {
    memory_usage?: number;
    cpu_usage?: number;
    battery_level?: number;
    network_type?: string;
    response_time?: number;
  };
  privacy_compliant: boolean;
  retention_days: number;
}

// Session analytics summary
export interface SessionAnalytics {
  session_id: string;
  user_id?: string;
  session_type: 'alarm' | 'white_noise' | 'combined';
  started_at: string;
  ended_at?: string;
  duration_seconds: number;
  completion_rate: number; // 0-1
  interruption_count: number;
  pause_count: number;
  volume_changes: number;
  audio_dropouts: number;
  battery_usage_estimate: number;
  quality_score: number; // 0-1 based on reliability metrics
  outcome: 'completed' | 'cancelled' | 'interrupted' | 'error';
}

// Usage pattern insights
export interface UsagePatterns {
  daily_usage_minutes: number;
  weekly_usage_minutes: number;
  most_used_session_type: 'alarm' | 'white_noise' | 'combined';
  preferred_times: string[]; // HH:MM format
  average_session_duration: number;
  completion_rate: number;
  most_used_sounds: string[];
  battery_impact_score: number; // 0-1
  reliability_score: number; // 0-1
  engagement_score: number; // 0-1
}

// Configuration
const ANALYTICS_CONFIG = {
  MAX_EVENTS_CACHE: 1000,
  BATCH_SIZE: 50,
  SYNC_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
  RETENTION_DAYS: 30,
  PRIVACY_MODE: true,
  ENABLE_PERFORMANCE_TRACKING: true,
  LOCAL_STORAGE_KEY: 'analytics_events',
  SESSION_STORAGE_KEY: 'analytics_sessions',
} as const;

/**
 * Analytics Service Class
 */
export class AnalyticsService {
  private static instance: AnalyticsService | null = null;
  private eventCache: AnalyticsEvent[] = [];
  private sessionCache: SessionAnalytics[] = [];
  private syncTimer: NodeJS.Timeout | null = null;
  private currentSessionId: string | null = null;
  private sessionStartTime: Date | null = null;
  private isEnabled = true;

  private constructor() {
    this.initializeService();
  }

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Initialize analytics service
   */
  private async initializeService(): Promise<void> {
    try {
      // Check user preferences for analytics consent
      const preferences = useUserPreferencesStore.getState().preferences;
      this.isEnabled = preferences?.appPreferences.analytics_enabled !== false;

      if (!this.isEnabled) {
        console.log('Analytics disabled by user preference');
        return;
      }

      // Load cached events
      await this.loadCachedData();

      // Start background sync
      this.startBackgroundSync();

      console.log('Analytics service initialized');
    } catch (error) {
      console.error('Failed to initialize analytics service:', error);
    }
  }

  /**
   * Track analytics event
   */
  async trackEvent(
    eventType: AnalyticsEventType,
    eventData: Record<string, any> = {},
    sessionId?: string
  ): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const authState = useAuthStore.getState();
      const event: AnalyticsEvent = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        event_type: eventType,
        timestamp: new Date().toISOString(),
        session_id: sessionId || this.currentSessionId || undefined,
        user_id: authState.isAuthenticated ? authState.user?.id : undefined,
        device_info: {
          platform: require('react-native').Platform.OS as 'ios' | 'android',
          os_version: require('react-native').Platform.Version.toString(),
          app_version: '1.0.0', // Would come from app config
        },
        event_data: this.sanitizeEventData(eventData),
        performance_metrics: ANALYTICS_CONFIG.ENABLE_PERFORMANCE_TRACKING 
          ? await this.collectPerformanceMetrics() 
          : undefined,
        privacy_compliant: ANALYTICS_CONFIG.PRIVACY_MODE,
        retention_days: ANALYTICS_CONFIG.RETENTION_DAYS,
      };

      // Add to cache
      this.eventCache.push(event);

      // Manage cache size
      if (this.eventCache.length > ANALYTICS_CONFIG.MAX_EVENTS_CACHE) {
        this.eventCache = this.eventCache.slice(-ANALYTICS_CONFIG.MAX_EVENTS_CACHE);
      }

      // Persist to local storage
      await this.saveToLocalStorage();

      console.log(`Analytics event tracked: ${eventType}`, eventData);
    } catch (error) {
      console.error('Failed to track analytics event:', error);
    }
  }

  /**
   * Start session tracking
   */
  async startSessionTracking(
    sessionId: string, 
    sessionType: 'alarm' | 'white_noise' | 'combined'
  ): Promise<void> {
    if (!this.isEnabled) return;

    this.currentSessionId = sessionId;
    this.sessionStartTime = new Date();

    await this.trackEvent('session_started', {
      session_type: sessionType,
      session_id: sessionId,
    }, sessionId);
  }

  /**
   * End session tracking
   */
  async endSessionTracking(
    outcome: 'completed' | 'cancelled' | 'interrupted' | 'error' = 'completed',
    metrics: Partial<SessionAnalytics> = {}
  ): Promise<void> {
    if (!this.isEnabled || !this.currentSessionId || !this.sessionStartTime) return;

    const endTime = new Date();
    const durationSeconds = Math.floor((endTime.getTime() - this.sessionStartTime.getTime()) / 1000);

    const sessionAnalytics: SessionAnalytics = {
      session_id: this.currentSessionId,
      user_id: useAuthStore.getState().user?.id,
      session_type: 'combined', // Default, should be passed
      started_at: this.sessionStartTime.toISOString(),
      ended_at: endTime.toISOString(),
      duration_seconds: durationSeconds,
      completion_rate: 1.0, // Default, should be calculated
      interruption_count: 0,
      pause_count: 0,
      volume_changes: 0,
      audio_dropouts: 0,
      battery_usage_estimate: 0,
      quality_score: 1.0, // Default
      outcome,
      ...metrics,
    };

    this.sessionCache.push(sessionAnalytics);

    await this.trackEvent('session_completed', {
      duration_seconds: durationSeconds,
      outcome,
      quality_score: sessionAnalytics.quality_score,
    }, this.currentSessionId);

    this.currentSessionId = null;
    this.sessionStartTime = null;
  }

  /**
   * Get usage patterns and insights
   */
  async getUsagePatterns(timeRangeDays: number = 30): Promise<UsagePatterns> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - timeRangeDays);

      const recentSessions = this.sessionCache.filter(
        session => new Date(session.started_at) >= cutoffDate
      );

      if (recentSessions.length === 0) {
        return this.getDefaultUsagePatterns();
      }

      const totalMinutes = recentSessions.reduce((sum, session) => sum + (session.duration_seconds / 60), 0);
      const completedSessions = recentSessions.filter(session => session.outcome === 'completed');
      
      // Calculate session type frequency
      const sessionTypeCounts = recentSessions.reduce((counts, session) => {
        counts[session.session_type] = (counts[session.session_type] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);

      const mostUsedSessionType = Object.entries(sessionTypeCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] as 'alarm' | 'white_noise' | 'combined' || 'combined';

      // Extract preferred times
      const startTimes = recentSessions.map(session => {
        const time = new Date(session.started_at);
        return `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
      });

      const timeFrequency = startTimes.reduce((freq, time) => {
        freq[time] = (freq[time] || 0) + 1;
        return freq;
      }, {} as Record<string, number>);

      const preferredTimes = Object.entries(timeFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([time]) => time);

      return {
        daily_usage_minutes: totalMinutes / timeRangeDays,
        weekly_usage_minutes: totalMinutes / (timeRangeDays / 7),
        most_used_session_type: mostUsedSessionType,
        preferred_times: preferredTimes,
        average_session_duration: totalMinutes / recentSessions.length,
        completion_rate: completedSessions.length / recentSessions.length,
        most_used_sounds: [], // Would need to be tracked in session data
        battery_impact_score: recentSessions.reduce((sum, s) => sum + s.battery_usage_estimate, 0) / recentSessions.length,
        reliability_score: recentSessions.reduce((sum, s) => sum + s.quality_score, 0) / recentSessions.length,
        engagement_score: Math.min(1.0, (completedSessions.length / Math.max(1, recentSessions.length)) * 
                                       (totalMinutes / (timeRangeDays * 30))), // Normalize to 30min daily target
      };
    } catch (error) {
      console.error('Failed to calculate usage patterns:', error);
      return this.getDefaultUsagePatterns();
    }
  }

  /**
   * Export analytics data (for user data export)
   */
  async exportAnalyticsData(): Promise<{
    events: AnalyticsEvent[];
    sessions: SessionAnalytics[];
    patterns: UsagePatterns;
  }> {
    const patterns = await this.getUsagePatterns();
    return {
      events: this.eventCache.filter(event => event.privacy_compliant),
      sessions: this.sessionCache,
      patterns,
    };
  }

  /**
   * Clear all analytics data
   */
  async clearAnalyticsData(): Promise<void> {
    this.eventCache = [];
    this.sessionCache = [];
    await AsyncStorage.removeItem(ANALYTICS_CONFIG.LOCAL_STORAGE_KEY);
    await AsyncStorage.removeItem(ANALYTICS_CONFIG.SESSION_STORAGE_KEY);
    console.log('Analytics data cleared');
  }

  /**
   * Enable or disable analytics
   */
  setAnalyticsEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stopBackgroundSync();
    } else {
      this.startBackgroundSync();
    }
    console.log(`Analytics ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get analytics status
   */
  getAnalyticsStatus(): {
    enabled: boolean;
    eventCount: number;
    sessionCount: number;
    lastSyncTime: string | null;
  } {
    return {
      enabled: this.isEnabled,
      eventCount: this.eventCache.length,
      sessionCount: this.sessionCache.length,
      lastSyncTime: null, // Would track actual sync time
    };
  }

  // Private methods

  private async loadCachedData(): Promise<void> {
    try {
      const eventsJson = await AsyncStorage.getItem(ANALYTICS_CONFIG.LOCAL_STORAGE_KEY);
      const sessionsJson = await AsyncStorage.getItem(ANALYTICS_CONFIG.SESSION_STORAGE_KEY);

      if (eventsJson) {
        this.eventCache = JSON.parse(eventsJson);
      }

      if (sessionsJson) {
        this.sessionCache = JSON.parse(sessionsJson);
      }

      // Clean up expired events
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - ANALYTICS_CONFIG.RETENTION_DAYS);

      this.eventCache = this.eventCache.filter(
        event => new Date(event.timestamp) >= cutoffDate
      );

      this.sessionCache = this.sessionCache.filter(
        session => new Date(session.started_at) >= cutoffDate
      );

    } catch (error) {
      console.error('Failed to load cached analytics data:', error);
    }
  }

  private async saveToLocalStorage(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        ANALYTICS_CONFIG.LOCAL_STORAGE_KEY, 
        JSON.stringify(this.eventCache)
      );
      await AsyncStorage.setItem(
        ANALYTICS_CONFIG.SESSION_STORAGE_KEY, 
        JSON.stringify(this.sessionCache)
      );
    } catch (error) {
      console.error('Failed to save analytics to local storage:', error);
    }
  }

  private startBackgroundSync(): void {
    if (this.syncTimer) return;

    this.syncTimer = setInterval(async () => {
      await this.syncToServer();
    }, ANALYTICS_CONFIG.SYNC_INTERVAL_MS);
  }

  private stopBackgroundSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  private async syncToServer(): Promise<void> {
    if (!this.isEnabled || this.eventCache.length === 0) return;

    try {
      const authState = useAuthStore.getState();
      if (!authState.isAuthenticated) {
        console.log('Skipping analytics sync - user not authenticated');
        return;
      }

      // Batch events for upload
      const eventsToSync = this.eventCache.slice(0, ANALYTICS_CONFIG.BATCH_SIZE);
      
      // In a real implementation, you would sync to Supabase or analytics service
      // For now, just log the sync attempt
      console.log(`Analytics sync: ${eventsToSync.length} events, ${this.sessionCache.length} sessions`);

      // Remove synced events from cache (in real implementation, only after successful sync)
      // this.eventCache = this.eventCache.slice(ANALYTICS_CONFIG.BATCH_SIZE);
      // await this.saveToLocalStorage();

    } catch (error) {
      console.error('Failed to sync analytics to server:', error);
    }
  }

  private sanitizeEventData(data: Record<string, any>): Record<string, any> {
    const sanitized = { ...data };
    
    // Remove sensitive data
    const sensitiveKeys = ['password', 'token', 'email', 'phone', 'address', 'location'];
    sensitiveKeys.forEach(key => {
      if (key in sanitized) {
        delete sanitized[key];
      }
    });

    return sanitized;
  }

  private async collectPerformanceMetrics(): Promise<{
    memory_usage?: number;
    battery_level?: number;
    network_type?: string;
    response_time?: number;
  }> {
    // In a real implementation, you would collect actual performance metrics
    return {
      memory_usage: 0, // MB
      battery_level: 1.0, // 0-1
      network_type: 'wifi',
      response_time: 100, // ms
    };
  }

  private getDefaultUsagePatterns(): UsagePatterns {
    return {
      daily_usage_minutes: 0,
      weekly_usage_minutes: 0,
      most_used_session_type: 'combined',
      preferred_times: [],
      average_session_duration: 0,
      completion_rate: 0,
      most_used_sounds: [],
      battery_impact_score: 0,
      reliability_score: 1.0,
      engagement_score: 0,
    };
  }
}

// Export singleton instance
export const analyticsService = AnalyticsService.getInstance();

// Convenience functions
export const trackEvent = (
  eventType: AnalyticsEventType,
  eventData?: Record<string, any>,
  sessionId?: string
) => analyticsService.trackEvent(eventType, eventData, sessionId);

export const startSessionTracking = (
  sessionId: string,
  sessionType: 'alarm' | 'white_noise' | 'combined'
) => analyticsService.startSessionTracking(sessionId, sessionType);

export const endSessionTracking = (
  outcome?: 'completed' | 'cancelled' | 'interrupted' | 'error',
  metrics?: Partial<SessionAnalytics>
) => analyticsService.endSessionTracking(outcome, metrics);

export const getUsagePatterns = (timeRangeDays?: number) => 
  analyticsService.getUsagePatterns(timeRangeDays);

export const exportAnalyticsData = () => analyticsService.exportAnalyticsData();

export const clearAnalyticsData = () => analyticsService.clearAnalyticsData();

export default analyticsService;