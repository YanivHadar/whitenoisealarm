/**
 * Audio Processing & White Noise Engine Types
 * 
 * Comprehensive type definitions for Phase 2.2: Audio Processing & White Noise Engine.
 * Covers white noise sessions, background audio processing, performance monitoring,
 * and advanced audio controls for the Alarm & White Noise app.
 */

import type { Audio } from 'expo-av';
import type { Database } from './database';

// ============================================================================
// CORE AUDIO SESSION TYPES
// ============================================================================

/**
 * Audio session types for different use cases
 */
export type AudioSessionType = 
  | 'alarm' // Alarm sound playback
  | 'white_noise' // Background white noise
  | 'preview' // Sound preview
  | 'sleep_session' // Complete sleep session (alarm + white noise)
  | 'test' // Audio testing and validation
  | 'background_continuous'; // Continuous background playback

/**
 * Audio session state management
 */
export type AudioSessionState = 
  | 'idle' // Not active
  | 'loading' // Preparing audio
  | 'ready' // Loaded and ready
  | 'playing' // Currently playing
  | 'paused' // Paused by user or system
  | 'stopped' // Stopped intentionally
  | 'ended' // Completed naturally
  | 'error' // Error state
  | 'interrupted' // System interruption
  | 'fading_in' // Currently fading in
  | 'fading_out'; // Currently fading out

/**
 * Comprehensive audio session configuration
 */
export interface AudioSession {
  // Core identification
  id: string;
  type: AudioSessionType;
  user_id: string;
  created_at: Date;
  updated_at: Date;

  // Session state
  state: AudioSessionState;
  is_active: boolean;
  is_background: boolean;
  started_at: Date | null;
  ended_at: Date | null;
  duration_target: number | null; // Target duration in seconds, null for infinite
  duration_actual: number | null; // Actual playback duration

  // Audio configuration
  sound_config: SoundConfiguration;
  volume_config: VolumeConfiguration;
  fade_config: FadeConfiguration;
  loop_config: LoopConfiguration;
  routing_config: AudioRoutingConfiguration;

  // Performance monitoring
  performance: AudioPerformanceMetrics;

  // Real-time synchronization
  sync_state: AudioSyncState;
}

// ============================================================================
// SOUND CONFIGURATION TYPES
// ============================================================================

/**
 * Sound file configuration and metadata
 */
export interface SoundConfiguration {
  primary_sound: SoundFile;
  secondary_sounds: SoundFile[]; // For mixing multiple sounds
  format: AudioFormat;
  quality: AudioQuality;
  compression: CompressionSettings;
  cache_strategy: CacheStrategy;
}

/**
 * Individual sound file representation
 */
export interface SoundFile {
  id: string;
  name: string;
  url: string;
  local_path: string | null; // Cached file path
  category: WhiteNoiseCategory;
  subcategory: string | null;
  
  // Audio properties
  format: AudioFormat;
  duration: number | null; // null for loopable/infinite sounds
  sample_rate: number; // Hz
  bit_depth: number;
  channels: number; // 1 = mono, 2 = stereo
  bitrate: number; // kbps
  file_size: number; // bytes
  
  // Metadata
  is_premium: boolean;
  is_loopable: boolean;
  loop_start_point: number; // seconds
  loop_end_point: number; // seconds
  tags: string[];
  description: string | null;
  
  // Performance optimization
  preload_priority: 'high' | 'medium' | 'low';
  cache_duration: number; // hours
  last_accessed: Date | null;
}

/**
 * Audio format specifications
 */
export type AudioFormat = 'mp3' | 'wav' | 'aac' | 'm4a' | 'ogg' | 'flac';

/**
 * Audio quality levels
 */
export interface AudioQuality {
  level: 'low' | 'medium' | 'high' | 'premium';
  sample_rate: number;
  bit_depth: number;
  bitrate: number;
  description: string;
}

/**
 * Audio compression settings
 */
export interface CompressionSettings {
  enabled: boolean;
  algorithm: 'mp3' | 'aac' | 'opus' | 'none';
  quality_factor: number; // 0.0-1.0
  target_bitrate: number | null; // kbps
}

/**
 * Cache management strategy
 */
export interface CacheStrategy {
  enabled: boolean;
  max_cache_size: number; // MB
  ttl: number; // hours
  preload_popular: boolean;
  cleanup_frequency: number; // hours
}

// ============================================================================
// PLAYBACK CONTROL TYPES
// ============================================================================

/**
 * Volume control with advanced features
 */
export interface VolumeConfiguration {
  master_volume: number; // 0.0-1.0
  alarm_volume: number; // 0.0-1.0
  white_noise_volume: number; // 0.0-1.0
  
