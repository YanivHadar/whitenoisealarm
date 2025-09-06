/**
 * Session Progress Store for Alarm & White Noise App
 * 
 * Zustand-based state management for real-time session progress tracking,
 * countdown calculations, and session monitoring dashboard state.
 * Integrates with Supabase real-time subscriptions and background audio processing.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { supabase } from '../lib/supabase/client';
import type { ActiveSession, RealtimePayload } from '../types/database';

// Progress calculation types
export interface ProgressCalculation {
  totalDurationSeconds: number;
  elapsedSeconds: number;
  remainingSeconds: number;
  progressPercentage: number;
  timeUntilAlarm: number | null; // milliseconds until alarm
  estimatedEndTime: Date;
}

// Session monitoring data
export interface SessionMonitoringData {
  currentStatus: 'preparing' | 'active' | 'paused' | 'completed' | 'error';
  audioPlaying: boolean;
  volume: number;
  whiteNoiseVolume: number;
  canPause: boolean;
  canResume: boolean;
  canStop: boolean;
  batteryOptimized: boolean;
  backgroundAudioActive: boolean;
}

// Real-time update data
export interface RealtimeUpdate {
  sessionId: string;
  timestamp: Date;
  progressPercentage: number;
  secondsElapsed: number;
  audioStatus: 'playing' | 'paused' | 'stopped' | 'buffering';
}

export interface SessionProgressState {
  // Current active session
  activeSessionId: string | null;
  activeSession: ActiveSession | null;
  
  // Progress tracking
  progressCalculation: ProgressCalculation | null;
  sessionMonitoring: SessionMonitoringData | null;
  
  // Real-time updates
  isRealTimeActive: boolean;
  lastUpdate: RealtimeUpdate | null;
  updateInterval: NodeJS.Timeout | null;
  
  // Cross-device sync
  crossDeviceSync: boolean;
  syncConflicts: string[];
  
  // Loading states
  isLoading: boolean;
  isUpdating: boolean;
  
  // Error handling
  error: string | null;
  
  // Methods - Session Management
  startSessionTracking: (sessionId: string) => Promise<{ success: boolean; error?: string }>;
  stopSessionTracking: () => Promise<void>;
  pauseSession: () => Promise<{ success: boolean; error?: string }>;
  resumeSession: () => Promise<{ success: boolean; error?: string }>;
  updateSessionVolume: (volume: number) => Promise<{ success: boolean; error?: string }>;
  updateWhiteNoiseVolume: (volume: number) => Promise<{ success: boolean; error?: string }>;
  
  // Methods - Real-time Updates
  enableRealTimeUpdates: () => Promise<void>;
  disableRealTimeUpdates: () => void;
  forceProgressUpdate: () => Promise<void>;
  
  // Methods - Cross-device Sync
  enableCrossDeviceSync: () => void;
  disableCrossDeviceSync: () => void;
  resolveSyncConflict: (conflictId: string, resolution: 'local' | 'remote') => Promise<void>;
  
  // Methods - Utility
  clearError: () => void;
  getTimeUntilAlarm: () => number | null;
  getFormattedTimeRemaining: () => string;
  getSessionHealthMetrics: () => {
    status: 'healthy' | 'warning' | 'error';
    metrics: Record<string, any>;
    recommendations: string[];
  };
}

export const useSessionProgressStore = create<SessionProgressState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Initial state
      activeSessionId: null,
      activeSession: null,
      
      progressCalculation: null,
      sessionMonitoring: null,
      
      isRealTimeActive: false,
      lastUpdate: null,
      updateInterval: null,
      
      crossDeviceSync: true, // Enabled by default
      syncConflicts: [],
      
      isLoading: false,
      isUpdating: false,
      
      error: null,

      /**
       * Start tracking progress for a session
       */
      startSessionTracking: async (sessionId: string) => {
        try {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          // Fetch session data from Supabase
          const { data: session, error } = await supabase
            .from('active_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

          if (error) {
            console.error('Error fetching session:', error);
            set((state) => {
              state.error = error.message;
              state.isLoading = false;
            });
            return { success: false, error: error.message };
          }

          if (!session) {
            const errorMsg = 'Session not found';
            set((state) => {
              state.error = errorMsg;
              state.isLoading = false;
            });
            return { success: false, error: errorMsg };
          }

          // Calculate initial progress
          const progressCalculation = calculateProgress(session);
          
          // Initialize monitoring data
          const sessionMonitoring: SessionMonitoringData = {
            currentStatus: session.status === 'active' ? 'active' : 'preparing',
            audioPlaying: session.status === 'active',
            volume: session.volume,
            whiteNoiseVolume: session.white_noise_volume,
            canPause: session.status === 'active',
            canResume: session.status === 'paused',
            canStop: true,
            batteryOptimized: false,
            backgroundAudioActive: session.status === 'active',
          };

          set((state) => {
            state.activeSessionId = sessionId;
            state.activeSession = session;
            state.progressCalculation = progressCalculation;
            state.sessionMonitoring = sessionMonitoring;
            state.isLoading = false;
          });

          // Enable real-time updates
          await get().enableRealTimeUpdates();

          console.log(`Session tracking started for ${sessionId}`);
          return { success: true };

        } catch (error: any) {
          const errorMessage = error?.message || 'Failed to start session tracking';
          console.error('Session tracking error:', error);
          
          set((state) => {
            state.error = errorMessage;
            state.isLoading = false;
          });

          return { success: false, error: errorMessage };
        }
      },

      /**
       * Stop tracking current session
       */
      stopSessionTracking: async () => {
        try {
          const { activeSessionId, updateInterval } = get();
          
          if (activeSessionId) {
            // Update session status to completed
            await supabase
              .from('active_sessions')
              .update({
                status: 'completed',
                ended_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', activeSessionId);
          }

          // Disable real-time updates
          get().disableRealTimeUpdates();

          // Clear state
          set((state) => {
            state.activeSessionId = null;
            state.activeSession = null;
            state.progressCalculation = null;
            state.sessionMonitoring = null;
            state.lastUpdate = null;
            state.error = null;
          });

          console.log('Session tracking stopped');
        } catch (error: any) {
          console.error('Error stopping session tracking:', error);
          set((state) => {
            state.error = error?.message || 'Failed to stop session tracking';
          });
        }
      },

      /**
       * Pause the active session
       */
      pauseSession: async () => {
        try {
          const { activeSessionId, activeSession } = get();
          
          if (!activeSessionId || !activeSession) {
            return { success: false, error: 'No active session to pause' };
          }

          set((state) => {
            state.isUpdating = true;
            state.error = null;
          });

          // Update session in database
          const { error } = await supabase
            .from('active_sessions')
            .update({
              status: 'paused',
              updated_at: new Date().toISOString(),
            })
            .eq('id', activeSessionId);

          if (error) {
            set((state) => {
              state.error = error.message;
              state.isUpdating = false;
            });
            return { success: false, error: error.message };
          }

          // Update local state
          set((state) => {
            if (state.activeSession) {
              state.activeSession.status = 'paused';
            }
            if (state.sessionMonitoring) {
              state.sessionMonitoring.currentStatus = 'paused';
              state.sessionMonitoring.audioPlaying = false;
              state.sessionMonitoring.canPause = false;
              state.sessionMonitoring.canResume = true;
            }
            state.isUpdating = false;
          });

          return { success: true };

        } catch (error: any) {
          const errorMessage = error?.message || 'Failed to pause session';
          set((state) => {
            state.error = errorMessage;
            state.isUpdating = false;
          });
          return { success: false, error: errorMessage };
        }
      },

      /**
       * Resume the active session
       */
      resumeSession: async () => {
        try {
          const { activeSessionId, activeSession } = get();
          
          if (!activeSessionId || !activeSession) {
            return { success: false, error: 'No active session to resume' };
          }

          set((state) => {
            state.isUpdating = true;
            state.error = null;
          });

          // Update session in database
          const { error } = await supabase
            .from('active_sessions')
            .update({
              status: 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('id', activeSessionId);

          if (error) {
            set((state) => {
              state.error = error.message;
              state.isUpdating = false;
            });
            return { success: false, error: error.message };
          }

          // Update local state
          set((state) => {
            if (state.activeSession) {
              state.activeSession.status = 'active';
            }
            if (state.sessionMonitoring) {
              state.sessionMonitoring.currentStatus = 'active';
              state.sessionMonitoring.audioPlaying = true;
              state.sessionMonitoring.canPause = true;
              state.sessionMonitoring.canResume = false;
            }
            state.isUpdating = false;
          });

          return { success: true };

        } catch (error: any) {
          const errorMessage = error?.message || 'Failed to resume session';
          set((state) => {
            state.error = errorMessage;
            state.isUpdating = false;
          });
          return { success: false, error: errorMessage };
        }
      },

      /**
       * Update session volume
       */
      updateSessionVolume: async (volume: number) => {
        try {
          const { activeSessionId } = get();
          
          if (!activeSessionId) {
            return { success: false, error: 'No active session' };
          }

          // Validate volume range
          const clampedVolume = Math.max(0, Math.min(1, volume));

          // Update in database
          const { error } = await supabase
            .from('active_sessions')
            .update({
              volume: clampedVolume,
              updated_at: new Date().toISOString(),
            })
            .eq('id', activeSessionId);

          if (error) {
            return { success: false, error: error.message };
          }

          // Update local state
          set((state) => {
            if (state.activeSession) {
              state.activeSession.volume = clampedVolume;
            }
            if (state.sessionMonitoring) {
              state.sessionMonitoring.volume = clampedVolume;
            }
          });

          return { success: true };

        } catch (error: any) {
          return { success: false, error: error?.message || 'Failed to update volume' };
        }
      },

      /**
       * Update white noise volume
       */
      updateWhiteNoiseVolume: async (volume: number) => {
        try {
          const { activeSessionId } = get();
          
          if (!activeSessionId) {
            return { success: false, error: 'No active session' };
          }

          // Validate volume range
          const clampedVolume = Math.max(0, Math.min(1, volume));

          // Update in database
          const { error } = await supabase
            .from('active_sessions')
            .update({
              white_noise_volume: clampedVolume,
              updated_at: new Date().toISOString(),
            })
            .eq('id', activeSessionId);

          if (error) {
            return { success: false, error: error.message };
          }

          // Update local state
          set((state) => {
            if (state.activeSession) {
              state.activeSession.white_noise_volume = clampedVolume;
            }
            if (state.sessionMonitoring) {
              state.sessionMonitoring.whiteNoiseVolume = clampedVolume;
            }
          });

          return { success: true };

        } catch (error: any) {
          return { success: false, error: error?.message || 'Failed to update white noise volume' };
        }
      },

      /**
       * Enable real-time progress updates
       */
      enableRealTimeUpdates: async () => {
        try {
          const { activeSessionId, isRealTimeActive } = get();
          
          if (!activeSessionId || isRealTimeActive) {
            return;
          }

          console.log(`Enabling real-time updates for session ${activeSessionId}`);

          // Set up Supabase real-time subscription
          const channel = supabase
            .channel(`session_progress_${activeSessionId}`)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'active_sessions',
                filter: `id=eq.${activeSessionId}`,
              },
              (payload: RealtimePayload<ActiveSession>) => {
                console.log('Real-time session update received:', payload);
                handleRealtimeSessionUpdate(payload);
              }
            )
            .subscribe();

          // Store subscription for cleanup
          (window as any).__sessionProgressSubscription = channel;

          // Start progress update interval
          const interval = setInterval(() => {
            const { activeSession } = get();
            if (activeSession) {
              updateProgressCalculation();
            }
          }, 1000); // Update every second

          set((state) => {
            state.isRealTimeActive = true;
            state.updateInterval = interval;
          });

        } catch (error: any) {
          console.error('Error enabling real-time updates:', error);
          set((state) => {
            state.error = error?.message || 'Failed to enable real-time updates';
          });
        }
      },

      /**
       * Disable real-time updates
       */
      disableRealTimeUpdates: () => {
        const { updateInterval } = get();

        // Clear update interval
        if (updateInterval) {
          clearInterval(updateInterval);
        }

        // Unsubscribe from real-time channel
        const subscription = (window as any).__sessionProgressSubscription;
        if (subscription) {
          subscription.unsubscribe();
          delete (window as any).__sessionProgressSubscription;
        }

        set((state) => {
          state.isRealTimeActive = false;
          state.updateInterval = null;
        });

        console.log('Real-time updates disabled');
      },

      /**
       * Force a progress update
       */
      forceProgressUpdate: async () => {
        try {
          const { activeSessionId } = get();
          
          if (!activeSessionId) {
            return;
          }

          // Fetch latest session data
          const { data: session, error } = await supabase
            .from('active_sessions')
            .select('*')
            .eq('id', activeSessionId)
            .single();

          if (error || !session) {
            console.error('Error fetching session for update:', error);
            return;
          }

          // Update state
          set((state) => {
            state.activeSession = session;
            state.progressCalculation = calculateProgress(session);
            state.lastUpdate = {
              sessionId: activeSessionId,
              timestamp: new Date(),
              progressPercentage: session.progress_percentage,
              secondsElapsed: calculateElapsedSeconds(session),
              audioStatus: session.status === 'active' ? 'playing' : 'paused',
            };
          });

        } catch (error: any) {
          console.error('Error forcing progress update:', error);
          set((state) => {
            state.error = error?.message || 'Failed to update progress';
          });
        }
      },

      /**
       * Enable cross-device synchronization
       */
      enableCrossDeviceSync: () => {
        set((state) => {
          state.crossDeviceSync = true;
        });
        console.log('Cross-device sync enabled');
      },

      /**
       * Disable cross-device synchronization
       */
      disableCrossDeviceSync: () => {
        set((state) => {
          state.crossDeviceSync = false;
          state.syncConflicts = [];
        });
        console.log('Cross-device sync disabled');
      },

      /**
       * Resolve sync conflict
       */
      resolveSyncConflict: async (conflictId: string, resolution: 'local' | 'remote') => {
        try {
          // Remove conflict from list
          set((state) => {
            state.syncConflicts = state.syncConflicts.filter(id => id !== conflictId);
          });

          if (resolution === 'remote') {
            // Force update from server
            await get().forceProgressUpdate();
          }

          console.log(`Sync conflict ${conflictId} resolved using ${resolution} data`);

        } catch (error: any) {
          console.error('Error resolving sync conflict:', error);
          set((state) => {
            state.error = error?.message || 'Failed to resolve sync conflict';
          });
        }
      },

      /**
       * Clear current error
       */
      clearError: () => set((state) => {
        state.error = null;
      }),

      /**
       * Get time until alarm in milliseconds
       */
      getTimeUntilAlarm: () => {
        const { progressCalculation } = get();
        return progressCalculation?.timeUntilAlarm || null;
      },

      /**
       * Get formatted time remaining string
       */
      getFormattedTimeRemaining: () => {
        const { progressCalculation } = get();
        if (!progressCalculation) return '00:00:00';

        const { remainingSeconds } = progressCalculation;
        const hours = Math.floor(remainingSeconds / 3600);
        const minutes = Math.floor((remainingSeconds % 3600) / 60);
        const seconds = remainingSeconds % 60;

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      },

      /**
       * Get session health metrics
       */
      getSessionHealthMetrics: () => {
        const { activeSession, sessionMonitoring, progressCalculation, lastUpdate } = get();
        const recommendations: string[] = [];
        const metrics: Record<string, any> = {};
        let status: 'healthy' | 'warning' | 'error' = 'healthy';

        if (!activeSession || !sessionMonitoring || !progressCalculation) {
          return {
            status: 'error',
            metrics: {},
            recommendations: ['No active session found'],
          };
        }

        // Check session status
        if (sessionMonitoring.currentStatus === 'error') {
          status = 'error';
          recommendations.push('Session is in error state - consider restarting');
        } else if (sessionMonitoring.currentStatus === 'paused') {
          if (status !== 'error') status = 'warning';
          recommendations.push('Session is paused - resume to continue tracking');
        }

        // Check last update time
        if (lastUpdate) {
          const timeSinceUpdate = Date.now() - lastUpdate.timestamp.getTime();
          metrics.timeSinceLastUpdate = timeSinceUpdate;
          
          if (timeSinceUpdate > 10000) { // More than 10 seconds
            if (status !== 'error') status = 'warning';
            recommendations.push('Updates are delayed - check network connection');
          }
        }

        // Check progress
        metrics.progressPercentage = progressCalculation.progressPercentage;
        metrics.remainingTime = progressCalculation.remainingSeconds;
        metrics.audioPlaying = sessionMonitoring.audioPlaying;
        metrics.backgroundActive = sessionMonitoring.backgroundAudioActive;

        if (progressCalculation.progressPercentage < 0 || progressCalculation.progressPercentage > 100) {
          status = 'error';
          recommendations.push('Invalid progress percentage detected');
        }

        return {
          status,
          metrics,
          recommendations,
        };
      },

      /**
       * Test helper methods (for testing only)
       */
      setActiveSession: (session: ActiveSession | null) => {
        set((state) => {
          state.activeSession = session;
          state.activeSessionId = session?.id || null;
        });
      },

      setLastUpdate: (update: RealtimeUpdate | null) => {
        set((state) => {
          state.lastUpdate = update;
        });
      },

      setError: (error: string | null) => {
        set((state) => {
          state.error = error;
        });
      },
    }))
  )
);

