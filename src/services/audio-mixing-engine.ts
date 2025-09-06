/**
 * Real-Time Audio Mixing Engine
 * 
 * Advanced audio mixing capabilities for Phase 5.2 completion.
 * Provides real-time volume adjustments, crossfade functionality,
 * and seamless transitions between different sounds.
 * 
 * Features:
 * - Real-time volume mixing of multiple audio sources
 * - Smooth crossfade transitions
 * - Dynamic audio parameter adjustment
 * - Performance-optimized mixing algorithms
 * - Integration with existing audio controls service
 * 
 * @author Alarm & White Noise App Development Team
 * @version 1.0.0
 */

import { Audio, AVPlaybackSource, AVPlaybackStatus } from 'expo-av';
import { Platform } from 'react-native';
import { getAudioControls } from './audio-controls';
import { getSoundLibraryManager } from './sound-library-manager';
import type {
  SoundFile,
  AudioOperationResult,
  FadeConfiguration,
  AudioRoute,
  AudioSessionState
} from '../types/audio';

/**
 * Audio mixing configuration
 */
export interface MixingConfiguration {
  maxConcurrentSounds: number;
  defaultCrossfadeDuration: number;
  volumeStepSize: number;
  updateInterval: number;
  enableRealTimeAdjustments: boolean;
}

/**
 * Mixed audio source representation
 */
export interface MixedAudioSource {
  id: string;
  soundFile: SoundFile;
  audioObject: Audio.Sound;
  volume: number;
  targetVolume: number;
  isFading: boolean;
  fadeStartTime: number;
  fadeDuration: number;
  loopCount: number;
  isPlaying: boolean;
  isPaused: boolean;
}

/**
 * Mixing operation result
 */
export interface MixingOperationResult {
  success: boolean;
  activeSourcesCount: number;
  totalVolume: number;
  error?: string;
}

/**
 * Custom loop point configuration
 */
export interface CustomLoopPoint {
  soundId: string;
  startTime: number;
  endTime: number;
  enabled: boolean;
}

/**
 * Real-Time Audio Mixing Engine Class
 */
export class AudioMixingEngine {
  private static instance: AudioMixingEngine | null = null;
  private static initialized = false;

  private activeSources: Map<string, MixedAudioSource> = new Map();
  private mixingConfig: MixingConfiguration;
  private mixingTimer: NodeJS.Timeout | null = null;
  private customLoopPoints: Map<string, CustomLoopPoint> = new Map();
  private audioControls = getAudioControls();
  private soundLibraryManager = getSoundLibraryManager();

  private readonly DEFAULT_CONFIG: MixingConfiguration = {
    maxConcurrentSounds: 4,
    defaultCrossfadeDuration: 2000,
    volumeStepSize: 0.02,
    updateInterval: 50, // 50ms updates for smooth transitions
    enableRealTimeAdjustments: true
  };

