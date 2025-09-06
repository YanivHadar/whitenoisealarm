/**
 * Session Progress Hook
 * 
 * Custom React hook for managing session progress tracking and real-time updates.
 * Provides convenient interface for components to access session progress state
 * and control session monitoring functionality.
 */

import { useEffect, useCallback, useMemo } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useSessionProgressStore } from '../store/session-progress-store';
import { analyticsService } from '../services/analytics-service';

export interface UseSessionProgressOptions {
  /** Auto-enable real-time updates when session becomes active */
  autoEnableRealTime?: boolean;
  /** Track analytics events automatically */
  trackAnalytics?: boolean;
  /** Custom update interval in milliseconds (default: 1000) */
  updateInterval?: number;
  /** Callback when session status changes */
  onStatusChange?: (status: string, sessionId?: string) => void;
  /** Callback when errors occur */
  onError?: (error: string) => void;
}

export interface UseSessionProgressReturn {
  // Session state
  activeSessionId: string | null;
  activeSession: any | null;
  isSessionActive: boolean;
  sessionType: string | null;
  
  // Progress data
  progressCalculation: any | null;
  progressPercentage: number;
  elapsedSeconds: number;
  remainingSeconds: number;
  timeUntilAlarm: number | null;
  formattedTimeRemaining: string;
  
  // Session monitoring
  sessionMonitoring: any | null;
  currentStatus: string;
  audioPlaying: boolean;
  canPause: boolean;
  canResume: boolean;
  canStop: boolean;
  
  // Real-time updates
  isRealTimeActive: boolean;
  lastUpdateTime: Date | null;
  connectionQuality: 'good' | 'poor' | 'disconnected';
  
  // Controls
  startTracking: (sessionId: string) => Promise<{ success: boolean; error?: string }>;
  stopTracking: () => Promise<void>;
  pauseSession: () => Promise<{ success: boolean; error?: string }>;
  resumeSession: () => Promise<{ success: boolean; error?: string }>;
  updateVolume: (volume: number) => Promise<{ success: boolean; error?: string }>;
  updateWhiteNoiseVolume: (volume: number) => Promise<{ success: boolean; error?: string }>;
  
  // Utility
  forceUpdate: () => Promise<void>;
  getHealthMetrics: () => any;
  isHealthy: boolean;
  
  // Loading and error states
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  clearError: () => void;
}