// Helper functions
function calculateProgress(session: ActiveSession): ProgressCalculation {
  const now = new Date();
  const startedAt = new Date(session.started_at);
  const elapsedMs = now.getTime() - startedAt.getTime();
  const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000));

  // Calculate total duration from session metadata or estimate
  const totalDurationSeconds = session.duration_seconds || estimateTotalDuration(session);
  const remainingSeconds = Math.max(0, totalDurationSeconds - elapsedSeconds);
  const progressPercentage = totalDurationSeconds > 0 ? (elapsedSeconds / totalDurationSeconds) * 100 : 0;

  // Calculate time until alarm (if applicable)
  let timeUntilAlarm: number | null = null;
  if (session.alarm_id && session.session_type === 'combined') {
    // This would be calculated based on alarm schedule
    timeUntilAlarm = remainingSeconds * 1000;
  }

  const estimatedEndTime = new Date(startedAt.getTime() + (totalDurationSeconds * 1000));

  return {
    totalDurationSeconds,
    elapsedSeconds,
    remainingSeconds,
    progressPercentage: Math.min(100, Math.max(0, progressPercentage)),
    timeUntilAlarm,
    estimatedEndTime,
  };
}

function calculateElapsedSeconds(session: ActiveSession): number {
  const now = new Date();
  const startedAt = new Date(session.started_at);
  const elapsedMs = now.getTime() - startedAt.getTime();
  return Math.max(0, Math.floor(elapsedMs / 1000));
}