  private constructor() {
    this.mixingConfig = { ...this.DEFAULT_CONFIG };
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AudioMixingEngine {
    if (!AudioMixingEngine.instance) {
      AudioMixingEngine.instance = new AudioMixingEngine();
    }
    return AudioMixingEngine.instance;
  }

  /**
   * Initialize audio mixing engine
   */
  public static async initialize(config?: Partial<MixingConfiguration>): Promise<AudioOperationResult<boolean>> {
    try {
      const instance = AudioMixingEngine.getInstance();

      if (AudioMixingEngine.initialized) {
        return {
          success: true,
          data: true,
          message: 'Audio mixing engine already initialized'
        };
      }

      // Apply custom configuration
      if (config) {
        instance.mixingConfig = { ...instance.DEFAULT_CONFIG, ...config };
      }

      // Initialize audio controls if not already done
      if (!instance.audioControls.isInitialized()) {
        await instance.audioControls.initialize();
      }

      // Start real-time mixing loop
      if (instance.mixingConfig.enableRealTimeAdjustments) {
        instance.startMixingLoop();
      }

      AudioMixingEngine.initialized = true;

      return {
        success: true,
        data: true,
        message: 'Audio mixing engine initialized successfully'
      };

    } catch (error) {
      return {
        success: false,
        data: false,
        error: error instanceof Error ? error.message : 'Unknown initialization error',
        message: 'Failed to initialize audio mixing engine'
      };
    }
  }

  /**
   * Add sound to mixing session
   */
  public async addSoundToMix(
    soundId: string, 
    volume: number = 1.0,
    shouldLoop: boolean = true
  ): Promise<AudioOperationResult<string>> {
    try {
      // Check if we've reached the concurrent sound limit
      if (this.activeSources.size >= this.mixingConfig.maxConcurrentSounds) {
        return {
          success: false,
          data: '',
          error: 'Maximum concurrent sounds reached',
          message: `Cannot add more than ${this.mixingConfig.maxConcurrentSounds} sounds simultaneously`
        };
      }

      // Get sound file from library
      const soundFile = this.soundLibraryManager.getSound(soundId);
      if (!soundFile) {
        return {
          success: false,
          data: '',
          error: 'Sound not found',
          message: `Sound with ID ${soundId} not found in library`
        };
      }

      // Check premium access
      if (this.soundLibraryManager.requiresPremium(soundId)) {
        return {
          success: false,
          data: '',
          error: 'Premium subscription required',
          message: 'This sound requires an active premium subscription'
        };
      }

      // Check if sound is already in the mix
      if (this.activeSources.has(soundId)) {
        return {
          success: false,
          data: soundId,
          error: 'Sound already in mix',
          message: 'This sound is already playing in the current mix'
        };
      }

      // Load and prepare audio
      const audioObject = new Audio.Sound();
      const audioSource: AVPlaybackSource = soundFile.localPath
        ? { uri: soundFile.localPath }
        : { uri: soundFile.fileUrl };

      await audioObject.loadAsync(audioSource, {
        shouldPlay: false,
        volume: volume,
        isLooping: shouldLoop && soundFile.isLoopable,
        positionMillis: 0
      });

      // Create mixed audio source
      const mixedSource: MixedAudioSource = {
        id: soundId,
        soundFile: soundFile,
        audioObject: audioObject,
        volume: volume,
        targetVolume: volume,
        isFading: false,
        fadeStartTime: 0,
        fadeDuration: 0,
        loopCount: 0,
        isPlaying: false,
        isPaused: false
      };

      // Add to active sources
      this.activeSources.set(soundId, mixedSource);

      // Register with audio controls for volume updates
      this.audioControls.registerVolumeCallback(soundId, async (newVolume) => {
        await this.updateSourceVolume(soundId, newVolume);
      });

      return {
        success: true,
        data: soundId,
        message: 'Sound added to mix successfully'
      };

    } catch (error) {
      return {
        success: false,
        data: '',
        error: error instanceof Error ? error.message : 'Unknown mixing error',
        message: 'Failed to add sound to mix'
      };
    }
  }

  /**
   * Remove sound from mixing session
   */
  public async removeSoundFromMix(soundId: string, fadeOut: boolean = true): Promise<AudioOperationResult<boolean>> {
    try {
      const source = this.activeSources.get(soundId);
      if (!source) {
        return {
          success: false,
          data: false,
          error: 'Sound not in mix',
          message: 'Sound is not currently in the active mix'
        };
      }

      if (fadeOut && !source.isFading) {
        // Fade out before removing
        await this.fadeSourceVolume(soundId, 0, this.mixingConfig.defaultCrossfadeDuration);
      }

      // Stop and unload audio
      await source.audioObject.stopAsync();
      await source.audioObject.unloadAsync();

      // Remove from active sources
      this.activeSources.delete(soundId);

      // Unregister from audio controls
      this.audioControls.unregisterVolumeCallback(soundId);

      return {
        success: true,
        data: true,
        message: 'Sound removed from mix successfully'
      };

    } catch (error) {
      return {
        success: false,
        data: false,
        error: error instanceof Error ? error.message : 'Unknown removal error',
        message: 'Failed to remove sound from mix'
      };
    }
  }

  /**
   * Start playing all sounds in the mix
   */
  public async playMix(): Promise<MixingOperationResult> {
    try {
      let successCount = 0;
      const promises: Promise<void>[] = [];

      for (const [soundId, source] of this.activeSources.entries()) {
        if (!source.isPlaying && !source.isPaused) {
          promises.push(
            source.audioObject.playAsync().then(() => {
              source.isPlaying = true;
              source.isPaused = false;
              successCount++;
            }).catch((error) => {
              console.warn(`Failed to start playing sound ${soundId}:`, error);
            })
          );
        }
      }

      await Promise.all(promises);

      return {
        success: successCount > 0,
        activeSourcesCount: successCount,
        totalVolume: this.calculateTotalVolume()
      };

    } catch (error) {
      return {
        success: false,
        activeSourcesCount: 0,
        totalVolume: 0,
        error: error instanceof Error ? error.message : 'Unknown play error'
      };
    }
  }

  /**
   * Pause all sounds in the mix
   */
  public async pauseMix(): Promise<MixingOperationResult> {
    try {
      const promises: Promise<void>[] = [];

      for (const [soundId, source] of this.activeSources.entries()) {
        if (source.isPlaying) {
          promises.push(
            source.audioObject.pauseAsync().then(() => {
              source.isPlaying = false;
              source.isPaused = true;
            }).catch((error) => {
              console.warn(`Failed to pause sound ${soundId}:`, error);
            })
          );
        }
      }

      await Promise.all(promises);

      return {
        success: true,
        activeSourcesCount: this.activeSources.size,
        totalVolume: this.calculateTotalVolume()
      };

    } catch (error) {
      return {
        success: false,
        activeSourcesCount: 0,
        totalVolume: 0,
        error: error instanceof Error ? error.message : 'Unknown pause error'
      };
    }
  }

  /**
   * Cross-fade between sounds
   */
  public async crossFadeSounds(
    fromSoundId: string,
    toSoundId: string,
    duration: number = this.mixingConfig.defaultCrossfadeDuration
  ): Promise<AudioOperationResult<boolean>> {
    try {
      const fromSource = this.activeSources.get(fromSoundId);
      const toSource = this.activeSources.get(toSoundId);

      if (!fromSource || !toSource) {
        return {
          success: false,
          data: false,
          error: 'One or both sounds not in mix',
          message: 'Both sounds must be in the active mix for crossfading'
        };
      }

      // Start both fades simultaneously
      const fadeOutPromise = this.fadeSourceVolume(fromSoundId, 0, duration);
      const fadeInPromise = this.fadeSourceVolume(toSoundId, toSource.targetVolume, duration);

      // Wait for both fades to complete
      const [fadeOutResult, fadeInResult] = await Promise.all([fadeOutPromise, fadeInPromise]);

      if (fadeOutResult.success && fadeInResult.success) {
        return {
          success: true,
          data: true,
          message: 'Crossfade completed successfully'
        };
      }

      return {
        success: false,
        data: false,
        error: 'One or both fades failed',
        message: 'Crossfade partially completed'
      };

    } catch (error) {
      return {
        success: false,
        data: false,
        error: error instanceof Error ? error.message : 'Unknown crossfade error',
        message: 'Failed to perform crossfade'
      };
    }
  }

  /**
   * Set custom loop points for a sound
   */
  public setCustomLoopPoints(soundId: string, startTime: number, endTime: number): AudioOperationResult<boolean> {
    try {
      const source = this.activeSources.get(soundId);
      if (!source) {
        return {
          success: false,
          data: false,
          error: 'Sound not in mix',
          message: 'Sound must be in active mix to set loop points'
        };
      }

      // Validate loop points
      if (startTime < 0 || endTime <= startTime) {
        return {
          success: false,
          data: false,
          error: 'Invalid loop points',
          message: 'End time must be greater than start time and both must be positive'
        };
      }

      if (source.soundFile.duration && endTime > source.soundFile.duration) {
        return {
          success: false,
          data: false,
          error: 'Loop end exceeds sound duration',
          message: 'Loop end time cannot exceed sound duration'
        };
      }

      // Set custom loop points
      this.customLoopPoints.set(soundId, {
        soundId,
        startTime,
        endTime,
        enabled: true
      });

      return {
        success: true,
        data: true,
        message: 'Custom loop points set successfully'
      };

    } catch (error) {
      return {
        success: false,
        data: false,
        error: error instanceof Error ? error.message : 'Unknown loop error',
        message: 'Failed to set custom loop points'
      };
    }
  }

  /**
   * Update volume for a specific source
   */
  private async updateSourceVolume(soundId: string, volume: number): Promise<void> {
    const source = this.activeSources.get(soundId);
    if (source) {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      source.volume = clampedVolume;
      await source.audioObject.setVolumeAsync(clampedVolume);
    }
  }

  /**
   * Fade source volume over time
   */
  private async fadeSourceVolume(soundId: string, targetVolume: number, duration: number): Promise<AudioOperationResult<boolean>> {
    return new Promise((resolve) => {
      const source = this.activeSources.get(soundId);
      if (!source) {
        resolve({
          success: false,
          data: false,
          error: 'Source not found',
          message: 'Audio source not found for fading'
        });
        return;
      }

      const startVolume = source.volume;
      const volumeChange = targetVolume - startVolume;
      const startTime = Date.now();
      
      source.isFading = true;
      source.fadeStartTime = startTime;
      source.fadeDuration = duration;
      source.targetVolume = targetVolume;

      const fadeStep = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Apply easing curve (ease-in-out)
        const easedProgress = progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
        const currentVolume = startVolume + (volumeChange * easedProgress);
        
        source.volume = currentVolume;
        source.audioObject.setVolumeAsync(currentVolume).catch((error) => {
          console.warn('Volume fade error:', error);
        });

        if (progress >= 1) {
          source.isFading = false;
          source.volume = targetVolume;
          resolve({
            success: true,
            data: true,
            message: 'Volume fade completed'
          });
        } else {
          setTimeout(fadeStep, this.mixingConfig.updateInterval);
        }
      };

      fadeStep();
    });
  }

