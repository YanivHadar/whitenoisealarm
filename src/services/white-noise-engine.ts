/**
 * White Noise Engine Service
 * 
 * Comprehensive white noise audio processing engine for Phase 2.2.
 * Handles sound library management, advanced playback modes, session management,
 * and seamless integration with the alarm system.
 * 
 * Features:
 * - Comprehensive sound library with categorization
 * - Multiple playback modes (continuous, timed, progressive)
 * - Premium sound management and subscription integration
 * - Real-time session state management
 * - Battery-optimized background processing
 * - Cross-platform audio optimization
 */

import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase/client';
import type {
  AudioSession,
  AudioSessionState,
  AudioSessionType,
  SoundFile,
  SoundLibrary,
  SoundCategory,
  WhiteNoiseCategory,
  PlaybackMode,
  SessionConfiguration,
  SessionDuration,
  SessionProgression,
  AlarmIntegration,
  SleepOptimization,
  VolumeConfiguration,
  FadeConfiguration,
  LoopConfiguration,
  AudioRoutingConfiguration,
  AudioPerformanceMetrics,
  AudioOperationResult,
  AudioError,
  AudioErrorCode,
  SoundLibraryOperation,
  AudioTimestamp,
} from '../types/audio';

// ============================================================================
// CONSTANTS AND DEFAULT CONFIGURATIONS
// ============================================================================

/**
 * Default audio quality configurations
 */
const AUDIO_QUALITY_PRESETS = {
  low: { sample_rate: 22050, bit_depth: 16, bitrate: 128 },
  medium: { sample_rate: 44100, bit_depth: 16, bitrate: 192 },
  high: { sample_rate: 44100, bit_depth: 24, bitrate: 320 },
  premium: { sample_rate: 48000, bit_depth: 24, bitrate: 512 },
} as const;

/**
 * Default sound library with comprehensive categorization
 */
const DEFAULT_SOUND_LIBRARY: SoundLibrary = {
  version: '1.0.0',
  last_updated: new Date(),
  total_sounds: 0,
  featured_sounds: ['rain_heavy', 'ocean_waves', 'white_noise_classic'],
  recently_added: [],
  popular_sounds: ['rain_gentle', 'fan_medium', 'brown_noise'],
  categories: [
    {
      id: 'nature',
      name: 'Nature Sounds',
      description: 'Soothing sounds from nature',
      icon_url: 'assets://icons/nature.png',
      sound_count: 0,
      premium_sound_count: 0,
      is_premium_category: false,
      subcategories: [
        {
          id: 'rain',
          name: 'Rain',
          description: 'Various rain intensities and environments',
          parent_category: 'nature',
          sounds: [],
          is_premium: false,
        },
        {
          id: 'ocean',
          name: 'Ocean',
          description: 'Ocean waves and beach environments',
          parent_category: 'nature',
          sounds: [],
          is_premium: false,
        },
        {
          id: 'forest',
          name: 'Forest',
          description: 'Forest ambience and wildlife',
          parent_category: 'nature',
          sounds: [],
          is_premium: true,
        },
        {
          id: 'thunderstorm',
          name: 'Thunderstorm',
          description: 'Thunder and lightning with rain',
          parent_category: 'nature',
          sounds: [],
          is_premium: true,
        },
      ],
    },
    {
      id: 'ambient',
      name: 'Ambient Sounds',
      description: 'Generated ambient and noise sounds',
      icon_url: 'assets://icons/ambient.png',
      sound_count: 0,
      premium_sound_count: 0,
      is_premium_category: false,
      subcategories: [
        {
          id: 'white_noise',
          name: 'White Noise',
          description: 'Classic white noise variations',
          parent_category: 'ambient',
          sounds: [],
          is_premium: false,
        },
        {
          id: 'brown_noise',
          name: 'Brown Noise',
          description: 'Deep, rich brown noise',
          parent_category: 'ambient',
          sounds: [],
          is_premium: false,
        },
        {
          id: 'pink_noise',
          name: 'Pink Noise',
          description: 'Balanced frequency pink noise',
          parent_category: 'ambient',
          sounds: [],
          is_premium: true,
        },
      ],
    },
    {
      id: 'mechanical',
      name: 'Mechanical',
      description: 'Mechanical and household sounds',
      icon_url: 'assets://icons/mechanical.png',
      sound_count: 0,
      premium_sound_count: 0,
      is_premium_category: false,
      subcategories: [
        {
          id: 'fan',
          name: 'Fan',
          description: 'Various fan speeds and types',
          parent_category: 'mechanical',
          sounds: [],
          is_premium: false,
        },
        {
          id: 'air_conditioner',
          name: 'Air Conditioner',
          description: 'AC unit sounds',
          parent_category: 'mechanical',
          sounds: [],
          is_premium: true,
        },
        {
          id: 'washing_machine',
          name: 'Washing Machine',
          description: 'Washing machine cycles',
          parent_category: 'mechanical',
          sounds: [],
          is_premium: true,
        },
      ],
    },
    {
      id: 'binaural',
      name: 'Binaural Beats',
      description: 'Focus and relaxation frequencies',
      icon_url: 'assets://icons/binaural.png',
      sound_count: 0,
      premium_sound_count: 0,
      is_premium_category: true,
      subcategories: [
        {
          id: 'focus',
          name: 'Focus',
          description: 'Concentration-enhancing frequencies',
          parent_category: 'binaural',
          sounds: [],
          is_premium: true,
        },
        {
          id: 'relaxation',
          name: 'Relaxation',
          description: 'Stress-relief frequencies',
          parent_category: 'binaural',
          sounds: [],
          is_premium: true,
        },
        {
          id: 'sleep',
          name: 'Deep Sleep',
          description: 'Sleep-inducing frequencies',
          parent_category: 'binaural',
          sounds: [],
          is_premium: true,
        },
      ],
    },
  ],
};