export function useSessionProgress(
  options: UseSessionProgressOptions = {}
): UseSessionProgressReturn {
  const {
    autoEnableRealTime = true,
    trackAnalytics = true,
    updateInterval = 1000,
    onStatusChange,
    onError,
  } = options;

  // Store state
  const store = useSessionProgressStore();
  
  // Memoized derived state
  const derivedState = useMemo(() => {
    const progressPercentage = store.progressCalculation?.progressPercentage ?? 0;
    const elapsedSeconds = store.progressCalculation?.elapsedSeconds ?? 0;
    const remainingSeconds = store.progressCalculation?.remainingSeconds ?? 0;
    const timeUntilAlarm = store.getTimeUntilAlarm();
    const formattedTimeRemaining = store.getFormattedTimeRemaining();
    
    const currentStatus = store.sessionMonitoring?.currentStatus ?? 'inactive';
    const audioPlaying = store.sessionMonitoring?.audioPlaying ?? false;
    const canPause = store.sessionMonitoring?.canPause ?? false;
    const canResume = store.sessionMonitoring?.canResume ?? false;
    const canStop = store.sessionMonitoring?.canStop ?? false;
    
    const isSessionActive = store.activeSessionId !== null;
    const sessionType = store.activeSession?.session_type ?? null;
    
    // Determine connection quality based on last update time
    let connectionQuality: 'good' | 'poor' | 'disconnected' = 'disconnected';
    if (store.lastUpdate && store.isRealTimeActive) {
      const timeSinceUpdate = Date.now() - store.lastUpdate.timestamp.getTime();
      if (timeSinceUpdate < 5000) {
        connectionQuality = 'good';
      } else if (timeSinceUpdate < 15000) {
        connectionQuality = 'poor';
      }
    }
    
    const healthMetrics = store.getSessionHealthMetrics();
    const isHealthy = healthMetrics.status === 'healthy';
    
    return {
      progressPercentage,
      elapsedSeconds,
      remainingSeconds,
      timeUntilAlarm,
      formattedTimeRemaining,
      currentStatus,
      audioPlaying,
      canPause,
      canResume,
      canStop,
      isSessionActive,
      sessionType,
      connectionQuality,
      healthMetrics,
      isHealthy,
    };
  }, [
    store.progressCalculation,
    store.sessionMonitoring,
    store.activeSessionId,
    store.activeSession,
    store.lastUpdate,
    store.isRealTimeActive,
    store.getTimeUntilAlarm,
    store.getFormattedTimeRemaining,
    store.getSessionHealthMetrics,
  ]);

  // Handle status changes
  useEffect(() => {
    if (onStatusChange && derivedState.currentStatus) {
      onStatusChange(derivedState.currentStatus, store.activeSessionId || undefined);
    }
  }, [derivedState.currentStatus, store.activeSessionId, onStatusChange]);

  // Handle errors
  useEffect(() => {
    if (store.error && onError) {
      onError(store.error);
    }
  }, [store.error, onError]);

  // Auto-enable real-time updates when session becomes active
  useEffect(() => {
    if (autoEnableRealTime && store.activeSessionId && !store.isRealTimeActive) {
      store.enableRealTimeUpdates();
    }
  }, [store.activeSessionId, store.isRealTimeActive, autoEnableRealTime]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (trackAnalytics) {
        if (nextAppState === 'background') {
          analyticsService.trackEvent('app_backgrounded', {
            has_active_session: !!store.activeSessionId,
            session_status: derivedState.currentStatus,
          });
        } else if (nextAppState === 'active') {
          analyticsService.trackEvent('app_foregrounded', {
            has_active_session: !!store.activeSessionId,
            session_status: derivedState.currentStatus,
          });
        }
      }
      
      // Ensure real-time updates resume when app becomes active
      if (nextAppState === 'active' && store.activeSessionId && !store.isRealTimeActive) {
        store.enableRealTimeUpdates();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [store.activeSessionId, store.isRealTimeActive, derivedState.currentStatus, trackAnalytics]);

  // Analytics integration
  useEffect(() => {
    if (trackAnalytics && store.activeSessionId && derivedState.sessionType) {
      // Track session start
      analyticsService.startSessionTracking(
        store.activeSessionId, 
        derivedState.sessionType as 'alarm' | 'white_noise' | 'combined'
      );
      
      return () => {
        // Track session end when component unmounts or session changes
        if (store.activeSessionId) {
          analyticsService.endSessionTracking('completed');
        }
      };
    }
  }, [store.activeSessionId, derivedState.sessionType, trackAnalytics]);

  // Enhanced control methods with analytics
  const startTracking = useCallback(async (sessionId: string) => {
    const result = await store.startSessionTracking(sessionId);
    
    if (trackAnalytics && result.success) {
      await analyticsService.trackEvent('session_started', {
        session_id: sessionId,
      });
    }
    
    return result;
  }, [store.startSessionTracking, trackAnalytics]);

  const stopTracking = useCallback(async () => {
    if (trackAnalytics && store.activeSessionId) {
      await analyticsService.trackEvent('session_completed', {
        session_id: store.activeSessionId,
        final_status: derivedState.currentStatus,
        completion_rate: derivedState.progressPercentage / 100,
      });
      await analyticsService.endSessionTracking('completed', {
        completion_rate: derivedState.progressPercentage / 100,
      });
    }
    
    await store.stopSessionTracking();
  }, [
    store.stopSessionTracking, 
    store.activeSessionId, 
    derivedState.currentStatus, 
    derivedState.progressPercentage, 
    trackAnalytics
  ]);

  const pauseSession = useCallback(async () => {
    const result = await store.pauseSession();
    
    if (trackAnalytics && result.success) {
      await analyticsService.trackEvent('session_paused', {
        session_id: store.activeSessionId,
        progress_percentage: derivedState.progressPercentage,
      });
    }
    
    return result;
  }, [store.pauseSession, store.activeSessionId, derivedState.progressPercentage, trackAnalytics]);

  const resumeSession = useCallback(async () => {
    const result = await store.resumeSession();
    
    if (trackAnalytics && result.success) {
      await analyticsService.trackEvent('session_resumed', {
        session_id: store.activeSessionId,
        progress_percentage: derivedState.progressPercentage,
      });
    }
    
    return result;
  }, [store.resumeSession, store.activeSessionId, derivedState.progressPercentage, trackAnalytics]);

  const updateVolume = useCallback(async (volume: number) => {
    const result = await store.updateSessionVolume(volume);
    
    if (trackAnalytics && result.success) {
      await analyticsService.trackEvent('volume_changed', {
        session_id: store.activeSessionId,
        new_volume: volume,
        volume_type: 'primary',
      });
    }
    
    return result;
  }, [store.updateSessionVolume, store.activeSessionId, trackAnalytics]);

  const updateWhiteNoiseVolume = useCallback(async (volume: number) => {
    const result = await store.updateWhiteNoiseVolume(volume);
    
    if (trackAnalytics && result.success) {
      await analyticsService.trackEvent('volume_changed', {
        session_id: store.activeSessionId,
        new_volume: volume,
        volume_type: 'white_noise',
      });
    }
    
    return result;
  }, [store.updateWhiteNoiseVolume, store.activeSessionId, trackAnalytics]);

  const forceUpdate = useCallback(async () => {
    await store.forceProgressUpdate();
    
    if (trackAnalytics) {
      await analyticsService.trackEvent('performance_metric', {
        session_id: store.activeSessionId,
        action: 'force_update',
        connection_quality: derivedState.connectionQuality,
      });
    }
  }, [store.forceProgressUpdate, store.activeSessionId, derivedState.connectionQuality, trackAnalytics]);

  return {
    // Session state
    activeSessionId: store.activeSessionId,
    activeSession: store.activeSession,
    isSessionActive: derivedState.isSessionActive,
    sessionType: derivedState.sessionType,
    
    // Progress data
    progressCalculation: store.progressCalculation,
    progressPercentage: derivedState.progressPercentage,
    elapsedSeconds: derivedState.elapsedSeconds,
    remainingSeconds: derivedState.remainingSeconds,
    timeUntilAlarm: derivedState.timeUntilAlarm,
    formattedTimeRemaining: derivedState.formattedTimeRemaining,
    
    // Session monitoring
    sessionMonitoring: store.sessionMonitoring,
    currentStatus: derivedState.currentStatus,
    audioPlaying: derivedState.audioPlaying,
    canPause: derivedState.canPause,
    canResume: derivedState.canResume,
    canStop: derivedState.canStop,
    
    // Real-time updates
    isRealTimeActive: store.isRealTimeActive,
    lastUpdateTime: store.lastUpdate?.timestamp || null,
    connectionQuality: derivedState.connectionQuality,
    
    // Controls
    startTracking,
    stopTracking,
    pauseSession,
    resumeSession,
    updateVolume,
    updateWhiteNoiseVolume,
    
    // Utility
    forceUpdate,
    getHealthMetrics: store.getSessionHealthMetrics,
    isHealthy: derivedState.isHealthy,
    
    // Loading and error states
    isLoading: store.isLoading,
    isUpdating: store.isUpdating,
    error: store.error,
    clearError: store.clearError,
  };
}