  /**
   * Calculate total volume across all sources
   */
  private calculateTotalVolume(): number {
    let totalVolume = 0;
    for (const source of this.activeSources.values()) {
      totalVolume += source.volume;
    }
    return Math.min(totalVolume, 1.0); // Cap at 1.0
  }

  /**
   * Start real-time mixing loop for smooth transitions
   */
  private startMixingLoop(): void {
    if (this.mixingTimer) {
      clearInterval(this.mixingTimer);
    }

    this.mixingTimer = setInterval(async () => {
      try {
        await this.processMixingUpdate();
      } catch (error) {
        console.warn('Mixing loop error:', error);
      }
    }, this.mixingConfig.updateInterval);
  }

  /**
   * Process mixing updates for smooth transitions
   */
  private async processMixingUpdate(): Promise<void> {
    for (const [soundId, source] of this.activeSources.entries()) {
      try {
        // Check custom loop points
        const customLoop = this.customLoopPoints.get(soundId);
        if (customLoop && customLoop.enabled && source.isPlaying) {
          const status = await source.audioObject.getStatusAsync();
          if (status.isLoaded && status.positionMillis) {
            const currentTime = status.positionMillis / 1000;
            
            if (currentTime >= customLoop.endTime) {
              // Loop back to start time
              await source.audioObject.setPositionAsync(customLoop.startTime * 1000);
              source.loopCount++;
            }
          }
        }

        // Handle any pending volume adjustments
        if (source.isFading) {
          // Fading is handled in the fadeSourceVolume method
          continue;
        }

      } catch (error) {
        console.warn(`Mixing update error for sound ${soundId}:`, error);
      }
    }
  }