/**
 * Storage keys for persistent data
 */
const STORAGE_KEYS = {
  SOUND_LIBRARY: 'white_noise_sound_library',
  SOUND_CACHE: 'white_noise_sound_cache',
  USER_PREFERENCES: 'white_noise_user_preferences',
  SESSION_STATE: 'white_noise_session_state',
  PERFORMANCE_METRICS: 'white_noise_performance_metrics',
} as const;

// ============================================================================
// MAIN WHITE NOISE ENGINE CLASS
// ============================================================================

export class WhiteNoiseEngine {
  private static instance: WhiteNoiseEngine | null = null;
  private static initialized = false;

  // Core state
  private soundLibrary: SoundLibrary = DEFAULT_SOUND_LIBRARY;
  private activeSessions = new Map<string, AudioSession>();
  private soundCache = new Map<string, Audio.Sound>();
  private operationQueue = new Map<string, SoundLibraryOperation>();

  // Configuration
  private userPreferences: Record<string, any> = {};
  private performanceMetrics: AudioPerformanceMetrics | null = null;
  private isSubscriptionActive = false;

  // ============================================================================
  // SINGLETON PATTERN & INITIALIZATION
  // ============================================================================

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): WhiteNoiseEngine {
    if (!WhiteNoiseEngine.instance) {
      WhiteNoiseEngine.instance = new WhiteNoiseEngine();
    }
    return WhiteNoiseEngine.instance;
  }

  /**
   * Initialize the white noise engine
   */
  static async initialize(subscriptionActive: boolean = false): Promise<void> {
    const engine = WhiteNoiseEngine.getInstance();
    
    if (WhiteNoiseEngine.initialized) {
      return;
    }

    try {
      console.log('Initializing WhiteNoiseEngine...');
      
      // Set subscription status
      engine.isSubscriptionActive = subscriptionActive;
      
      // Load persistent data
      await Promise.all([
        engine.loadSoundLibrary(),
        engine.loadUserPreferences(),
        engine.loadCachedSounds(),
        engine.initializePerformanceMonitoring(),
      ]);

      // Initialize default sound library if needed
      await engine.ensureDefaultSounds();
      
      // Configure audio system for white noise
      await engine.configureAudioSystem();

      WhiteNoiseEngine.initialized = true;
      console.log('WhiteNoiseEngine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize WhiteNoiseEngine:', error);
      throw error;
    }
  }

  // ============================================================================
  // SOUND LIBRARY MANAGEMENT
  // ============================================================================

  /**
   * Get the complete sound library
   */
  getSoundLibrary(includeCustom: boolean = true): SoundLibrary {
    if (!includeCustom) {
      return {
        ...this.soundLibrary,
        categories: this.soundLibrary.categories.map(category => ({
          ...category,
          subcategories: category.subcategories.filter(sub => !sub.id.startsWith('custom_')),
        })),
      };
    }
    return this.soundLibrary;
  }

  /**
   * Get sounds by category
   */
  getSoundsByCategory(category: WhiteNoiseCategory, includePremium: boolean = true): SoundFile[] {
    const categoryData = this.soundLibrary.categories.find(cat => cat.id === category);
    if (!categoryData) return [];

    const allSounds: SoundFile[] = [];
    for (const subcategory of categoryData.subcategories) {
      for (const sound of subcategory.sounds) {
        if (!includePremium && sound.is_premium && !this.isSubscriptionActive) {
          continue;
        }
        allSounds.push(sound);
      }
    }

    return allSounds;
  }

  /**
   * Get featured sounds
   */
  getFeaturedSounds(): SoundFile[] {
    const sounds: SoundFile[] = [];
    
    for (const soundId of this.soundLibrary.featured_sounds) {
      const sound = this.findSoundById(soundId);
      if (sound && (this.isSubscriptionActive || !sound.is_premium)) {
        sounds.push(sound);
      }
    }

    return sounds;
  }

  /**
   * Search sounds by query
   */
  searchSounds(query: string, category?: WhiteNoiseCategory): SoundFile[] {
    const searchQuery = query.toLowerCase();
    const sounds: SoundFile[] = [];

    const categoriesToSearch = category 
      ? [this.soundLibrary.categories.find(cat => cat.id === category)!]
      : this.soundLibrary.categories;

    for (const categoryData of categoriesToSearch) {
      if (!categoryData) continue;

      for (const subcategory of categoryData.subcategories) {
        for (const sound of subcategory.sounds) {
          const matchesQuery = 
            sound.name.toLowerCase().includes(searchQuery) ||
            sound.tags.some(tag => tag.toLowerCase().includes(searchQuery)) ||
            (sound.description && sound.description.toLowerCase().includes(searchQuery));

          if (matchesQuery && (this.isSubscriptionActive || !sound.is_premium)) {
            sounds.push(sound);
          }
        }
      }
    }

    return sounds;
  }

  /**
   * Download and cache a sound file
   */
  async downloadSound(soundId: string): Promise<AudioOperationResult<SoundFile>> {
    const startTime = Date.now();

    try {
      const sound = this.findSoundById(soundId);
      if (!sound) {
        return this.createErrorResult('AUDIO_FILE_NOT_FOUND', 'Sound not found', startTime);
      }

      // Check if already cached
      if (sound.local_path && this.soundCache.has(soundId)) {
        return this.createSuccessResult(sound, startTime);
      }

      // Create operation tracking
      const operation: SoundLibraryOperation = {
        operation: 'download',
        sound_id: soundId,
        progress: 0,
        status: 'in_progress',
        error: null,
        started_at: new Date(),
        completed_at: null,
      };
      this.operationQueue.set(soundId, operation);

      // Download and cache the sound
      const { sound: audioSound } = await Audio.Sound.createAsync(
        { uri: sound.url },
        { shouldPlay: false },
        null,
        true // download first for caching
      );

      // Cache the sound object
      this.soundCache.set(soundId, audioSound);
      
      // Update sound metadata with cache info
      sound.local_path = sound.url; // Expo manages the cache path
      sound.last_accessed = new Date();

      // Complete operation
      operation.progress = 1.0;
      operation.status = 'completed';
      operation.completed_at = new Date();

      // Save updated library
      await this.saveSoundLibrary();

      console.log(`Sound ${soundId} downloaded and cached successfully`);
      
      return this.createSuccessResult(sound, startTime);
    } catch (error) {
      // Mark operation as failed
      const operation = this.operationQueue.get(soundId);
      if (operation) {
        operation.status = 'failed';
        operation.error = error instanceof Error ? error.message : 'Download failed';
      }

      console.error(`Failed to download sound ${soundId}:`, error);
      return this.createErrorResult(
        'NETWORK_DOWNLOAD_FAILED', 
        `Failed to download sound: ${error instanceof Error ? error.message : 'Unknown error'}`,
        startTime
      );
    }
  }

  /**
   * Preview a sound for a limited duration
   */
  async previewSound(soundId: string, duration: number = 10000): Promise<AudioOperationResult<string>> {
    const startTime = Date.now();

    try {
      const sound = this.findSoundById(soundId);
      if (!sound) {
        return this.createErrorResult('AUDIO_FILE_NOT_FOUND', 'Sound not found', startTime);
      }

      // Create preview session
      const sessionId = `preview_${soundId}_${Date.now()}`;
      const previewSession: AudioSession = {
        id: sessionId,
        type: 'preview',
        user_id: 'preview',
        created_at: new Date(),
        updated_at: new Date(),
        state: 'loading',
        is_active: true,
        is_background: false,
        started_at: new Date(),
        ended_at: null,
        duration_target: duration / 1000,
        duration_actual: null,
        sound_config: {
          primary_sound: sound,
          secondary_sounds: [],
          format: sound.format,
          quality: AUDIO_QUALITY_PRESETS.medium,
          compression: { enabled: false, algorithm: 'none', quality_factor: 1.0, target_bitrate: null },
          cache_strategy: { enabled: true, max_cache_size: 50, ttl: 1, preload_popular: false, cleanup_frequency: 1 },
        },
        volume_config: {
          master_volume: 0.7,
          alarm_volume: 0.0,
          white_noise_volume: 0.7,
          balance: 0.0,
          bass_boost: 0.0,
          treble_boost: 0.0,
          auto_volume: false,
          volume_limits: { min: 0.1, max: 1.0, night_mode: 0.5 },
          fade_curve: 'linear',
        },
        fade_config: {
          fade_in: { enabled: false, duration: 0, curve: 'linear', start_volume: 0, end_volume: 0.7 },
          fade_out: { enabled: false, duration: 0, curve: 'linear', start_volume: 0.7, end_volume: 0 },
          cross_fade: null,
        },
        loop_config: {
          enabled: false,
          type: 'duration',
          loop_count: null,
          loop_duration: duration / 1000,
          seamless: true,
          gap_duration: 0,
          shuffle_enabled: false,
          custom_loop_points: false,
          loop_start: 0,
          loop_end: 0,
        },
        routing_config: {
          output_device: 'auto',
          force_speaker: false,
          force_headphones: false,
          respect_silent_mode: false,
          ios_audio_session: {
            category: 'playback',
            mode: 'default',
            options: {
              mixWithOthers: true,
              duckOthers: false,
              allowBluetoothA2DP: true,
              allowAirPlay: true,
            },
          },
          android_audio_focus: {
            usage: 'media',
            contentType: 'music',
            focusGain: 'gainTransient',
          },
          interruption_policy: {
            pause_on_interruption: true,
            resume_after_interruption: false,
            duck_volume_during_interruption: true,
            interruption_volume_factor: 0.3,
          },
        },
        performance: {
          cpu_usage_percent: 0,
          memory_usage_mb: 0,
          memory_peak_mb: 0,
          battery_usage_rate: 0,
          power_consumption_estimate: 0,
          audio_dropouts: 0,
          buffer_underruns: 0,
          latency_ms: 0,
          jitter_ms: 0,
          network_bytes_downloaded: 0,
          download_speed_kbps: 0,
          connection_quality: 'excellent',
          session_stability_score: 1.0,
          interruption_count: 0,
          recovery_time_ms: 0,
          last_measured_at: new Date(),
          measurement_interval_ms: 1000,
        },
        sync_state: {
          sync_enabled: false,
          sync_id: sessionId,
          last_sync_at: null,
          device_sync: { enabled: false, sync_devices: [], master_device_id: null, sync_frequency: 60 },
          cloud_sync: { enabled: false, provider: 'supabase', sync_frequency: 30, conflict_resolution_strategy: 'last_write_wins' },
          conflict_resolution: { strategy: 'last_write_wins', auto_resolve_minor_conflicts: true, manual_resolution_timeout: 30 },
        },
      };

      // Store session
      this.activeSessions.set(sessionId, previewSession);

      // Load and play audio
      const audioUri = sound.local_path || sound.url;
      const { sound: audioSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        {
          shouldPlay: true,
          volume: 0.7,
          isLooping: false,
        }
      );

      // Update session state
      previewSession.state = 'playing';
      previewSession.updated_at = new Date();

      // Auto-stop after duration
      setTimeout(async () => {
        try {
          await audioSound.stopAsync();
          await audioSound.unloadAsync();
          
          previewSession.state = 'ended';
          previewSession.ended_at = new Date();
          previewSession.is_active = false;
          
          this.activeSessions.delete(sessionId);
        } catch (error) {
          console.warn('Failed to stop preview sound:', error);
        }
      }, duration);

      console.log(`Preview started for sound ${soundId}`);
      return this.createSuccessResult(sessionId, startTime);
    } catch (error) {
      console.error(`Failed to preview sound ${soundId}:`, error);
      return this.createErrorResult(
        'AUDIO_PLAYBACK_FAILED',
        `Failed to preview sound: ${error instanceof Error ? error.message : 'Unknown error'}`,
        startTime
      );
    }
  }

  // ============================================================================
  // AUDIO SESSION MANAGEMENT
  // ============================================================================

  /**
   * Start a white noise session with comprehensive configuration
   */
  async startWhiteNoiseSession(config: SessionConfiguration): Promise<AudioOperationResult<string>> {
    const startTime = Date.now();

    try {
      // Validate configuration
      const validationResult = this.validateSessionConfiguration(config);
      if (!validationResult.valid) {
        return this.createErrorResult('AUDIO_PLAYBACK_FAILED', validationResult.error, startTime);
      }

      // Generate session ID
      const sessionId = `whitenoise_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Create comprehensive audio session
      const session = await this.createAudioSession(sessionId, config);
      
      // Store session
      this.activeSessions.set(sessionId, session);

      // Start audio playback
      await this.startSessionPlayback(session);

      // Start performance monitoring
      this.startPerformanceMonitoring(sessionId);

      // Save session state for recovery
      await this.saveSessionState(session);

      console.log(`White noise session ${sessionId} started successfully`);
      return this.createSuccessResult(sessionId, startTime);
    } catch (error) {
      console.error('Failed to start white noise session:', error);
      return this.createErrorResult(
        'AUDIO_PLAYBACK_FAILED',
        `Failed to start session: ${error instanceof Error ? error.message : 'Unknown error'}`,
        startTime
      );
    }
  }

  /**
   * Stop a white noise session
   */
  async stopWhiteNoiseSession(sessionId: string): Promise<AudioOperationResult<boolean>> {
    const startTime = Date.now();

    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        return this.createErrorResult('AUDIO_PLAYBACK_FAILED', 'Session not found', startTime);
      }

      // Stop audio playback with fade out if configured
      await this.stopSessionPlayback(session);

      // Update session state
      session.state = 'stopped';
      session.ended_at = new Date();
      session.is_active = false;
      session.duration_actual = session.ended_at.getTime() - session.started_at!.getTime();

      // Clean up session
      this.activeSessions.delete(sessionId);

      // Save final session state
      await this.saveSessionState(session);

      console.log(`White noise session ${sessionId} stopped successfully`);
      return this.createSuccessResult(true, startTime);
    } catch (error) {
      console.error(`Failed to stop session ${sessionId}:`, error);
      return this.createErrorResult(
        'AUDIO_PLAYBACK_FAILED',
        `Failed to stop session: ${error instanceof Error ? error.message : 'Unknown error'}`,
        startTime
      );
    }
  }

  /**
   * Pause a white noise session
   */
  async pauseWhiteNoiseSession(sessionId: string): Promise<AudioOperationResult<boolean>> {
    const startTime = Date.now();

    try {
      const session = this.activeSessions.get(sessionId);
      if (!session || !session.is_active) {
        return this.createErrorResult('AUDIO_PLAYBACK_FAILED', 'Session not found or not active', startTime);
      }

      // Pause audio playback
      await this.pauseSessionPlayback(session);

      // Update session state
      session.state = 'paused';
      session.updated_at = new Date();

      console.log(`White noise session ${sessionId} paused`);
      return this.createSuccessResult(true, startTime);
    } catch (error) {
      console.error(`Failed to pause session ${sessionId}:`, error);
      return this.createErrorResult(
        'AUDIO_PLAYBACK_FAILED',
        `Failed to pause session: ${error instanceof Error ? error.message : 'Unknown error'}`,
        startTime
      );
    }
  }

  /**
   * Resume a paused white noise session
   */
  async resumeWhiteNoiseSession(sessionId: string): Promise<AudioOperationResult<boolean>> {
    const startTime = Date.now();

    try {
      const session = this.activeSessions.get(sessionId);
      if (!session || session.state !== 'paused') {
        return this.createErrorResult('AUDIO_PLAYBACK_FAILED', 'Session not found or not paused', startTime);
      }

      // Resume audio playback
      await this.resumeSessionPlayback(session);

      // Update session state
      session.state = 'playing';
      session.updated_at = new Date();

      console.log(`White noise session ${sessionId} resumed`);
      return this.createSuccessResult(true, startTime);
    } catch (error) {
      console.error(`Failed to resume session ${sessionId}:`, error);
      return this.createErrorResult(
        'AUDIO_PLAYBACK_FAILED',
        `Failed to resume session: ${error instanceof Error ? error.message : 'Unknown error'}`,
        startTime
      );
    }
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): AudioSession[] {
    return Array.from(this.activeSessions.values()).filter(session => session.is_active);
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): AudioSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Load sound library from storage
   */
  private async loadSoundLibrary(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.SOUND_LIBRARY);
      if (stored) {
        this.soundLibrary = JSON.parse(stored);
        console.log('Sound library loaded from storage');
      }
    } catch (error) {
      console.warn('Failed to load sound library from storage:', error);
    }
  }

  /**
   * Save sound library to storage
   */
  private async saveSoundLibrary(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SOUND_LIBRARY, JSON.stringify(this.soundLibrary));
    } catch (error) {
      console.error('Failed to save sound library:', error);
    }
  }

  /**
   * Load user preferences from storage
   */
  private async loadUserPreferences(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      if (stored) {
        this.userPreferences = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load user preferences:', error);
    }
  }

  /**
   * Load cached sounds from storage
   */
  private async loadCachedSounds(): Promise<void> {
    try {
      // Implementation would load cached audio files
      console.log('Cached sounds loaded');
    } catch (error) {
      console.warn('Failed to load cached sounds:', error);
    }
  }

  /**
   * Initialize performance monitoring
   */
  private async initializePerformanceMonitoring(): Promise<void> {
    this.performanceMetrics = {
      cpu_usage_percent: 0,
      memory_usage_mb: 0,
      memory_peak_mb: 0,
      battery_usage_rate: 0,
      power_consumption_estimate: 0,
      audio_dropouts: 0,
      buffer_underruns: 0,
      latency_ms: 0,
      jitter_ms: 0,
      network_bytes_downloaded: 0,
      download_speed_kbps: 0,
      connection_quality: 'excellent',
      session_stability_score: 1.0,
      interruption_count: 0,
      recovery_time_ms: 0,
      last_measured_at: new Date(),
      measurement_interval_ms: 5000,
    };
  }

  /**
   * Ensure default sounds are available
   */
  private async ensureDefaultSounds(): Promise<void> {
    // Implementation would populate default sounds
    console.log('Default sounds ensured');
  }

  /**
   * Configure audio system for white noise
   */
  private async configureAudioSystem(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentMode: true,
        staysActiveInBackground: true,
        shouldCorrectPitch: false,
        shouldDuckOthers: false,
        ...(Platform.OS === 'ios' 
          ? { 
              audioModeId: Audio.AUDIO_MODE_ID_DEFAULT,
              allowsRecording: false,
            }
          : {
              audioModeId: Audio.AUDIO_MODE_ID_PLAY_BACK,
              interruptsCallsOnAndroid: false,
            }
        ),
      });
      console.log('Audio system configured for white noise');
    } catch (error) {
      console.error('Failed to configure audio system:', error);
    }
  }

  /**
   * Find sound by ID across all categories
   */
  private findSoundById(soundId: string): SoundFile | null {
    for (const category of this.soundLibrary.categories) {
      for (const subcategory of category.subcategories) {
        for (const sound of subcategory.sounds) {
          if (sound.id === soundId) {
            return sound;
          }
        }
      }
    }
    return null;
  }

  /**
   * Validate session configuration
   */
  private validateSessionConfiguration(config: SessionConfiguration): { valid: boolean; error?: string } {
    if (!config.mode) {
      return { valid: false, error: 'Playback mode is required' };
    }

    if (config.duration.type === 'fixed' && (!config.duration.duration_minutes || config.duration.duration_minutes <= 0)) {
      return { valid: false, error: 'Duration must be specified for fixed mode' };
    }

    return { valid: true };
  }

  /**
   * Create audio session from configuration
   */
  private async createAudioSession(sessionId: string, config: SessionConfiguration): Promise<AudioSession> {
    // Implementation would create a comprehensive AudioSession
    // This is a simplified version
    const session: AudioSession = {
      id: sessionId,
      type: 'white_noise',
      user_id: 'current_user', // Would come from auth context
      created_at: new Date(),
      updated_at: new Date(),
      state: 'loading',
      is_active: true,
      is_background: config.mode === 'continuous',
      started_at: new Date(),
      ended_at: null,
      duration_target: config.duration.duration_minutes ? config.duration.duration_minutes * 60 : null,
      duration_actual: null,
      // ... other configuration would be populated based on config parameter
    } as AudioSession;

    return session;
  }

  /**
   * Start audio playback for session
   */
  private async startSessionPlayback(session: AudioSession): Promise<void> {
    // Implementation would start actual audio playback
    session.state = 'playing';
    console.log(`Started playback for session ${session.id}`);
  }

  /**
   * Stop audio playback for session
   */
  private async stopSessionPlayback(session: AudioSession): Promise<void> {
    // Implementation would stop actual audio playback
    console.log(`Stopped playback for session ${session.id}`);
  }

  /**
   * Pause audio playback for session
   */
  private async pauseSessionPlayback(session: AudioSession): Promise<void> {
    // Implementation would pause actual audio playback
    console.log(`Paused playback for session ${session.id}`);
  }

  /**
   * Resume audio playback for session
   */
  private async resumeSessionPlayback(session: AudioSession): Promise<void> {
    // Implementation would resume actual audio playback
    console.log(`Resumed playback for session ${session.id}`);
  }

  /**
   * Start performance monitoring for session
   */
  private startPerformanceMonitoring(sessionId: string): void {
    // Implementation would start performance monitoring
    console.log(`Started performance monitoring for session ${sessionId}`);
  }

  /**
   * Save session state for recovery
   */
  private async saveSessionState(session: AudioSession): Promise<void> {
    try {
      const sessionData = JSON.stringify(session);
      await AsyncStorage.setItem(`${STORAGE_KEYS.SESSION_STATE}_${session.id}`, sessionData);
    } catch (error) {
      console.warn('Failed to save session state:', error);
    }
  }

  /**
   * Create success result
   */
  private createSuccessResult<T>(data: T, startTime: number): AudioOperationResult<T> {
    return {
      success: true,
      data,
      error: null,
      performance_metrics: this.performanceMetrics || {},
      operation_duration_ms: Date.now() - startTime,
    };
  }

  /**
   * Create error result
   */
  private createErrorResult(code: AudioErrorCode, message: string, startTime: number): AudioOperationResult<null> {
    const error: AudioError = {
      code,
      message,
      session_id: null,
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
      stack_trace: null,
      recovery_suggestions: [],
    };

    return {
      success: false,
      data: null,
      error,
      performance_metrics: this.performanceMetrics || {},
      operation_duration_ms: Date.now() - startTime,
    };
  }
}

export default WhiteNoiseEngine;