  // Advanced volume controls
  balance: number; // -1.0 to 1.0 (left/right)
  bass_boost: number; // 0.0-1.0
  treble_boost: number; // 0.0-1.0
  
  // Dynamic volume
  auto_volume: boolean;
  volume_limits: {
    min: number;
    max: number;
    night_mode: number; // Volume limit during night hours
  };
  
  // Volume curves
  fade_curve: 'linear' | 'exponential' | 'logarithmic' | 'ease_in_out';
}

/**
 * Fade effect configuration
 */
export interface FadeConfiguration {
  fade_in: FadeEffect;
  fade_out: FadeEffect;
  cross_fade: CrossFadeEffect | null; // For transitioning between sounds
}

export interface FadeEffect {
  enabled: boolean;
  duration: number; // seconds
  curve: 'linear' | 'exponential' | 'logarithmic' | 'ease_in_out';
  start_volume: number; // 0.0-1.0
  end_volume: number; // 0.0-1.0
}

export interface CrossFadeEffect {
  enabled: boolean;
  duration: number; // seconds
  curve: 'linear' | 'exponential';
  overlap_duration: number; // seconds
}

/**
 * Loop configuration for continuous playback
 */
export interface LoopConfiguration {
  enabled: boolean;
  type: 'infinite' | 'count' | 'duration';
  loop_count: number | null; // null for infinite
  loop_duration: number | null; // seconds, null for sound length
  
  // Seamless looping
  seamless: boolean;
  gap_duration: number; // seconds between loops
  shuffle_enabled: boolean; // Shuffle multiple sounds
  
  // Loop points
  custom_loop_points: boolean;
  loop_start: number; // seconds into track
  loop_end: number; // seconds into track
}

/**
 * Audio routing and output configuration
 */
export interface AudioRoutingConfiguration {
  output_device: AudioOutputDevice;
  force_speaker: boolean;
  force_headphones: boolean;
  respect_silent_mode: boolean;
  
  // Platform-specific routing
  ios_audio_session: iOSAudioSessionConfig;
  android_audio_focus: AndroidAudioFocusConfig;
  
  // Interruption handling
  interruption_policy: AudioInterruptionPolicy;
}

export type AudioOutputDevice = 'auto' | 'speaker' | 'headphones' | 'bluetooth' | 'airplay';

export interface iOSAudioSessionConfig {
  category: 'playback' | 'playAndRecord' | 'multiRoute';
  mode: 'default' | 'gameChat' | 'measurement' | 'moviePlayback' | 'spokenAudio';
  options: {
    mixWithOthers: boolean;
    duckOthers: boolean;
    allowBluetoothA2DP: boolean;
    allowAirPlay: boolean;
  };
}

export interface AndroidAudioFocusConfig {
  usage: 'alarm' | 'media' | 'notification' | 'assistantAccessibility';
  contentType: 'music' | 'speech' | 'sonification' | 'unknown';
  focusGain: 'gain' | 'gainTransient' | 'gainTransientMayDuck';
}

export interface AudioInterruptionPolicy {
  pause_on_interruption: boolean;
  resume_after_interruption: boolean;
  duck_volume_during_interruption: boolean;
  interruption_volume_factor: number; // 0.0-1.0
}

// ============================================================================
// PLAYBACK MODES & SESSION TYPES
// ============================================================================

/**
 * White noise session modes
 */
export type PlaybackMode = 
  | 'continuous' // Play until manually stopped
  | 'timed' // Play for specific duration
  | 'progressive' // Volume/intensity changes over time
  | 'alarm_integrated' // Coordinated with alarm
  | 'sleep_cycle' // Follows sleep cycle phases
  | 'focus_mode' // Optimized for concentration
  | 'meditation' // Optimized for meditation
  | 'nap_mode'; // Optimized for short naps

/**
 * Session configuration for different modes
 */
export interface SessionConfiguration {
  mode: PlaybackMode;
  duration: SessionDuration;
  progression: SessionProgression | null;
  alarm_integration: AlarmIntegration | null;
  sleep_optimization: SleepOptimization | null;
}

export interface SessionDuration {
  type: 'infinite' | 'fixed' | 'until_alarm' | 'sleep_cycle';
  duration_minutes: number | null;
  auto_extend: boolean;
  max_extension: number | null; // minutes
}

/**
 * Progressive session changes over time
 */
export interface SessionProgression {
  enabled: boolean;
  progression_type: 'volume' | 'frequency' | 'sound_mix' | 'tempo';
  
  // Volume progression
  volume_curve: ProgressionCurve;
  