  /**
   * Get current mixing state
   */
  public getMixingState(): {
    activeSources: number;
    totalVolume: number;
    isPlaying: boolean;
    configuration: MixingConfiguration;
  } {
    const playingSources = Array.from(this.activeSources.values()).filter(s => s.isPlaying);
    
    return {
      activeSources: this.activeSources.size,
      totalVolume: this.calculateTotalVolume(),
      isPlaying: playingSources.length > 0,
      configuration: { ...this.mixingConfig }
    };
  }

  /**
   * Get custom loop points for a sound
   */
  public getCustomLoopPoints(soundId: string): CustomLoopPoint | null {
    return this.customLoopPoints.get(soundId) || null;
  }

  /**
   * Clean up resources and stop all audio
   */
  public async cleanup(): Promise<void> {
    try {
      // Stop mixing loop
      if (this.mixingTimer) {
        clearInterval(this.mixingTimer);
        this.mixingTimer = null;
      }

      // Stop and clean up all audio sources
      const cleanupPromises = Array.from(this.activeSources.keys()).map(soundId =>
        this.removeSoundFromMix(soundId, false)
      );
      await Promise.all(cleanupPromises);

      // Clear custom loop points
      this.customLoopPoints.clear();

      AudioMixingEngine.initialized = false;
      AudioMixingEngine.instance = null;

    } catch (error) {
      console.warn('Audio mixing engine cleanup error:', error);
    }
  }
}

// Export singleton instance getter
export const getAudioMixingEngine = () => AudioMixingEngine.getInstance();

export default AudioMixingEngine;