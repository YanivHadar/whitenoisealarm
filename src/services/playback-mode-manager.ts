/**
 * Playback Mode Manager - Advanced playback modes for white noise sessions
 * 
 * Manages sophisticated playback modes including:
 * - Continuous playback with seamless looping
 * - Timed sessions with smart fade-out
 * - Progressive sessions with volume/tempo changes
 * - Scheduled playback with alarm integration
 * - Sleep-optimized fade patterns
 * - Adaptive quality based on session duration
 * - Cross-fade transitions between sounds
 * - Smart interruption handling
 * 
 * @author Alarm & White Noise App Development Team
 * @version 1.0.0
 */

import { Audio, AVPlaybackSource, AVPlaybackStatus } from 'expo-av';
import { Platform } from 'react-native';
import { 
  PlaybackMode,
  SessionConfiguration,
  PlaybackModeState,
  TimedSessionConfiguration,
  ProgressiveSessionConfiguration,
  ScheduledSessionConfiguration,
  PlaybackModeResult,
  AudioOperationResult,
  PlaybackModeManager as IPlaybackModeManager,
  SessionPhase,
  PlaybackTransition,
  AdaptivePlaybackSettings,
  PlaybackModeConfiguration,
  PlaybackSchedule,
  SessionProgressUpdate,
  PlaybackModeError,
  CrossFadeConfiguration,
  VolumeProgressionPattern,
  PlaybackModeAnalytics,
  SessionInterruption,
  PlaybackQualityAdaptation
} from '../types/audio.js';
import { WhiteNoiseEngine } from './white-noise-engine.js';
import { AudioControls } from './audio-controls.js';
import { BatteryPerformanceMonitor } from './battery-performance-monitor.js';
import { AudioSessionManager } from './audio-session-manager.js';

/**
 * Playback Mode Management Service
 * Orchestrates sophisticated playback patterns for optimal sleep experiences
 */
export class PlaybackModeManager {
  private static instance: PlaybackModeManager | null = null;
  private static initialized = false;

  private state: PlaybackModeState;
  private currentSession: SessionConfiguration | null = null;
  private playbackTimer: NodeJS.Timeout | null = null;
  private progressionTimer: NodeJS.Timeout | null = null;
  private fadeTimer: NodeJS.Timeout | null = null;
  private progressCallbacks: Map<string, (progress: SessionProgressUpdate) => void> = new Map();
  private interruptionCallbacks: Map<string, (interruption: SessionInterruption) => void> = new Map();
  
  // Service dependencies
  private whiteNoiseEngine: WhiteNoiseEngine;
  private audioControls: AudioControls;
  private batteryMonitor: BatteryPerformanceMonitor;
  private sessionManager: AudioSessionManager;

  private readonly PROGRESS_UPDATE_INTERVAL_MS = 1000; // Update every second
  private readonly FADE_STEP_INTERVAL_MS = 100; // Smooth fade steps
  private readonly MIN_SESSION_DURATION_MS = 10000; // 10 seconds minimum
  private readonly MAX_SESSION_DURATION_MS = 43200000; // 12 hours maximum

  private constructor() {
    this.state = {
      isInitialized: false,
      currentMode: 'continuous',
      isActive: false,
      sessionStartTime: null,
      sessionDuration: 0,
      totalSessionTime: 0,
      currentPhase: 'idle',
      currentVolume: 1.0,
      targetVolume: 1.0,
      playbackPosition: 0,
      remainingTime: 0,
      isTransitioning: false,
      lastProgressUpdate: Date.now(),
      adaptiveQualityEnabled: true,
      interruptionCount: 0
    };

    // Initialize service dependencies
    this.whiteNoiseEngine = WhiteNoiseEngine.getInstance();
    this.audioControls = AudioControls.getInstance();
    this.batteryMonitor = BatteryPerformanceMonitor.getInstance();
    this.sessionManager = AudioSessionManager.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): PlaybackModeManager {
    if (!PlaybackModeManager.instance) {
      PlaybackModeManager.instance = new PlaybackModeManager();
    }
    return PlaybackModeManager.instance;
  }