  // Frequency progression (for binaural beats)
  frequency_start: number; // Hz
  frequency_end: number; // Hz
  frequency_curve: ProgressionCurve;
  
  // Sound mixing progression
  sound_transitions: SoundTransition[];
}

export interface ProgressionCurve {
  type: 'linear' | 'exponential' | 'logarithmic' | 'sine_wave' | 'custom';
  duration: number; // seconds
  control_points: Array<{ time: number; value: number }>; // For custom curves
}

export interface SoundTransition {
  from_sound_id: string;
  to_sound_id: string;
  transition_time: number; // seconds into session
  transition_duration: number; // seconds
  transition_type: 'fade' | 'cut' | 'overlap';
}

/**
 * Integration with alarm system
 */
export interface AlarmIntegration {
  enabled: boolean;
  alarm_id: string | null;
  
  // Behavior when alarm fires
  on_alarm_trigger: 'stop' | 'fade_out' | 'pause' | 'continue' | 'volume_duck';
  fade_out_duration: number; // seconds
  volume_duck_factor: number; // 0.0-1.0
  
  // Pre-alarm behavior
  pre_alarm_minutes: number; // Start white noise X minutes before alarm
  pre_alarm_fade_in: boolean;
  
  // Snooze integration
  pause_during_snooze: boolean;
  resume_after_snooze: boolean;
}

/**
 * Sleep cycle optimization
 */
export interface SleepOptimization {
  enabled: boolean;
  
  // Sleep phase adaptation
  adapt_to_sleep_phase: boolean;
  light_sleep_volume: number; // 0.0-1.0
  deep_sleep_volume: number; // 0.0-1.0
  rem_sleep_volume: number; // 0.0-1.0
  
  // Smart wake optimization
  smart_wake_enabled: boolean;
  wake_window_minutes: number; // Wake during light sleep within X minutes of alarm
  
  // Sleep tracking integration
  sleep_tracking_source: 'device' | 'wearable' | 'manual' | 'none';
}

// ============================================================================
// BACKGROUND PROCESSING TYPES
// ============================================================================

/**
 * Background task configuration
 */
export interface BackgroundTaskConfig {
  task_name: string;
  task_id: string;
  interval: number; // seconds
  minimum_interval: number; // seconds
  execution_time_limit: number; // seconds
  
  // Background fetch configuration
  background_fetch_interval: number; // seconds
  background_app_refresh_required: boolean;
  
  // Battery optimization
  battery_optimization: BatteryOptimizationConfig;
  
  // System integration
  system_integration: SystemIntegrationConfig;
}

/**
 * Battery usage optimization
 */
export interface BatteryOptimizationConfig {
  enabled: boolean;
  target_battery_usage_percent: number; // Max % of battery per hour
  
  // Performance scaling
  low_battery_threshold: number; // 0.0-1.0
  low_battery_actions: LowBatteryAction[];
  
  // CPU optimization
  cpu_throttling_enabled: boolean;
  max_cpu_usage_percent: number;
  
  // Audio quality scaling
  quality_scaling: QualityScalingConfig;
}

export type LowBatteryAction = 
  | 'reduce_quality' 
  | 'reduce_volume' 
  | 'pause_secondary_sounds'
  | 'extend_buffer_intervals'
  | 'disable_effects';

export interface QualityScalingConfig {
  enabled: boolean;
  battery_thresholds: Array<{
    battery_level: number; // 0.0-1.0
    max_quality: AudioQuality['level'];
    max_bitrate: number;
  }>;
}

/**
 * System integration for background processing
 */
export interface SystemIntegrationConfig {
  // iOS specific
  ios_background_modes: string[]; // audio, background-processing, etc.
  ios_audio_session_category: string;
  
  // Android specific
  android_foreground_service: boolean;
  android_wake_locks: WakeLockConfig;
  android_doze_optimization: boolean;
  
  // Cross-platform
  system_audio_focus: boolean;
  respect_do_not_disturb: boolean;
}

export interface WakeLockConfig {
  cpu_wake_lock: boolean;
  screen_wake_lock: boolean;
  wifi_wake_lock: boolean;
  partial_wake_lock: boolean;
}

// ============================================================================
// PERFORMANCE MONITORING TYPES
// ============================================================================

/**
 * Real-time performance metrics
 */
export interface AudioPerformanceMetrics {
  // CPU and memory
  cpu_usage_percent: number;
  memory_usage_mb: number;
  memory_peak_mb: number;
  
  // Battery impact
  battery_usage_rate: number; // %/hour
  power_consumption_estimate: number; // mW
  
