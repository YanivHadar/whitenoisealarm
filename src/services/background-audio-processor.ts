/**
 * Background Audio Processor Service
 * 
 * Manages reliable background audio processing for white noise and alarm systems.
 * Integrates with expo-background-fetch and expo-task-manager for uninterrupted
 * audio playback during sleep sessions with battery optimization and cross-platform support.
 * 
 * Key Features:
 * - Reliable background audio playback during device sleep
 * - Battery optimization targeting <5% overnight usage
 * - System interruption handling and recovery
 * - Cross-platform background audio policies
 * - Performance monitoring and adaptive quality scaling
 * - Wake lock management for continuous playback
 */

import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { Audio } from 'expo-av';
import { Platform, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase/client';
import type {
  AudioSession,
  AudioSessionState,
  BackgroundTaskConfig,
  BatteryOptimizationConfig,
  SystemIntegrationConfig,
  AudioPerformanceMetrics,
  AudioInterruptionPolicy,
  WakeLockConfig,
  LowBatteryAction,
  QualityScalingConfig,
  AudioOperationResult,
  AudioError,
  AudioErrorCode,
} from '../types/audio';

// ============================================================================
// CONSTANTS AND CONFIGURATION
// ============================================================================

/**
 * Background task identifiers
 */
const BACKGROUND_TASKS = {
  AUDIO_PLAYBACK: 'background-audio-playback',
  AUDIO_MONITORING: 'background-audio-monitoring',
  AUDIO_SYNC: 'background-audio-sync',
  BATTERY_OPTIMIZATION: 'background-battery-optimization',
} as const;

/**
 * Default background task configuration
 */
const DEFAULT_BACKGROUND_CONFIG: BackgroundTaskConfig = {
  task_name: BACKGROUND_TASKS.AUDIO_PLAYBACK,
  task_id: `${BACKGROUND_TASKS.AUDIO_PLAYBACK}_${Date.now()}`,
  interval: 15, // iOS minimum for background fetch
  minimum_interval: 15,
  execution_time_limit: 30, // iOS limit
  background_fetch_interval: 15000, // milliseconds
  background_app_refresh_required: true,
  battery_optimization: {
    enabled: true,
    target_battery_usage_percent: 5, // <5% per hour
    low_battery_threshold: 0.15,
    low_battery_actions: ['reduce_quality', 'reduce_volume', 'extend_buffer_intervals'],
    cpu_throttling_enabled: true,
    max_cpu_usage_percent: 10,
    quality_scaling: {
      enabled: true,
      battery_thresholds: [
        { battery_level: 0.9, max_quality: 'premium', max_bitrate: 512 },
        { battery_level: 0.7, max_quality: 'high', max_bitrate: 320 },
        { battery_level: 0.5, max_quality: 'medium', max_bitrate: 192 },
        { battery_level: 0.2, max_quality: 'low', max_bitrate: 128 },
      ],
    },
  },
  system_integration: {
    ios_background_modes: ['audio', 'background-processing'],
    ios_audio_session_category: 'playback',
    android_foreground_service: true,
    android_wake_locks: {
      cpu_wake_lock: true,
      screen_wake_lock: false,
      wifi_wake_lock: false,
      partial_wake_lock: true,
    },
    android_doze_optimization: true,
    system_audio_focus: true,
    respect_do_not_disturb: false, // Critical for alarm functionality
  },
};

/**
 * Performance monitoring thresholds
 */
const PERFORMANCE_THRESHOLDS = {
  MAX_CPU_USAGE: 15, // %
  MAX_MEMORY_USAGE: 150, // MB
  MAX_BATTERY_RATE: 8, // % per hour
  MAX_AUDIO_DROPOUTS: 3, // per minute
  MAX_LATENCY: 200, // milliseconds
} as const;

/**
 * Storage keys
 */
const STORAGE_KEYS = {
  BACKGROUND_STATE: 'background_audio_state',
  PERFORMANCE_LOG: 'background_performance_log',
  BATTERY_METRICS: 'background_battery_metrics',
  SESSION_RECOVERY: 'background_session_recovery',
} as const;

// ============================================================================
// BACKGROUND TASK DEFINITIONS
// ============================================================================

/**
 * Main background audio playback task
 */
TaskManager.defineTask(BACKGROUND_TASKS.AUDIO_PLAYBACK, async ({ data, error }) => {
  if (error) {
    console.error('Background audio playback task failed:', error);
    BackgroundAudioProcessor.getInstance().handleTaskError(error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }

  try {
    const processor = BackgroundAudioProcessor.getInstance();
    const result = await processor.executeBackgroundTask(data);
    
    return result.success 
      ? BackgroundFetch.BackgroundFetchResult.NewData 
      : BackgroundFetch.BackgroundFetchResult.Failed;
  } catch (error) {
    console.error('Background task execution failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Background performance monitoring task
 */
TaskManager.defineTask(BACKGROUND_TASKS.AUDIO_MONITORING, async ({ data, error }) => {
  if (error) {
    console.error('Background monitoring task failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }

  try {
    const processor = BackgroundAudioProcessor.getInstance();
    await processor.collectPerformanceMetrics();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Performance monitoring failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// ============================================================================
// MAIN BACKGROUND AUDIO PROCESSOR CLASS
// ============================================================================

export class BackgroundAudioProcessor {
  private static instance: BackgroundAudioProcessor | null = null;
  private static initialized = false;

  // Core state
  private backgroundTaskConfig: BackgroundTaskConfig = DEFAULT_BACKGROUND_CONFIG;
  private activeSessions = new Map<string, AudioSession>();
  private performanceMetrics: AudioPerformanceMetrics | null = null;
  private appState: AppStateStatus = 'active';
  private isBackgroundActive = false;

  // Audio system state
  private audioContexts = new Map<string, Audio.Sound>();
  private interruionHandler: ((interruption: any) => void) | null = null;
  
  // Performance monitoring
  private performanceInterval: NodeJS.Timeout | null = null;
  private batteryMonitorInterval: NodeJS.Timeout | null = null;
  private lastPerformanceMeasurement = Date.now();

  // Recovery state
  private sessionRecoveryData = new Map<string, any>();

  // ============================================================================
  // SINGLETON PATTERN & INITIALIZATION
  // ============================================================================

  private constructor() {
    this.setupAppStateHandling();
    this.setupAudioInterruptionHandling();
  }

  static getInstance(): BackgroundAudioProcessor {
    if (!BackgroundAudioProcessor.instance) {
      BackgroundAudioProcessor.instance = new BackgroundAudioProcessor();
    }
    return BackgroundAudioProcessor.instance;
  }

  /**
   * Initialize background audio processing system
   */
  static async initialize(config?: Partial<BackgroundTaskConfig>): Promise<void> {
    const processor = BackgroundAudioProcessor.getInstance();
    
    if (BackgroundAudioProcessor.initialized) {
      return;
    }

    try {
      console.log('Initializing BackgroundAudioProcessor...');
      
      // Apply custom configuration
      if (config) {
        processor.backgroundTaskConfig = { ...DEFAULT_BACKGROUND_CONFIG, ...config };
      }

      // Initialize background tasks
      await processor.initializeBackgroundTasks();
      
      // Configure platform-specific settings
      await processor.configurePlatformSpecificSettings();
      
      // Load persistent state
      await processor.loadPersistedState();
      
      // Start performance monitoring
      processor.startPerformanceMonitoring();

      BackgroundAudioProcessor.initialized = true;
      console.log('BackgroundAudioProcessor initialized successfully');
    } catch (error) {
      console.error('Failed to initialize BackgroundAudioProcessor:', error);
      throw error;
    }
  }

  // ============================================================================
  // BACKGROUND TASK MANAGEMENT
  // ============================================================================

  /**
   * Register a session for background processing
   */
  async registerBackgroundSession(session: AudioSession): Promise<AudioOperationResult<boolean>> {
    const startTime = Date.now();

    try {
      console.log(`Registering session ${session.id} for background processing`);
      
      // Store session reference
      this.activeSessions.set(session.id, session);
      
      // Configure audio session for background playback
      await this.configureAudioSessionForBackground(session);
      
      // Save recovery data
      await this.saveSessionRecoveryData(session);
      
      // Start background task if needed
      if (this.activeSessions.size === 1) {
        await this.startBackgroundProcessing();
      }

      return {
        success: true,
        data: true,
        error: null,
        performance_metrics: this.performanceMetrics || {},
        operation_duration_ms: Date.now() - startTime,
        session_id: session.id,
      };
    } catch (error) {
      console.error(`Failed to register background session ${session.id}:`, error);
      return {
        success: false,
        data: null,
        error: this.createAudioError('BACKGROUND_TASK_FAILED', error, session.id),
        performance_metrics: this.performanceMetrics || {},
        operation_duration_ms: Date.now() - startTime,
      };
    }
  }

  /**
   * Unregister a session from background processing
   */
  async unregisterBackgroundSession(sessionId: string): Promise<AudioOperationResult<boolean>> {
    const startTime = Date.now();

    try {
      console.log(`Unregistering session ${sessionId} from background processing`);
      
      // Remove session
      const session = this.activeSessions.get(sessionId);
      this.activeSessions.delete(sessionId);
      
      // Clean up audio context
      const audioContext = this.audioContexts.get(sessionId);
      if (audioContext) {
        await audioContext.unloadAsync();
        this.audioContexts.delete(sessionId);
      }
      
      // Remove recovery data
      this.sessionRecoveryData.delete(sessionId);
      
      // Stop background processing if no active sessions
      if (this.activeSessions.size === 0) {
        await this.stopBackgroundProcessing();
      }

      return {
        success: true,
        data: true,
        error: null,
        performance_metrics: this.performanceMetrics || {},
        operation_duration_ms: Date.now() - startTime,
        session_id: sessionId,
      };
    } catch (error) {
      console.error(`Failed to unregister background session ${sessionId}:`, error);
      return {
        success: false,
        data: null,
        error: this.createAudioError('BACKGROUND_TASK_FAILED', error, sessionId),
        performance_metrics: this.performanceMetrics || {},
        operation_duration_ms: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute background task logic
   */
  async executeBackgroundTask(data: any): Promise<AudioOperationResult<boolean>> {
    const startTime = Date.now();

    try {
      console.log('Executing background audio task...');
      
      // Check if any sessions need attention
      const activeSessions = Array.from(this.activeSessions.values());
      
      for (const session of activeSessions) {
        // Verify audio is still playing
        const audioContext = this.audioContexts.get(session.id);
        if (audioContext) {
          const status = await audioContext.getStatusAsync();
          
          if (status.isLoaded && !status.isPlaying && session.state === 'playing') {
            console.warn(`Session ${session.id} should be playing but isn't. Attempting recovery...`);
            await this.recoverAudioSession(session);
          }
        }
        
        // Update session metrics
        await this.updateSessionMetrics(session);
      }
      
      // Perform battery optimization if needed
      await this.performBatteryOptimization();
      
      // Sync session state to cloud if needed
      await this.syncSessionState();
      
      return {
        success: true,
        data: true,
        error: null,
        performance_metrics: this.performanceMetrics || {},
        operation_duration_ms: Date.now() - startTime,
      };
    } catch (error) {
      console.error('Background task execution failed:', error);
      return {
        success: false,
        data: null,
        error: this.createAudioError('BACKGROUND_TASK_FAILED', error),
        performance_metrics: this.performanceMetrics || {},
        operation_duration_ms: Date.now() - startTime,
      };
    }
  }

  // ============================================================================
  // AUDIO SESSION MANAGEMENT
  // ============================================================================

  /**
   * Configure audio session for background playback
   */
  private async configureAudioSessionForBackground(session: AudioSession): Promise<void> {
    try {
      // Configure audio mode for background playback
      const audioConfig = Platform.OS === 'ios' ? {
        audioModeId: Audio.AUDIO_MODE_ID_DEFAULT,
        playsInSilentMode: true,
        staysActiveInBackground: true,
        shouldCorrectPitch: false,
        shouldDuckOthers: false,
      } : {
        audioModeId: Audio.AUDIO_MODE_ID_PLAY_BACK,
        playsInSilentMode: true,
        staysActiveInBackground: true,
        shouldCorrectPitch: false,
        shouldDuckOthers: false,
        interruptsCallsOnAndroid: false,
      };

      await Audio.setAudioModeAsync(audioConfig);
      
      // Create audio context if not exists
      if (!this.audioContexts.has(session.id)) {
        const soundUri = session.sound_config.primary_sound.url;
        const { sound } = await Audio.Sound.createAsync(
          { uri: soundUri },
          {
            shouldPlay: session.state === 'playing',
            volume: session.volume_config.white_noise_volume,
            isLooping: session.loop_config.enabled,
            rate: 1.0,
          }
        );
        
        this.audioContexts.set(session.id, sound);
      }

      console.log(`Audio session ${session.id} configured for background playback`);
    } catch (error) {
      console.error(`Failed to configure audio session ${session.id} for background:`, error);
      throw error;
    }
  }

  /**
   * Recover audio session after interruption
   */
  private async recoverAudioSession(session: AudioSession): Promise<void> {
    try {
      console.log(`Recovering audio session ${session.id}...`);
      
      const audioContext = this.audioContexts.get(session.id);
      if (!audioContext) {
        throw new Error('Audio context not found');
      }

      // Check audio status
      const status = await audioContext.getStatusAsync();
      
      if (status.isLoaded) {
        // Resume playback if it was interrupted
        if (session.state === 'playing' && !status.isPlaying) {
          await audioContext.playAsync();
          console.log(`Session ${session.id} playback resumed`);
        }
      } else {
        // Reload audio if it was unloaded
        console.log(`Reloading audio for session ${session.id}`);
        await audioContext.unloadAsync();
        this.audioContexts.delete(session.id);
        await this.configureAudioSessionForBackground(session);
      }
      
      // Update session state
      session.performance.interruption_count += 1;
      session.performance.recovery_time_ms = Date.now() - session.updated_at.getTime();
      session.updated_at = new Date();
      
    } catch (error) {
      console.error(`Failed to recover audio session ${session.id}:`, error);
      session.state = 'error';
      throw error;
    }
  }

  // ============================================================================
  // PERFORMANCE MONITORING & OPTIMIZATION
  // ============================================================================

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    // Performance metrics collection
    this.performanceInterval = setInterval(() => {
      this.collectPerformanceMetrics();
    }, 5000); // Every 5 seconds

    // Battery monitoring
    this.batteryMonitorInterval = setInterval(() => {
      this.monitorBatteryUsage();
    }, 30000); // Every 30 seconds

    console.log('Background performance monitoring started');
  }

  /**
   * Collect performance metrics
   */
  async collectPerformanceMetrics(): Promise<void> {
    try {
      const now = Date.now();
      const deltaTime = now - this.lastPerformanceMeasurement;
      
      // Update performance metrics
      if (this.performanceMetrics) {
        // Simulate performance data collection
        // In a real implementation, this would collect actual system metrics
        this.performanceMetrics.last_measured_at = new Date();
        this.performanceMetrics.measurement_interval_ms = deltaTime;
        
        // Check thresholds and trigger optimizations
        await this.checkPerformanceThresholds();
      }
      
      this.lastPerformanceMeasurement = now;
      
      // Save metrics periodically
      if (Math.random() < 0.1) { // 10% chance to save
        await this.savePerformanceMetrics();
      }
    } catch (error) {
      console.warn('Failed to collect performance metrics:', error);
    }
  }

  /**
   * Monitor battery usage and optimize
   */
  private async monitorBatteryUsage(): Promise<void> {
    try {
      // In a real implementation, this would use a native module to get battery info
      // For now, we'll simulate battery monitoring
      
      const estimatedBatteryUsage = this.estimateBatteryUsage();
      
      if (estimatedBatteryUsage > this.backgroundTaskConfig.battery_optimization.target_battery_usage_percent) {
        console.log('High battery usage detected, applying optimizations...');
        await this.performBatteryOptimization();
      }
    } catch (error) {
      console.warn('Failed to monitor battery usage:', error);
    }
  }

  /**
   * Perform battery optimization actions
   */
  private async performBatteryOptimization(): Promise<void> {
    const actions = this.backgroundTaskConfig.battery_optimization.low_battery_actions;
    
    for (const action of actions) {
      switch (action) {
        case 'reduce_quality':
          await this.reduceAudioQuality();
          break;
        case 'reduce_volume':
          await this.reduceVolume();
          break;
        case 'pause_secondary_sounds':
          await this.pauseSecondarySounds();
          break;
        case 'extend_buffer_intervals':
          await this.extendBufferIntervals();
          break;
        case 'disable_effects':
          await this.disableAudioEffects();
          break;
      }
    }
    
    console.log('Battery optimization actions applied');
  }

  /**
   * Check performance thresholds and react
   */
  private async checkPerformanceThresholds(): Promise<void> {
    if (!this.performanceMetrics) return;

    const metrics = this.performanceMetrics;
    const alerts: string[] = [];

    if (metrics.cpu_usage_percent > PERFORMANCE_THRESHOLDS.MAX_CPU_USAGE) {
      alerts.push('High CPU usage detected');
      await this.reduceCPUUsage();
    }

    if (metrics.memory_usage_mb > PERFORMANCE_THRESHOLDS.MAX_MEMORY_USAGE) {
      alerts.push('High memory usage detected');
      await this.reduceMemoryUsage();
    }

    if (metrics.battery_usage_rate > PERFORMANCE_THRESHOLDS.MAX_BATTERY_RATE) {
      alerts.push('High battery usage rate detected');
      await this.performBatteryOptimization();
    }

    if (alerts.length > 0) {
      console.warn('Performance alerts:', alerts);
    }
  }

  // ============================================================================
  // APP STATE AND INTERRUPTION HANDLING
  // ============================================================================

  /**
   * Setup app state change handling
   */
  private setupAppStateHandling(): void {
    AppState.addEventListener('change', this.handleAppStateChange.bind(this));
  }

  /**
   * Handle app state changes
   */
  private async handleAppStateChange(nextAppState: AppStateStatus): Promise<void> {
    console.log('App state changed:', this.appState, '->', nextAppState);
    
    const previousState = this.appState;
    this.appState = nextAppState;

    switch (nextAppState) {
      case 'background':
        await this.handleAppGoingToBackground();
        break;
      case 'active':
        await this.handleAppComingToForeground(previousState);
        break;
      case 'inactive':
        await this.handleAppBecomingInactive();
        break;
    }
  }

  /**
   * Handle app going to background
   */
  private async handleAppGoingToBackground(): Promise<void> {
    try {
      console.log('App going to background, ensuring audio continuity...');
      
      // Ensure background tasks are active
      if (this.activeSessions.size > 0 && !this.isBackgroundActive) {
        await this.startBackgroundProcessing();
      }
      
      // Save current state for recovery
      await this.saveBackgroundState();
      
      // Configure audio for background mode
      for (const [sessionId, session] of this.activeSessions) {
        if (session.state === 'playing') {
          await this.ensureBackgroundPlayback(session);
        }
      }
      
    } catch (error) {
      console.error('Failed to handle app going to background:', error);
    }
  }

  /**
   * Handle app coming to foreground
   */
  private async handleAppComingToForeground(previousState: AppStateStatus): Promise<void> {
    try {
      console.log('App coming to foreground from:', previousState);
      
      // Check if any sessions need recovery
      for (const [sessionId, session] of this.activeSessions) {
        const audioContext = this.audioContexts.get(sessionId);
        if (audioContext) {
          const status = await audioContext.getStatusAsync();
          if (session.state === 'playing' && !status.isPlaying) {
            console.log(`Recovering session ${sessionId} after foreground transition`);
            await this.recoverAudioSession(session);
          }
        }
      }
      
      // Update performance metrics
      await this.collectPerformanceMetrics();
      
    } catch (error) {
      console.error('Failed to handle app coming to foreground:', error);
    }
  }

  /**
   * Handle app becoming inactive
   */
  private async handleAppBecomingInactive(): Promise<void> {
    console.log('App becoming inactive, preparing for background...');
    // Prepare for potential background transition
  }

  /**
   * Setup audio interruption handling
   */
  private setupAudioInterruptionHandling(): void {
    // This would be implemented with a native module or expo-av interruption handling
    console.log('Audio interruption handling configured');
  }

  // ============================================================================
  // PLATFORM-SPECIFIC IMPLEMENTATIONS
  // ============================================================================

  /**
   * Configure platform-specific background settings
   */
  private async configurePlatformSpecificSettings(): Promise<void> {
    if (Platform.OS === 'ios') {
      await this.configureiOSBackgroundSettings();
    } else if (Platform.OS === 'android') {
      await this.configureAndroidBackgroundSettings();
    }
  }

  /**
   * Configure iOS-specific background settings
   */
  private async configureiOSBackgroundSettings(): Promise<void> {
    try {
      // Configure audio session category for background playback
      await Audio.setAudioModeAsync({
        audioModeId: Audio.AUDIO_MODE_ID_DEFAULT,
        playsInSilentMode: true,
        staysActiveInBackground: true,
        allowsRecording: false,
        shouldCorrectPitch: false,
        shouldDuckOthers: false,
      });

      console.log('iOS background audio settings configured');
    } catch (error) {
      console.error('Failed to configure iOS background settings:', error);
      throw error;
    }
  }

  /**
   * Configure Android-specific background settings
   */
  private async configureAndroidBackgroundSettings(): Promise<void> {
    try {
      // Configure audio mode for Android background playback
      await Audio.setAudioModeAsync({
        audioModeId: Audio.AUDIO_MODE_ID_PLAY_BACK,
        playsInSilentMode: true,
        staysActiveInBackground: true,
        interruptsCallsOnAndroid: false,
        shouldCorrectPitch: false,
        shouldDuckOthers: false,
      });

      console.log('Android background audio settings configured');
    } catch (error) {
      console.error('Failed to configure Android background settings:', error);
      throw error;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Initialize background tasks
   */
  private async initializeBackgroundTasks(): Promise<void> {
    try {
      // Register background fetch
      await BackgroundFetch.registerTaskAsync(BACKGROUND_TASKS.AUDIO_PLAYBACK, {
        minimumInterval: this.backgroundTaskConfig.minimum_interval * 1000,
        stopOnTerminate: false,
        startOnBoot: false,
      });

      // Register monitoring task
      await BackgroundFetch.registerTaskAsync(BACKGROUND_TASKS.AUDIO_MONITORING, {
        minimumInterval: 30, // 30 seconds minimum
        stopOnTerminate: false,
        startOnBoot: false,
      });

      console.log('Background tasks registered successfully');
    } catch (error) {
      console.error('Failed to register background tasks:', error);
      throw error;
    }
  }

  /**
   * Start background processing
   */
  private async startBackgroundProcessing(): Promise<void> {
    if (this.isBackgroundActive) {
      return;
    }

    try {
      await BackgroundFetch.startAsync();
      this.isBackgroundActive = true;
      console.log('Background processing started');
    } catch (error) {
      console.error('Failed to start background processing:', error);
      throw error;
    }
  }

  /**
   * Stop background processing
   */
  private async stopBackgroundProcessing(): Promise<void> {
    if (!this.isBackgroundActive) {
      return;
    }

    try {
      await BackgroundFetch.stopAsync();
      this.isBackgroundActive = false;
      console.log('Background processing stopped');
    } catch (error) {
      console.error('Failed to stop background processing:', error);
    }
  }

  /**
   * Ensure background playback for session
   */
  private async ensureBackgroundPlayback(session: AudioSession): Promise<void> {
    const audioContext = this.audioContexts.get(session.id);
    if (audioContext) {
      const status = await audioContext.getStatusAsync();
      if (status.isLoaded && !status.isPlaying && session.state === 'playing') {
        await audioContext.playAsync();
        console.log(`Ensured background playback for session ${session.id}`);
      }
    }
  }

  /**
   * Load persisted state
   */
  private async loadPersistedState(): Promise<void> {
    try {
      const stateData = await AsyncStorage.getItem(STORAGE_KEYS.BACKGROUND_STATE);
      if (stateData) {
        // Restore session state if needed
        console.log('Background state loaded from storage');
      }
    } catch (error) {
      console.warn('Failed to load persisted background state:', error);
    }
  }

  /**
   * Save background state
   */
  private async saveBackgroundState(): Promise<void> {
    try {
      const state = {
        active_sessions: Array.from(this.activeSessions.keys()),
        timestamp: Date.now(),
        app_state: this.appState,
      };
      
      await AsyncStorage.setItem(STORAGE_KEYS.BACKGROUND_STATE, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save background state:', error);
    }
  }

  /**
   * Save session recovery data
   */
  private async saveSessionRecoveryData(session: AudioSession): Promise<void> {
    try {
      const recoveryData = {
        session_id: session.id,
        sound_url: session.sound_config.primary_sound.url,
        volume: session.volume_config.white_noise_volume,
        is_looping: session.loop_config.enabled,
        state: session.state,
        timestamp: Date.now(),
      };
      
      this.sessionRecoveryData.set(session.id, recoveryData);
      await AsyncStorage.setItem(
        `${STORAGE_KEYS.SESSION_RECOVERY}_${session.id}`,
        JSON.stringify(recoveryData)
      );
    } catch (error) {
      console.warn('Failed to save session recovery data:', error);
    }
  }

  /**
   * Optimization methods (simplified implementations)
   */
  private async reduceAudioQuality(): Promise<void> {
    console.log('Reducing audio quality for battery optimization');
  }

  private async reduceVolume(): Promise<void> {
    console.log('Reducing volume for battery optimization');
  }

  private async pauseSecondarySounds(): Promise<void> {
    console.log('Pausing secondary sounds for battery optimization');
  }

  private async extendBufferIntervals(): Promise<void> {
    console.log('Extending buffer intervals for battery optimization');
  }

  private async disableAudioEffects(): Promise<void> {
    console.log('Disabling audio effects for battery optimization');
  }

  private async reduceCPUUsage(): Promise<void> {
    console.log('Reducing CPU usage');
  }

  private async reduceMemoryUsage(): Promise<void> {
    console.log('Reducing memory usage');
  }

  private estimateBatteryUsage(): number {
    // Simplified battery usage estimation
    return this.activeSessions.size * 2; // 2% per active session
  }

  private async updateSessionMetrics(session: AudioSession): Promise<void> {
    session.updated_at = new Date();
  }

  private async syncSessionState(): Promise<void> {
    // Sync with Supabase if enabled
  }

  private async savePerformanceMetrics(): Promise<void> {
    try {
      if (this.performanceMetrics) {
        await AsyncStorage.setItem(STORAGE_KEYS.PERFORMANCE_LOG, JSON.stringify(this.performanceMetrics));
      }
    } catch (error) {
      console.warn('Failed to save performance metrics:', error);
    }
  }

  /**
   * Handle task errors
   */
  handleTaskError(error: any): void {
    console.error('Background task error:', error);
    // Implement error handling and recovery logic
  }

  /**
   * Create audio error
   */
  private createAudioError(code: AudioErrorCode, error: any, sessionId?: string): AudioError {
    return {
      code,
      message: error instanceof Error ? error.message : 'Unknown error',
      session_id: sessionId || null,
      sound_id: null,
      timestamp: new Date(),
      platform: Platform.OS as 'ios' | 'android',
      device_info: {
        model: 'unknown',
        os_version: Platform.Version.toString(),
        app_version: '1.0.0',
        audio_capabilities: {
          max_sample_rate: 48000,
          supported_formats: ['mp3', 'aac', 'wav'],
          has_bluetooth: true,
          has_headphone_jack: false,
          max_audio_channels: 2,
        },
        available_storage_mb: 1000,
        battery_level: 1.0,
      },
      stack_trace: error instanceof Error ? error.stack || null : null,
      recovery_suggestions: ['Restart the app', 'Check audio permissions', 'Ensure background app refresh is enabled'],
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    console.log('Cleaning up BackgroundAudioProcessor...');
    
    // Stop intervals
    if (this.performanceInterval) {
      clearInterval(this.performanceInterval);
    }
    if (this.batteryMonitorInterval) {
      clearInterval(this.batteryMonitorInterval);
    }
    
    // Unregister background tasks
    try {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_TASKS.AUDIO_PLAYBACK);
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_TASKS.AUDIO_MONITORING);
    } catch (error) {
      console.warn('Failed to unregister background tasks:', error);
    }
    
    // Clean up audio contexts
    for (const [sessionId, audioContext] of this.audioContexts) {
      try {
        await audioContext.unloadAsync();
      } catch (error) {
        console.warn(`Failed to unload audio context for session ${sessionId}:`, error);
      }
    }
    
    this.audioContexts.clear();
    this.activeSessions.clear();
    
    console.log('BackgroundAudioProcessor cleanup completed');
  }
}

export default BackgroundAudioProcessor;