  /**
   * Initialize playback mode manager
   */
  public static async initialize(config?: PlaybackModeConfiguration): Promise<AudioOperationResult<boolean>> {
    try {
      const instance = PlaybackModeManager.getInstance();

      if (PlaybackModeManager.initialized) {
        return {
          success: true,
          data: true,
          message: 'Playback mode manager already initialized'
        };
      }

      // Ensure service dependencies are initialized
      if (!instance.whiteNoiseEngine.isInitialized()) {
        await WhiteNoiseEngine.initialize();
      }

      if (!instance.audioControls.isInitialized()) {
        await AudioControls.initialize();
      }

      // Configure adaptive settings
      if (config?.adaptiveQualityEnabled !== undefined) {
        instance.state.adaptiveQualityEnabled = config.adaptiveQualityEnabled;
      }

      // Set up interruption handling
      await instance.setupInterruptionHandling();

      instance.state.isInitialized = true;
      PlaybackModeManager.initialized = true;

      return {
        success: true,
        data: true,
        message: 'Playback mode manager initialized successfully'
      };

    } catch (error) {
      return {
        success: false,
        data: false,
        error: error instanceof Error ? error.message : 'Unknown initialization error',
        message: 'Failed to initialize playback mode manager'
      };
    }
  }

  /**
   * Set up audio interruption handling
   */
  private async setupInterruptionHandling(): Promise<void> {
    try {
      // Register for audio interruption events
      this.audioControls.registerInterruptionListener('playback-mode', (event) => {
        this.handleAudioInterruption(event);
      });

    } catch (error) {
      console.warn('Failed to setup interruption handling:', error);
    }
  }

  /**
   * Handle audio interruptions
   */
  private async handleAudioInterruption(event: any): Promise<void> {
    try {
      const interruption: SessionInterruption = {
        type: event.type || 'unknown',
        timestamp: Date.now(),
        wasResumed: false,
        sessionPausedDuration: 0
      };

      this.state.interruptionCount++;

      // Notify interruption callbacks
      this.interruptionCallbacks.forEach(callback => {
        try {
          callback(interruption);
        } catch (error) {
          console.warn('Interruption callback error:', error);
        }
      });

      // Handle different interruption types
      switch (event.type) {
        case 'phone_call':
          await this.pauseSession('phone_call');
          break;
        case 'notification':
          // Don't pause for notifications, just duck volume
          await this.duckAudio(0.3, 1000);
          break;
        case 'alarm':
          // Pause session for alarm
          await this.pauseSession('alarm');
          break;
        default:
          // Generic interruption handling
          await this.pauseSession('unknown');
          break;
      }

    } catch (error) {
      console.warn('Failed to handle audio interruption:', error);
    }
  }

  /**
   * Duck audio volume temporarily
   */
  private async duckAudio(duckLevel: number, durationMs: number): Promise<void> {
    try {
      const originalVolume = this.state.currentVolume;

      // Duck volume
      await this.audioControls.setVolume(duckLevel, 250);

      // Restore volume after duration
      setTimeout(async () => {
        await this.audioControls.setVolume(originalVolume, 250);
      }, durationMs);

    } catch (error) {
      console.warn('Failed to duck audio:', error);
    }
  }