  // Audio quality metrics
  audio_dropouts: number;
  buffer_underruns: number;
  latency_ms: number;
  jitter_ms: number;
  
  // Network metrics (for streaming)
  network_bytes_downloaded: number;
  download_speed_kbps: number;
  connection_quality: 'excellent' | 'good' | 'fair' | 'poor';
  
  // Session metrics
  session_stability_score: number; // 0.0-1.0
  interruption_count: number;
  recovery_time_ms: number;
  
  // Timestamps
  last_measured_at: Date;
  measurement_interval_ms: number;
}

/**
 * Performance monitoring configuration
 */
export interface PerformanceMonitoringConfig {
  enabled: boolean;
  monitoring_interval: number; // seconds
  detailed_logging: boolean;
  
  // Alert thresholds
  alert_thresholds: PerformanceAlertThresholds;
  
  // Data collection
  collect_analytics: boolean;
  analytics_retention_days: number;
  
  // Reporting
  performance_reports: boolean;
  report_frequency: 'hourly' | 'daily' | 'weekly';
}

export interface PerformanceAlertThresholds {
  cpu_usage_percent: number;
  memory_usage_mb: number;
  battery_usage_rate: number; // %/hour
  audio_dropouts_per_minute: number;
  buffer_underruns_per_minute: number;
  latency_ms: number;
}

// ============================================================================
// REAL-TIME SYNCHRONIZATION TYPES
// ============================================================================

/**
 * Real-time sync state for cross-device coordination
 */
export interface AudioSyncState {
  sync_enabled: boolean;
  sync_id: string;
  last_sync_at: Date | null;
  
  // Cross-device synchronization
  device_sync: DeviceSyncConfig;
  
  // Cloud state synchronization
  cloud_sync: CloudSyncConfig;
  
  // Conflict resolution
  conflict_resolution: ConflictResolutionConfig;
}

export interface DeviceSyncConfig {
  enabled: boolean;
  sync_devices: SyncDevice[];
  master_device_id: string | null;
  sync_frequency: number; // seconds
}

export interface SyncDevice {
  device_id: string;
  device_name: string;
  device_type: 'phone' | 'tablet' | 'watch' | 'computer';
  last_seen: Date;
  is_online: boolean;
}

export interface CloudSyncConfig {
  enabled: boolean;
  provider: 'supabase' | 'custom';
  sync_frequency: number; // seconds
  conflict_resolution_strategy: 'last_write_wins' | 'manual' | 'merge';
}

export interface ConflictResolutionConfig {
  strategy: 'last_write_wins' | 'manual_resolution' | 'merge_strategies';
  auto_resolve_minor_conflicts: boolean;
  manual_resolution_timeout: number; // seconds
}

// ============================================================================
// SOUND LIBRARY MANAGEMENT TYPES
// ============================================================================

/**
 * White noise categories with detailed subcategories
 */
export type WhiteNoiseCategory = 
  | 'nature' // Rain, ocean, forest, etc.
  | 'ambient' // Brown noise, white noise, pink noise
  | 'mechanical' // Fan, air conditioner, car engine
  | 'binaural' // Binaural beats for focus/relaxation
  | 'urban' // City sounds, traffic, cafe
  | 'seasonal' // Seasonal nature sounds
  | 'custom'; // User uploaded sounds

export interface SoundLibrary {
  version: string;
  last_updated: Date;
  total_sounds: number;
  categories: SoundCategory[];
  featured_sounds: string[]; // Sound IDs
  recently_added: string[]; // Sound IDs
  popular_sounds: string[]; // Sound IDs
}

export interface SoundCategory {
  id: WhiteNoiseCategory;
  name: string;
  description: string;
  icon_url: string;
  subcategories: SoundSubcategory[];
  sound_count: number;
  premium_sound_count: number;
  is_premium_category: boolean;
}

export interface SoundSubcategory {
  id: string;
  name: string;
  description: string;
  parent_category: WhiteNoiseCategory;
  sounds: SoundFile[];
  is_premium: boolean;
}

/**
 * Sound library management operations
 */
export interface SoundLibraryOperation {
  operation: 'download' | 'delete' | 'update' | 'cache' | 'preview';
  sound_id: string;
  progress: number; // 0.0-1.0
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  error: string | null;
  started_at: Date;
  completed_at: Date | null;
}

// ============================================================================
// ADVANCED AUDIO CONTROLS TYPES
// ============================================================================

/**
 * Equalizer configuration
 */
export interface EqualizerConfig {
  enabled: boolean;
  preset: EqualizerPreset | null;
  custom_bands: EqualizerBand[];
  
  // Presets
  presets: EqualizerPreset[];
  active_preset_id: string | null;
}