function estimateTotalDuration(session: ActiveSession): number {
  // Default duration based on session type
  switch (session.session_type) {
    case 'alarm':
      return 300; // 5 minutes
    case 'white_noise':
      return 3600; // 1 hour
    case 'combined':
      return 2700; // 45 minutes
    default:
      return 1800; // 30 minutes
  }
}

function handleRealtimeSessionUpdate(payload: RealtimePayload<ActiveSession>) {
  const { activeSessionId } = useSessionProgressStore.getState();
  
  if (payload.new && payload.new.id === activeSessionId) {
    const session = payload.new;
    
    useSessionProgressStore.setState((state) => {
      state.activeSession = session;
      state.progressCalculation = calculateProgress(session);
      
      if (state.sessionMonitoring) {
        state.sessionMonitoring.currentStatus = session.status === 'active' ? 'active' : 
                                                session.status === 'paused' ? 'paused' : 'completed';
        state.sessionMonitoring.audioPlaying = session.status === 'active';
        state.sessionMonitoring.volume = session.volume;
        state.sessionMonitoring.whiteNoiseVolume = session.white_noise_volume;
      }
      
      state.lastUpdate = {
        sessionId: session.id,
        timestamp: new Date(),
        progressPercentage: session.progress_percentage,
        secondsElapsed: calculateElapsedSeconds(session),
        audioStatus: session.status === 'active' ? 'playing' : 'paused',
      };
    });
  }
}

function updateProgressCalculation() {
  const { activeSession } = useSessionProgressStore.getState();
  
  if (activeSession) {
    const progressCalculation = calculateProgress(activeSession);
    
    useSessionProgressStore.setState((state) => {
      state.progressCalculation = progressCalculation;
    });
  }
}

/**
 * Initialize session progress store (call this in App.tsx)
 */
export const initializeSessionProgress = async () => {
  console.log('Session progress store initialized');
};

/**
 * Clean up session progress subscriptions
 */
export const cleanupSessionProgress = () => {
  const store = useSessionProgressStore.getState();
  store.disableRealTimeUpdates();
  
  const subscription = (window as any).__sessionProgressSubscription;
  if (subscription) {
    subscription.unsubscribe();
    delete (window as any).__sessionProgressSubscription;
  }
};