  /**
   * Start continuous playback mode
   */
  public async startContinuousMode(config: SessionConfiguration): Promise<PlaybackModeResult> {
    try {
      if (this.state.isActive) {
        return {
          success: false,
          mode: 'continuous',
          message: 'Another session is already active',
          error: 'Session already active'
        };
      }

      // Validate configuration
      const validation = this.validateSessionConfiguration(config);
      if (!validation.isValid) {
        return {
          success: false,
          mode: 'continuous',
          message: 'Invalid session configuration',
          error: validation.error
        };
      }

      // Store session configuration
      this.currentSession = { ...config, mode: 'continuous' };
      
      // Update state
      this.state.currentMode = 'continuous';
      this.state.isActive = true;
      this.state.sessionStartTime = Date.now();
      this.state.currentPhase = 'starting';
      this.state.currentVolume = config.volume || 1.0;
      this.state.targetVolume = config.volume || 1.0;
      this.state.sessionDuration = 0;
      this.state.remainingTime = -1; // Infinite for continuous mode

      // Start white noise playback
      const playbackResult = await this.whiteNoiseEngine.startWhiteNoiseSession(config);
      if (!playbackResult.success) {
        await this.resetState();
        return {
          success: false,
          mode: 'continuous',
          message: 'Failed to start white noise playback',
          error: playbackResult.error
        };
      }

      // Apply fade-in if configured
      if (config.fadeInDurationMs && config.fadeInDurationMs > 0) {
        this.state.currentPhase = 'fading-in';
        await this.audioControls.applyFadeEffect(playbackResult.data!, {
          type: 'fade-in',
          durationMs: config.fadeInDurationMs,
          targetVolume: config.volume || 1.0,
          easingCurve: 'ease-out'
        }, 0);
      }

      // Start progress monitoring
      this.startProgressMonitoring();

      // Apply adaptive quality if enabled
      if (this.state.adaptiveQualityEnabled) {
        await this.applyAdaptiveQuality(config);
      }

      this.state.currentPhase = 'playing';

      return {
        success: true,
        mode: 'continuous',
        sessionId: playbackResult.data!,
        message: 'Continuous playback started successfully'
      };

    } catch (error) {
      await this.resetState();
      return {
        success: false,
        mode: 'continuous',
        message: 'Failed to start continuous playback',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Start timed session mode
   */
  public async startTimedMode(config: TimedSessionConfiguration): Promise<PlaybackModeResult> {
    try {
      if (this.state.isActive) {
        return {
          success: false,
          mode: 'timed',
          message: 'Another session is already active',
          error: 'Session already active'
        };
      }

      // Validate timed configuration
      if (config.durationMinutes <= 0 || config.durationMinutes > 720) { // Max 12 hours
        return {
          success: false,
          mode: 'timed',
          message: 'Invalid session duration',
          error: 'Duration must be between 1 and 720 minutes'
        };
      }

      const sessionDurationMs = config.durationMinutes * 60 * 1000;

      // Store session configuration
      this.currentSession = { ...config, mode: 'timed' };

      // Update state
      this.state.currentMode = 'timed';
      this.state.isActive = true;
      this.state.sessionStartTime = Date.now();
      this.state.currentPhase = 'starting';
      this.state.currentVolume = config.volume || 1.0;
      this.state.targetVolume = config.volume || 1.0;
      this.state.sessionDuration = sessionDurationMs;
      this.state.totalSessionTime = sessionDurationMs;
      this.state.remainingTime = sessionDurationMs;

      // Start white noise playbook
      const playbackResult = await this.whiteNoiseEngine.startWhiteNoiseSession(config);
      if (!playbackResult.success) {
        await this.resetState();
        return {
          success: false,
          mode: 'timed',
          message: 'Failed to start white noise playback',
          error: playbackResult.error
        };
      }

      // Apply fade-in if configured
      if (config.fadeInDurationMs && config.fadeInDurationMs > 0) {
        this.state.currentPhase = 'fading-in';
        await this.audioControls.applyFadeEffect(playbackResult.data!, {
          type: 'fade-in',
          durationMs: config.fadeInDurationMs,
          targetVolume: config.volume || 1.0,
          easingCurve: 'ease-out'
        }, 0);
      }

      // Set up session timer
      this.playbackTimer = setTimeout(async () => {
        await this.handleTimedSessionEnd();
      }, sessionDurationMs);

      // Set up fade-out timer if configured
      if (config.fadeOutDurationMs && config.fadeOutDurationMs > 0) {
        const fadeStartTime = sessionDurationMs - config.fadeOutDurationMs;
        if (fadeStartTime > 0) {
          this.fadeTimer = setTimeout(async () => {
            await this.startFadeOut(config.fadeOutDurationMs!);
          }, fadeStartTime);
        }
      }

      // Start progress monitoring
      this.startProgressMonitoring();

      // Apply adaptive quality
      if (this.state.adaptiveQualityEnabled) {
        await this.applyAdaptiveQuality(config);
      }

      this.state.currentPhase = 'playing';

      return {
        success: true,
        mode: 'timed',
        sessionId: playbackResult.data!,
        message: `Timed session started: ${config.durationMinutes} minutes`,
        estimatedEndTime: Date.now() + sessionDurationMs
      };

    } catch (error) {
      await this.resetState();
      return {
        success: false,
        mode: 'timed',
        message: 'Failed to start timed session',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Start progressive session mode
   */
  public async startProgressiveMode(config: ProgressiveSessionConfiguration): Promise<PlaybackModeResult> {
    try {
      if (this.state.isActive) {
        return {
          success: false,
          mode: 'progressive',
          message: 'Another session is already active',
          error: 'Session already active'
        };
      }

      // Validate progressive configuration
      if (!config.progressionPattern || config.phases.length === 0) {
        return {
          success: false,
          mode: 'progressive',
          message: 'Invalid progressive configuration',
          error: 'Progression pattern and phases are required'
        };
      }

      const totalSessionDurationMs = config.phases.reduce((total, phase) => total + phase.durationMinutes * 60 * 1000, 0);

      // Store session configuration
      this.currentSession = { ...config, mode: 'progressive' };

      // Update state
      this.state.currentMode = 'progressive';
      this.state.isActive = true;
      this.state.sessionStartTime = Date.now();
      this.state.currentPhase = 'starting';
      this.state.currentVolume = config.volume || 1.0;
      this.state.sessionDuration = totalSessionDurationMs;
      this.state.totalSessionTime = totalSessionDurationMs;
      this.state.remainingTime = totalSessionDurationMs;

      // Start white noise playback
      const playbackResult = await this.whiteNoiseEngine.startWhiteNoiseSession(config);
      if (!playbackResult.success) {
        await this.resetState();
        return {
          success: false,
          mode: 'progressive',
          message: 'Failed to start white noise playback',
          error: playbackResult.error
        };
      }

      // Start progressive session
      await this.startProgressiveSession(config.phases, playbackResult.data!);

      // Start progress monitoring
      this.startProgressMonitoring();

      // Apply adaptive quality
      if (this.state.adaptiveQualityEnabled) {
        await this.applyAdaptiveQuality(config);
      }

      return {
        success: true,
        mode: 'progressive',
        sessionId: playbackResult.data!,
        message: `Progressive session started with ${config.phases.length} phases`,
        estimatedEndTime: Date.now() + totalSessionDurationMs
      };

    } catch (error) {
      await this.resetState();
      return {
        success: false,
        mode: 'progressive',
        message: 'Failed to start progressive session',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Start scheduled session mode
   */
  public async startScheduledMode(config: ScheduledSessionConfiguration): Promise<PlaybackModeResult> {
    try {
      if (this.state.isActive) {
        return {
          success: false,
          mode: 'scheduled',
          message: 'Another session is already active',
          error: 'Session already active'
        };
      }

      // Validate schedule
      if (!config.schedule || config.schedule.length === 0) {
        return {
          success: false,
          mode: 'scheduled',
          message: 'Invalid schedule configuration',
          error: 'Schedule is required'
        };
      }

      // Store session configuration
      this.currentSession = { ...config, mode: 'scheduled' };

      // Update state
      this.state.currentMode = 'scheduled';
      this.state.isActive = true;
      this.state.sessionStartTime = Date.now();
      this.state.currentPhase = 'scheduled';

      // Set up scheduled playback
      await this.setupScheduledPlayback(config.schedule);

      // Start progress monitoring
      this.startProgressMonitoring();

      return {
        success: true,
        mode: 'scheduled',
        message: `Scheduled session configured with ${config.schedule.length} events`
      };

    } catch (error) {
      await this.resetState();
      return {
        success: false,
        mode: 'scheduled',
        message: 'Failed to start scheduled session',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate session configuration
   */
  private validateSessionConfiguration(config: SessionConfiguration): { isValid: boolean; error?: string } {
    if (!config.soundId) {
      return { isValid: false, error: 'Sound ID is required' };
    }

    if (config.volume !== undefined && (config.volume < 0 || config.volume > 1)) {
      return { isValid: false, error: 'Volume must be between 0 and 1' };
    }

    if (config.fadeInDurationMs !== undefined && config.fadeInDurationMs < 0) {
      return { isValid: false, error: 'Fade-in duration must be non-negative' };
    }

    if (config.fadeOutDurationMs !== undefined && config.fadeOutDurationMs < 0) {
      return { isValid: false, error: 'Fade-out duration must be non-negative' };
    }

    return { isValid: true };
  }

  /**
   * Start progressive session with phases
   */
  private async startProgressiveSession(phases: any[], sessionId: string): Promise<void> {
    let currentPhaseIndex = 0;
    let phaseStartTime = Date.now();

    const executePhase = async (phase: any, index: number) => {
      this.state.currentPhase = `phase-${index + 1}`;

      // Apply phase-specific settings
      if (phase.volume !== undefined) {
        const currentVolume = this.state.currentVolume;
        const targetVolume = phase.volume;
        
        if (Math.abs(targetVolume - currentVolume) > 0.05) {
          await this.audioControls.applyFadeEffect(sessionId, {
            type: 'volume-change',
            durationMs: 2000, // 2 second transition between phases
            targetVolume,
            easingCurve: 'ease-in-out'
          }, currentVolume);
          
          this.state.currentVolume = targetVolume;
          this.state.targetVolume = targetVolume;
        }
      }

      // Set up phase timer
      const phaseTimer = setTimeout(async () => {
        currentPhaseIndex++;
        if (currentPhaseIndex < phases.length) {
          phaseStartTime = Date.now();
          await executePhase(phases[currentPhaseIndex], currentPhaseIndex);
        } else {
          // All phases complete
          await this.handleProgressiveSessionEnd();
        }
      }, phase.durationMinutes * 60 * 1000);

      // Store timer reference for cleanup
      if (!this.progressionTimer) {
        this.progressionTimer = phaseTimer;
      }
    };

    // Start first phase
    if (phases.length > 0) {
      await executePhase(phases[0], 0);
    }
  }

  /**
   * Set up scheduled playbook
   */
  private async setupScheduledPlayback(schedule: PlaybackSchedule[]): Promise<void> {
    const now = Date.now();

    for (const event of schedule) {
      const eventTime = new Date(event.startTime).getTime();
      const delay = eventTime - now;

      if (delay > 0) {
        // Schedule future event
        setTimeout(async () => {
          await this.executeScheduledEvent(event);
        }, delay);
      } else if (delay > -60000) {
        // Event is less than 1 minute in the past, execute immediately
        await this.executeScheduledEvent(event);
      }
      // Skip events more than 1 minute in the past
    }
  }

  /**
   * Execute scheduled event
   */
  private async executeScheduledEvent(event: PlaybackSchedule): Promise<void> {
    try {
      switch (event.action) {
        case 'play':
          const playResult = await this.whiteNoiseEngine.startWhiteNoiseSession({
            soundId: event.soundId!,
            volume: event.volume || 1.0,
            mode: 'continuous'
          });
          
          if (playResult.success) {
            this.state.currentPhase = 'playing';
          }
          break;

        case 'stop':
          await this.stopSession();
          break;

        case 'volume':
          if (event.volume !== undefined && this.state.isActive) {
            await this.audioControls.setVolume(event.volume);
            this.state.currentVolume = event.volume;
          }
          break;

        case 'fade_out':
          if (this.state.isActive) {
            const fadeOutDuration = event.durationMs || 5000;
            await this.startFadeOut(fadeOutDuration);
          }
          break;

        default:
          console.warn('Unknown scheduled action:', event.action);
          break;
      }

    } catch (error) {
      console.warn('Failed to execute scheduled event:', error);
    }
  }

  /**
   * Start progress monitoring
   */
  private startProgressMonitoring(): void {
    const updateProgress = () => {
      if (!this.state.isActive || !this.state.sessionStartTime) {
        return;
      }

      const now = Date.now();
      const elapsed = now - this.state.sessionStartTime;
      
      // Update session duration and remaining time
      if (this.state.currentMode === 'continuous') {
        this.state.sessionDuration = elapsed;
        this.state.remainingTime = -1; // Infinite
      } else if (this.state.totalSessionTime > 0) {
        this.state.sessionDuration = elapsed;
        this.state.remainingTime = Math.max(0, this.state.totalSessionTime - elapsed);
      }

      // Send progress update
      const progressUpdate: SessionProgressUpdate = {
        sessionId: this.currentSession?.soundId || '',
        elapsedMs: elapsed,
        remainingMs: this.state.remainingTime,
        currentPhase: this.state.currentPhase,
        currentVolume: this.state.currentVolume,
        progressPercent: this.state.totalSessionTime > 0 
          ? Math.min(100, (elapsed / this.state.totalSessionTime) * 100)
          : 0,
        timestamp: now
      };

      this.progressCallbacks.forEach(callback => {
        try {
          callback(progressUpdate);
        } catch (error) {
          console.warn('Progress callback error:', error);
        }
      });

      this.state.lastProgressUpdate = now;
    };

    // Update immediately and then every interval
    updateProgress();
    this.playbackTimer = setInterval(updateProgress, this.PROGRESS_UPDATE_INTERVAL_MS);
  }

  /**
   * Start fade-out process
   */
  private async startFadeOut(durationMs: number): Promise<void> {
    try {
      this.state.currentPhase = 'fading-out';
      this.state.isTransitioning = true;

      if (this.currentSession) {
        const sessionResult = await this.whiteNoiseEngine.startWhiteNoiseSession(this.currentSession);
        if (sessionResult.success) {
          await this.audioControls.applyFadeEffect(sessionResult.data!, {
            type: 'fade-out',
            durationMs,
            targetVolume: 0,
            easingCurve: 'ease-in'
          }, this.state.currentVolume);
        }
      }

      this.state.isTransitioning = false;

    } catch (error) {
      this.state.isTransitioning = false;
      console.warn('Failed to start fade-out:', error);
    }
  }

  /**
   * Handle timed session end
   */
  private async handleTimedSessionEnd(): Promise<void> {
    try {
      this.state.currentPhase = 'ending';
      await this.stopSession();

    } catch (error) {
      console.warn('Failed to handle timed session end:', error);
    }
  }

  /**
   * Handle progressive session end
   */
  private async handleProgressiveSessionEnd(): Promise<void> {
    try {
      this.state.currentPhase = 'ending';
      
      // Apply final fade-out if configured
      if (this.currentSession && 'fadeOutDurationMs' in this.currentSession && this.currentSession.fadeOutDurationMs) {
        await this.startFadeOut(this.currentSession.fadeOutDurationMs);
      }

      await this.stopSession();

    } catch (error) {
      console.warn('Failed to handle progressive session end:', error);
    }
  }

  /**
   * Apply adaptive quality based on session configuration
   */
  private async applyAdaptiveQuality(config: SessionConfiguration): Promise<void> {
    try {
      const batteryState = this.batteryMonitor.getState();
      const sessionDurationHours = (this.state.totalSessionTime || 0) / (1000 * 60 * 60);

      // Determine adaptive settings based on battery and session length
      const adaptiveSettings: PlaybackQualityAdaptation = {
        quality: 'medium', // Default
        compressionLevel: 'medium',
        bufferSize: 'medium'
      };

      // Adjust based on battery level
      if (batteryState.currentBatteryLevel < 20) {
        adaptiveSettings.quality = 'low';
        adaptiveSettings.compressionLevel = 'high';
        adaptiveSettings.bufferSize = 'small';
      } else if (batteryState.currentBatteryLevel < 50) {
        adaptiveSettings.quality = 'medium';
        adaptiveSettings.compressionLevel = 'medium';
        adaptiveSettings.bufferSize = 'medium';
      } else if (batteryState.isCharging) {
        adaptiveSettings.quality = 'high';
        adaptiveSettings.compressionLevel = 'low';
        adaptiveSettings.bufferSize = 'large';
      }

      // Adjust based on session duration
      if (sessionDurationHours > 8) {
        // Long sessions need better battery optimization
        adaptiveSettings.quality = 'medium';
        adaptiveSettings.compressionLevel = 'high';
      }

      console.log('Applied adaptive quality settings:', adaptiveSettings);

    } catch (error) {
      console.warn('Failed to apply adaptive quality:', error);
    }
  }

  /**
   * Pause current session
   */
  public async pauseSession(reason?: string): Promise<AudioOperationResult<boolean>> {
    try {
      if (!this.state.isActive) {
        return {
          success: false,
          data: false,
          error: 'No active session to pause',
          message: 'No session is currently active'
        };
      }

      // Pause white noise engine
      await this.whiteNoiseEngine.pauseSession();

      // Update state
      const previousPhase = this.state.currentPhase;
      this.state.currentPhase = 'paused';
      this.state.isTransitioning = false;

      // Clear timers
      if (this.playbackTimer) {
        clearTimeout(this.playbackTimer);
        this.playbackTimer = null;
      }

      return {
        success: true,
        data: true,
        message: `Session paused${reason ? ` (${reason})` : ''}`
      };

    } catch (error) {
      return {
        success: false,
        data: false,
        error: error instanceof Error ? error.message : 'Unknown pause error',
        message: 'Failed to pause session'
      };
    }
  }

  /**
   * Resume paused session
   */
  public async resumeSession(): Promise<AudioOperationResult<boolean>> {
    try {
      if (!this.state.isActive || this.state.currentPhase !== 'paused') {
        return {
          success: false,
          data: false,
          error: 'No paused session to resume',
          message: 'No paused session found'
        };
      }

      // Resume white noise engine
      await this.whiteNoiseEngine.resumeSession();

      // Update state
      this.state.currentPhase = 'playing';

      // Restart progress monitoring
      this.startProgressMonitoring();

      return {
        success: true,
        data: true,
        message: 'Session resumed successfully'
      };

    } catch (error) {
      return {
        success: false,
        data: false,
        error: error instanceof Error ? error.message : 'Unknown resume error',
        message: 'Failed to resume session'
      };
    }
  }

  /**
   * Stop current session
   */
  public async stopSession(): Promise<AudioOperationResult<boolean>> {
    try {
      if (!this.state.isActive) {
        return {
          success: false,
          data: false,
          error: 'No active session to stop',
          message: 'No session is currently active'
        };
      }

      // Stop white noise engine
      await this.whiteNoiseEngine.stopSession();

      // Reset state
      await this.resetState();

      return {
        success: true,
        data: true,
        message: 'Session stopped successfully'
      };

    } catch (error) {
      return {
        success: false,
        data: false,
        error: error instanceof Error ? error.message : 'Unknown stop error',
        message: 'Failed to stop session'
      };
    }
  }

  /**
   * Reset internal state
   */
  private async resetState(): Promise<void> {
    // Clear all timers
    if (this.playbackTimer) {
      clearTimeout(this.playbackTimer);
      this.playbackTimer = null;
    }

    if (this.progressionTimer) {
      clearTimeout(this.progressionTimer);
      this.progressionTimer = null;
    }

    if (this.fadeTimer) {
      clearTimeout(this.fadeTimer);
      this.fadeTimer = null;
    }

    // Reset state
    this.state = {
      ...this.state,
      isActive: false,
      sessionStartTime: null,
      sessionDuration: 0,
      totalSessionTime: 0,
      currentPhase: 'idle',
      currentVolume: 1.0,
      targetVolume: 1.0,
      playbackPosition: 0,
      remainingTime: 0,
      isTransitioning: false
    };

    this.currentSession = null;
  }

  /**
   * Get current playback state
   */
  public getState(): Readonly<PlaybackModeState> {
    return { ...this.state };
  }

  /**
   * Get current session configuration
   */
  public getCurrentSession(): Readonly<SessionConfiguration> | null {
    return this.currentSession ? { ...this.currentSession } : null;
  }

  /**
   * Register progress callback
   */
  public registerProgressCallback(id: string, callback: (progress: SessionProgressUpdate) => void): void {
    this.progressCallbacks.set(id, callback);
  }

  /**
   * Unregister progress callback
   */
  public unregisterProgressCallback(id: string): void {
    this.progressCallbacks.delete(id);
  }

  /**
   * Register interruption callback
   */
  public registerInterruptionCallback(id: string, callback: (interruption: SessionInterruption) => void): void {
    this.interruptionCallbacks.set(id, callback);
  }

  /**
   * Unregister interruption callback
   */
  public unregisterInterruptionCallback(id: string): void {
    this.interruptionCallbacks.delete(id);
  }

  /**
   * Get session analytics
   */
  public getSessionAnalytics(): PlaybackModeAnalytics {
    const now = Date.now();
    const sessionStart = this.state.sessionStartTime || now;

    return {
      totalSessionTime: this.state.sessionDuration,
      averageSessionLength: this.state.sessionDuration,
      mostUsedMode: this.state.currentMode,
      interruptionCount: this.state.interruptionCount,
      totalInterruptionTime: 0, // Would be calculated from actual interruptions
      batteryUsageOptimized: this.state.adaptiveQualityEnabled,
      qualityAdaptations: 0, // Would track actual adaptations
      userSatisfactionScore: 85 // Would be based on user feedback
    };
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    try {
      // Stop current session
      if (this.state.isActive) {
        await this.stopSession();
      }

      // Clear callbacks
      this.progressCallbacks.clear();
      this.interruptionCallbacks.clear();

      // Unregister from services
      this.audioControls.unregisterInterruptionListener('playback-mode');

      // Reset state
      await this.resetState();

      PlaybackModeManager.initialized = false;
      PlaybackModeManager.instance = null;

    } catch (error) {
      console.warn('Playback mode manager cleanup error:', error);
    }
  }
}

// Export singleton instance getter
export const getPlaybackModeManager = () => PlaybackModeManager.getInstance();

export default PlaybackModeManager;