export interface EqualizerPreset {
  id: string;
  name: string;
  description: string;
  bands: EqualizerBand[];
  is_custom: boolean;
  created_by: string | null; // user_id for custom presets
}

export interface EqualizerBand {
  frequency: number; // Hz
  gain: number; // dB (-12 to +12)
  bandwidth: number; // Hz
}

/**
 * Audio effects processing
 */
export interface AudioEffectsConfig {
  enabled: boolean;
  effects: AudioEffect[];
  chain_order: string[]; // Effect IDs in processing order
}

export interface AudioEffect {
  id: string;
  type: AudioEffectType;
  name: string;
  enabled: boolean;
  parameters: Record<string, number>;
  wet_dry_mix: number; // 0.0-1.0
}

export type AudioEffectType = 
  | 'reverb'
  | 'delay'
  | 'chorus'
  | 'compressor'
  | 'limiter'
  | 'noise_gate'
  | 'pitch_shift'
  | 'time_stretch'
  | 'stereo_width'
  | 'bass_boost'
  | 'treble_boost';

// ============================================================================
// ERROR HANDLING & DIAGNOSTICS TYPES
// ============================================================================

/**
 * Audio system error types
 */
export type AudioErrorCode = 
  | 'AUDIO_FILE_NOT_FOUND'
  | 'AUDIO_FILE_CORRUPTED' 
  | 'AUDIO_FORMAT_UNSUPPORTED'
  | 'AUDIO_PLAYBACK_FAILED'
  | 'BACKGROUND_TASK_FAILED'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'DEVICE_AUDIO_UNAVAILABLE'
  | 'NETWORK_DOWNLOAD_FAILED'
  | 'CACHE_STORAGE_FULL'
  | 'BATTERY_OPTIMIZATION_INTERFERENCE'
  | 'SYSTEM_AUDIO_INTERRUPTION'
  | 'CROSS_PLATFORM_INCOMPATIBILITY';

export interface AudioError {
  code: AudioErrorCode;
  message: string;
  session_id: string | null;
  sound_id: string | null;
  timestamp: Date;
  platform: 'ios' | 'android' | 'web';
  device_info: DeviceInfo;
  stack_trace: string | null;
  recovery_suggestions: string[];
}

export interface DeviceInfo {
  model: string;
  os_version: string;
  app_version: string;
  audio_capabilities: AudioCapabilities;
  available_storage_mb: number;
  battery_level: number;
}

export interface AudioCapabilities {
  max_sample_rate: number;
  supported_formats: AudioFormat[];
  has_bluetooth: boolean;
  has_headphone_jack: boolean;
  max_audio_channels: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Time-based utilities for audio sessions
 */
export interface AudioTimestamp {
  session_start: Date;
  current_position: number; // seconds
  total_duration: number | null; // seconds, null for infinite
  remaining_time: number | null; // seconds, null for infinite
  formatted_position: string; // "MM:SS" or "HH:MM:SS"
  formatted_remaining: string | null;
}

/**
 * Audio visualization data
 */
export interface AudioVisualizationData {
  waveform: number[]; // Amplitude values
  spectrum: number[]; // Frequency spectrum
  peak_level: number; // Current peak level
  rms_level: number; // RMS level
  frequency_peaks: Array<{ frequency: number; amplitude: number }>;
}

/**
 * Audio testing and validation
 */
export interface AudioTestResult {
  test_type: 'playback' | 'quality' | 'performance' | 'compatibility';
  passed: boolean;
  score: number; // 0.0-1.0
  metrics: Record<string, number>;
  issues: string[];
  recommendations: string[];
  test_duration_ms: number;
  platform: 'ios' | 'android' | 'web';
}

// ============================================================================
// EXPORT UTILITY TYPES
// ============================================================================

/**
 * Combined configuration for complete audio system initialization
 */
export interface AudioSystemConfig {
  session_config: SessionConfiguration;
  background_task_config: BackgroundTaskConfig;
  performance_monitoring: PerformanceMonitoringConfig;
  sound_library: SoundLibrary;
  equalizer: EqualizerConfig;
  effects: AudioEffectsConfig;
  sync_state: AudioSyncState;
}

/**
 * Audio operation result wrapper
 */
export interface AudioOperationResult<T = any> {
  success: boolean;
  data: T | null;
  error: AudioError | null;
  performance_metrics: Partial<AudioPerformanceMetrics>;
  session_id?: string;
  operation_duration_ms: number;
}

/**
 * Re-export enums from database for convenience
 */
export type { WhiteNoiseCategory as DBWhiteNoiseCategory } from './database';