/**
 * Sound Library Manager - Comprehensive white noise sound library with categorization and premium management
 * 
 * Manages the complete sound library including:
 * - Sound categorization and metadata management
 * - Premium content access control and RevenueCat integration
 * - Local caching and download management
 * - Sound quality optimization and compression
 * - User favorites and personalization
 * - Discovery and recommendation system
 * - Offline-first functionality with sync capabilities
 * 
 * @author Alarm & White Noise App Development Team
 * @version 1.0.0
 */

import { Audio, AVPlaybackSource } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { 
  SoundFile,
  SoundCategory,
  SoundLibraryState,
  SoundDownloadProgress,
  SoundCacheManager,
  PremiumContentManager,
  SoundRecommendation,
  UserSoundPreferences,
  SoundLibraryConfiguration,
  AudioOperationResult,
  SoundQualityLevel,
  SoundDiscoveryFilter,
  SoundMetadata,
  SoundPackage,
  LocalizationData,
  SoundAnalytics,
  SoundLibraryUpdateResult,
  OfflineSoundPackage,
  SoundCompressionSettings,
  SoundLibraryError
} from '../types/audio.js';

/**
 * Sound Library Management Service
 * Handles comprehensive sound library operations with premium content management
 */
export class SoundLibraryManager {
  private static instance: SoundLibraryManager | null = null;
  private static initialized = false;

  private state: SoundLibraryState;
  private soundCache: Map<string, SoundFile> = new Map();
  private downloadQueue: Map<string, SoundDownloadProgress> = new Map();
  private userPreferences: UserSoundPreferences;
  private cacheManager: SoundCacheManager;
  private premiumManager: PremiumContentManager;
  
  private readonly CACHE_DIR = `${FileSystem.documentDirectory}sounds/`;
  private readonly METADATA_CACHE_KEY = '@sound_library_metadata';
  private readonly USER_PREFERENCES_KEY = '@user_sound_preferences';
  private readonly MAX_CACHE_SIZE_MB = 500; // 500MB cache limit
  private readonly DEFAULT_QUALITY: SoundQualityLevel = 'medium';

  private constructor() {
    this.state = {
      isInitialized: false,
      totalSounds: 0,
      categoriesLoaded: false,
      premiumSoundsAvailable: 0,
      freeSoundsAvailable: 0,
      cachedSounds: 0,
      cacheUsageMB: 0,
      lastLibraryUpdate: 0,
      isUpdating: false,
      offlineMode: false,
      currentQualityLevel: this.DEFAULT_QUALITY
    };

    this.userPreferences = {
      favoriteCategories: [],
      favoriteSounds: [],
      recentlyPlayed: [],
      preferredQuality: this.DEFAULT_QUALITY,
      autoDownloadFavorites: true,
      offlineModeEnabled: false,
      customCategories: [],
      playbackHistory: [],
      recommendationsEnabled: true,
      localization: 'en'
    };

    this.cacheManager = {
      maxCacheSizeMB: this.MAX_CACHE_SIZE_MB,
      currentCacheSizeMB: 0,
      cleanupThreshold: 0.85,
      retentionPolicy: 'lru', // Least Recently Used
      compressionEnabled: true,
      prefetchEnabled: true
    };

    this.premiumManager = {
      isSubscriptionActive: false,
      subscriptionType: 'free',
      premiumSoundsUnlocked: 0,
      trialPeriodActive: false,
      lastSubscriptionCheck: 0,
      subscriptionExpiresAt: 0,
      gracePeriodActive: false
    };
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): SoundLibraryManager {
    if (!SoundLibraryManager.instance) {
      SoundLibraryManager.instance = new SoundLibraryManager();
    }
    return SoundLibraryManager.instance;
  }

  /**
   * Initialize sound library with configuration
   */
  public static async initialize(config?: SoundLibraryConfiguration): Promise<AudioOperationResult<boolean>> {
    try {
      const instance = SoundLibraryManager.getInstance();

      if (SoundLibraryManager.initialized) {
        return {
          success: true,
          data: true,
          message: 'Sound library already initialized'
        };
      }

      // Load user preferences
      await instance.loadUserPreferences();

      // Initialize cache directory
      await instance.initializeCacheDirectory();

      // Load cached metadata
      await instance.loadCachedMetadata();

      // Initialize premium content manager
      await instance.initializePremiumManager(config?.subscriptionActive);

      // Update library if needed
      if (config?.forceUpdate || instance.shouldUpdateLibrary()) {
        await instance.updateSoundLibrary();
      }

      // Load sound categories
      await instance.loadSoundCategories();

      instance.state.isInitialized = true;
      SoundLibraryManager.initialized = true;

      return {
        success: true,
        data: true,
        message: 'Sound library initialized successfully'
      };

    } catch (error) {
      return {
        success: false,
        data: false,
        error: error instanceof Error ? error.message : 'Unknown initialization error',
        message: 'Failed to initialize sound library'
      };
    }
  }

  /**
   * Load user preferences from storage
   */
  private async loadUserPreferences(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.USER_PREFERENCES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.userPreferences = { ...this.userPreferences, ...parsed };
        this.state.currentQualityLevel = this.userPreferences.preferredQuality;
        this.state.offlineMode = this.userPreferences.offlineModeEnabled;
      }
    } catch (error) {
      console.warn('Failed to load user preferences:', error);
      // Continue with defaults
    }
  }

  /**
   * Save user preferences to storage
   */
  private async saveUserPreferences(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.USER_PREFERENCES_KEY,
        JSON.stringify(this.userPreferences)
      );
    } catch (error) {
      console.warn('Failed to save user preferences:', error);
    }
  }

  /**
   * Initialize cache directory
   */
  private async initializeCacheDirectory(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.CACHE_DIR, { intermediates: true });
      }

      // Calculate current cache usage
      await this.calculateCacheUsage();

    } catch (error) {
      console.warn('Failed to initialize cache directory:', error);
      throw new SoundLibraryError('Cache directory initialization failed', 'CACHE_INIT_ERROR');
    }
  }

  /**
   * Calculate current cache usage
   */
  private async calculateCacheUsage(): Promise<void> {
    try {
      const files = await FileSystem.readDirectoryAsync(this.CACHE_DIR);
      let totalSize = 0;
      let fileCount = 0;

      for (const file of files) {
        const filePath = `${this.CACHE_DIR}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists && !fileInfo.isDirectory) {
          totalSize += fileInfo.size || 0;
          fileCount++;
        }
      }

      this.state.cacheUsageMB = Math.round((totalSize / (1024 * 1024)) * 100) / 100;
      this.state.cachedSounds = fileCount;
      this.cacheManager.currentCacheSizeMB = this.state.cacheUsageMB;

    } catch (error) {
      console.warn('Failed to calculate cache usage:', error);
    }
  }

  /**
   * Load cached metadata
   */
  private async loadCachedMetadata(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.METADATA_CACHE_KEY);
      if (cached) {
        const metadata = JSON.parse(cached);
        
        // Populate sound cache with metadata
        if (metadata.sounds) {
          metadata.sounds.forEach((sound: SoundFile) => {
            this.soundCache.set(sound.id, sound);
          });
        }

        this.state.totalSounds = this.soundCache.size;
        this.state.lastLibraryUpdate = metadata.lastUpdate || 0;
      }

    } catch (error) {
      console.warn('Failed to load cached metadata:', error);
    }
  }

  /**
   * Initialize premium content manager
   */
  private async initializePremiumManager(subscriptionActive?: boolean): Promise<void> {
    try {
      if (subscriptionActive !== undefined) {
        this.premiumManager.isSubscriptionActive = subscriptionActive;
        this.premiumManager.subscriptionType = subscriptionActive ? 'premium' : 'free';
      }

      // In a real implementation, this would check with RevenueCat
      this.premiumManager.lastSubscriptionCheck = Date.now();

      // Count premium sounds based on cache
      let premiumCount = 0;
      let freeCount = 0;

      this.soundCache.forEach(sound => {
        if (sound.isPremium) {
          premiumCount++;
        } else {
          freeCount++;
        }
      });

      this.state.premiumSoundsAvailable = premiumCount;
      this.state.freeSoundsAvailable = freeCount;
      this.premiumManager.premiumSoundsUnlocked = this.premiumManager.isSubscriptionActive ? premiumCount : 0;

    } catch (error) {
      console.warn('Failed to initialize premium manager:', error);
    }
  }

  /**
   * Check if library should be updated
   */
  private shouldUpdateLibrary(): boolean {
    const ONE_DAY = 24 * 60 * 60 * 1000; // 1 day in milliseconds
    const timeSinceUpdate = Date.now() - this.state.lastLibraryUpdate;
    return timeSinceUpdate > ONE_DAY || this.state.totalSounds === 0;
  }

  /**
   * Update sound library from server
   */
  private async updateSoundLibrary(): Promise<SoundLibraryUpdateResult> {
    try {
      this.state.isUpdating = true;

      // In a real implementation, this would fetch from Supabase
      const mockLibraryData = await this.fetchLibraryData();
      
      // Process and cache the library data
      await this.processSoundLibraryData(mockLibraryData);

      this.state.lastLibraryUpdate = Date.now();
      this.state.isUpdating = false;

      // Save metadata to cache
      await this.saveCachedMetadata();

      return {
        success: true,
        soundsAdded: mockLibraryData.sounds.length,
        soundsUpdated: 0,
        soundsRemoved: 0,
        message: 'Sound library updated successfully'
      };

    } catch (error) {
      this.state.isUpdating = false;
      return {
        success: false,
        soundsAdded: 0,
        soundsUpdated: 0,
        soundsRemoved: 0,
        message: 'Failed to update sound library',
        error: error instanceof Error ? error.message : 'Unknown update error'
      };
    }
  }

  /**
   * Fetch library data (mock implementation)
   */
  private async fetchLibraryData(): Promise<{ sounds: SoundFile[], categories: SoundCategory[] }> {
    // Mock data - in a real implementation, this would be a Supabase query
    return {
      sounds: [
        {
          id: 'rain-gentle',
          name: 'Gentle Rain',
          category: 'nature',
          subcategory: 'rain',
          description: 'Soft, gentle rain sounds for relaxation',
          duration: 3600, // 1 hour
          fileUrl: 'https://example.com/sounds/rain-gentle.mp3',
          localPath: null,
          fileSize: 8500000, // ~8.5MB
          quality: 'high',
          sampleRate: 44100,
          bitrate: 192,
          format: 'mp3',
          isPremium: false,
          isDownloaded: false,
          downloadProgress: 0,
          metadata: {
            artist: 'Nature Sounds Studio',
            album: 'Rain Collection',
            tags: ['rain', 'gentle', 'relaxing', 'sleep'],
            bpm: null,
            key: null,
            mood: 'calm',
            energy: 'low',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            version: '1.0'
          },
          analytics: {
            playCount: 0,
            favoriteCount: 0,
            downloadCount: 0,
            averageRating: 4.8,
            lastPlayedAt: null
          },
          localization: {
            'en': { name: 'Gentle Rain', description: 'Soft, gentle rain sounds for relaxation' },
            'es': { name: 'Lluvia Suave', description: 'Sonidos suaves y gentiles de lluvia para relajación' },
            'fr': { name: 'Pluie Douce', description: 'Sons de pluie douce et apaisante pour la relaxation' }
          }
        },
        {
          id: 'ocean-waves',
          name: 'Ocean Waves',
          category: 'nature',
          subcategory: 'water',
          description: 'Rhythmic ocean waves for deep sleep',
          duration: 3600,
          fileUrl: 'https://example.com/sounds/ocean-waves.mp3',
          localPath: null,
          fileSize: 9200000, // ~9.2MB
          quality: 'high',
          sampleRate: 44100,
          bitrate: 192,
          format: 'mp3',
          isPremium: false,
          isDownloaded: false,
          downloadProgress: 0,
          metadata: {
            artist: 'Ocean Sounds Co.',
            album: 'Coastal Collection',
            tags: ['ocean', 'waves', 'beach', 'sleep', 'meditation'],
            bpm: null,
            key: null,
            mood: 'peaceful',
            energy: 'low',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            version: '1.0'
          },
          analytics: {
            playCount: 0,
            favoriteCount: 0,
            downloadCount: 0,
            averageRating: 4.9,
            lastPlayedAt: null
          },
          localization: {
            'en': { name: 'Ocean Waves', description: 'Rhythmic ocean waves for deep sleep' },
            'es': { name: 'Olas del Océano', description: 'Olas rítmicas del océano para un sueño profundo' },
            'fr': { name: 'Vagues Océaniques', description: 'Vagues océaniques rythmées pour un sommeil profond' }
          }
        },
        {
          id: 'forest-ambience-premium',
          name: 'Deep Forest Ambience',
          category: 'nature',
          subcategory: 'forest',
          description: 'Premium forest sounds with bird calls and wind',
          duration: 7200, // 2 hours
          fileUrl: 'https://example.com/sounds/forest-premium.mp3',
          localPath: null,
          fileSize: 18400000, // ~18.4MB
          quality: 'ultra',
          sampleRate: 48000,
          bitrate: 320,
          format: 'mp3',
          isPremium: true,
          isDownloaded: false,
          downloadProgress: 0,
          metadata: {
            artist: 'Premium Nature Audio',
            album: 'Forest Sanctuary',
            tags: ['forest', 'birds', 'wind', 'premium', 'meditation', 'focus'],
            bpm: null,
            key: null,
            mood: 'serene',
            energy: 'medium-low',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            version: '1.0'
          },
          analytics: {
            playCount: 0,
            favoriteCount: 0,
            downloadCount: 0,
            averageRating: 4.95,
            lastPlayedAt: null
          },
          localization: {
            'en': { name: 'Deep Forest Ambience', description: 'Premium forest sounds with bird calls and wind' },
            'es': { name: 'Ambiente de Bosque Profundo', description: 'Sonidos premium del bosque con cantos de pájaros y viento' },
            'fr': { name: 'Ambiance Forêt Profonde', description: 'Sons premium de forêt avec chants d\'oiseaux et vent' }
          }
        },
        {
          id: 'white-noise-classic',
          name: 'Classic White Noise',
          category: 'artificial',
          subcategory: 'white-noise',
          description: 'Pure white noise for blocking distractions',
          duration: 3600,
          fileUrl: 'https://example.com/sounds/white-noise.mp3',
          localPath: null,
          fileSize: 7200000, // ~7.2MB
          quality: 'medium',
          sampleRate: 44100,
          bitrate: 160,
          format: 'mp3',
          isPremium: false,
          isDownloaded: false,
          downloadProgress: 0,
          metadata: {
            artist: 'Audio Tech Solutions',
            album: 'Noise Masking Collection',
            tags: ['white-noise', 'focus', 'concentration', 'masking'],
            bpm: null,
            key: null,
            mood: 'neutral',
            energy: 'constant',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            version: '1.0'
          },
          analytics: {
            playCount: 0,
            favoriteCount: 0,
            downloadCount: 0,
            averageRating: 4.6,
            lastPlayedAt: null
          },
          localization: {
            'en': { name: 'Classic White Noise', description: 'Pure white noise for blocking distractions' },
            'es': { name: 'Ruido Blanco Clásico', description: 'Ruido blanco puro para bloquear distracciones' },
            'fr': { name: 'Bruit Blanc Classique', description: 'Bruit blanc pur pour bloquer les distractions' }
          }
        }
      ],
      categories: [
        {
          id: 'nature',
          name: 'Nature',
          description: 'Natural sounds for relaxation and sleep',
          iconName: 'leaf',
          colorCode: '#4CAF50',
          soundCount: 3,
          isPremium: false,
          subcategories: [
            { id: 'rain', name: 'Rain', soundCount: 1 },
            { id: 'water', name: 'Water', soundCount: 1 },
            { id: 'forest', name: 'Forest', soundCount: 1 }
          ],
          localization: {
            'en': { name: 'Nature', description: 'Natural sounds for relaxation and sleep' },
            'es': { name: 'Naturaleza', description: 'Sonidos naturales para relajación y sueño' },
            'fr': { name: 'Nature', description: 'Sons naturels pour la relaxation et le sommeil' }
          }
        },
        {
          id: 'artificial',
          name: 'Artificial',
          description: 'Engineered sounds for focus and concentration',
          iconName: 'settings',
          colorCode: '#2196F3',
          soundCount: 1,
          isPremium: false,
          subcategories: [
            { id: 'white-noise', name: 'White Noise', soundCount: 1 },
            { id: 'pink-noise', name: 'Pink Noise', soundCount: 0 },
            { id: 'brown-noise', name: 'Brown Noise', soundCount: 0 }
          ],
          localization: {
            'en': { name: 'Artificial', description: 'Engineered sounds for focus and concentration' },
            'es': { name: 'Artificial', description: 'Sonidos diseñados para concentración y enfoque' },
            'fr': { name: 'Artificiel', description: 'Sons conçus pour la concentration et le focus' }
          }
        }
      ]
    };
  }

  /**
   * Process sound library data
   */
  private async processSoundLibraryData(data: { sounds: SoundFile[], categories: SoundCategory[] }): Promise<void> {
    // Clear existing cache
    this.soundCache.clear();

    // Process sounds
    data.sounds.forEach(sound => {
      this.soundCache.set(sound.id, sound);
    });

    // Update state
    this.state.totalSounds = this.soundCache.size;

    // Count premium vs free sounds
    let premiumCount = 0;
    let freeCount = 0;

    this.soundCache.forEach(sound => {
      if (sound.isPremium) {
        premiumCount++;
      } else {
        freeCount++;
      }
    });

    this.state.premiumSoundsAvailable = premiumCount;
    this.state.freeSoundsAvailable = freeCount;
  }

  /**
   * Save cached metadata
   */
  private async saveCachedMetadata(): Promise<void> {
    try {
      const metadata = {
        sounds: Array.from(this.soundCache.values()),
        lastUpdate: this.state.lastLibraryUpdate
      };

      await AsyncStorage.setItem(
        this.METADATA_CACHE_KEY,
        JSON.stringify(metadata)
      );

    } catch (error) {
      console.warn('Failed to save cached metadata:', error);
    }
  }

  /**
   * Load sound categories
   */
  private async loadSoundCategories(): Promise<void> {
    try {
      // Categories are loaded as part of the library data
      this.state.categoriesLoaded = true;
    } catch (error) {
      console.warn('Failed to load sound categories:', error);
    }
  }

  /**
   * Get all available sounds with filtering
   */
  public getSounds(filter?: SoundDiscoveryFilter): SoundFile[] {
    let sounds = Array.from(this.soundCache.values());

    if (!filter) {
      return sounds;
    }

    // Apply category filter
    if (filter.categories && filter.categories.length > 0) {
      sounds = sounds.filter(sound => filter.categories!.includes(sound.category));
    }

    // Apply premium filter
    if (filter.premiumOnly !== undefined) {
      sounds = sounds.filter(sound => {
        if (filter.premiumOnly) {
          return sound.isPremium && this.premiumManager.isSubscriptionActive;
        }
        return !sound.isPremium || this.premiumManager.isSubscriptionActive;
      });
    }

    // Apply quality filter
    if (filter.minQuality) {
      const qualityOrder = { 'low': 1, 'medium': 2, 'high': 3, 'ultra': 4 };
      const minQualityScore = qualityOrder[filter.minQuality];
      sounds = sounds.filter(sound => {
        const soundQualityScore = qualityOrder[sound.quality];
        return soundQualityScore >= minQualityScore;
      });
    }

    // Apply search query
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      sounds = sounds.filter(sound =>
        sound.name.toLowerCase().includes(query) ||
        sound.description.toLowerCase().includes(query) ||
        sound.metadata.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    if (filter.sortBy) {
      sounds.sort((a, b) => {
        switch (filter.sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'popularity':
            return (b.analytics.playCount || 0) - (a.analytics.playCount || 0);
          case 'rating':
            return (b.analytics.averageRating || 0) - (a.analytics.averageRating || 0);
          case 'duration':
            return b.duration - a.duration;
          case 'recent':
            return (b.analytics.lastPlayedAt || 0) - (a.analytics.lastPlayedAt || 0);
          default:
            return 0;
        }
      });
    }

    // Apply limit
    if (filter.limit && filter.limit > 0) {
      sounds = sounds.slice(0, filter.limit);
    }

    return sounds;
  }

  /**
   * Get sound by ID
   */
  public getSound(soundId: string): SoundFile | null {
    return this.soundCache.get(soundId) || null;
  }

  /**
   * Get sounds by category
   */
  public getSoundsByCategory(categoryId: string, subcategory?: string): SoundFile[] {
    let sounds = Array.from(this.soundCache.values()).filter(
      sound => sound.category === categoryId
    );

    if (subcategory) {
      sounds = sounds.filter(sound => sound.subcategory === subcategory);
    }

    return sounds;
  }

  /**
   * Get user's favorite sounds
   */
  public getFavoriteSounds(): SoundFile[] {
    return this.userPreferences.favoriteSounds
      .map(soundId => this.soundCache.get(soundId))
      .filter(sound => sound !== undefined) as SoundFile[];
  }

  /**
   * Add sound to favorites
   */
  public async addToFavorites(soundId: string): Promise<AudioOperationResult<boolean>> {
    try {
      if (!this.soundCache.has(soundId)) {
        return {
          success: false,
          data: false,
          error: 'Sound not found',
          message: 'Cannot add non-existent sound to favorites'
        };
      }

      if (!this.userPreferences.favoriteSounds.includes(soundId)) {
        this.userPreferences.favoriteSounds.push(soundId);
        await this.saveUserPreferences();

        // Auto-download if enabled
        if (this.userPreferences.autoDownloadFavorites) {
          this.downloadSound(soundId, this.userPreferences.preferredQuality);
        }
      }

      return {
        success: true,
        data: true,
        message: 'Sound added to favorites'
      };

    } catch (error) {
      return {
        success: false,
        data: false,
        error: error instanceof Error ? error.message : 'Unknown favorite error',
        message: 'Failed to add sound to favorites'
      };
    }
  }

  /**
   * Remove sound from favorites
   */
  public async removeFromFavorites(soundId: string): Promise<AudioOperationResult<boolean>> {
    try {
      const index = this.userPreferences.favoriteSounds.indexOf(soundId);
      if (index > -1) {
        this.userPreferences.favoriteSounds.splice(index, 1);
        await this.saveUserPreferences();
      }

      return {
        success: true,
        data: true,
        message: 'Sound removed from favorites'
      };

    } catch (error) {
      return {
        success: false,
        data: false,
        error: error instanceof Error ? error.message : 'Unknown favorite error',
        message: 'Failed to remove sound from favorites'
      };
    }
  }

  /**
   * Download sound for offline playback
   */
  public async downloadSound(soundId: string, quality?: SoundQualityLevel): Promise<AudioOperationResult<string>> {
    try {
      const sound = this.soundCache.get(soundId);
      if (!sound) {
        return {
          success: false,
          data: '',
          error: 'Sound not found',
          message: 'Cannot download non-existent sound'
        };
      }

      // Check premium access
      if (sound.isPremium && !this.premiumManager.isSubscriptionActive) {
        return {
          success: false,
          data: '',
          error: 'Premium subscription required',
          message: 'This sound requires an active subscription'
        };
      }

      // Check if already downloaded
      if (sound.isDownloaded && sound.localPath) {
        return {
          success: true,
          data: sound.localPath,
          message: 'Sound already downloaded'
        };
      }

      // Check if download is in progress
      if (this.downloadQueue.has(soundId)) {
        return {
          success: false,
          data: '',
          error: 'Download in progress',
          message: 'Sound is already being downloaded'
        };
      }

      // Start download
      const downloadResult = await this.performSoundDownload(sound, quality);
      return downloadResult;

    } catch (error) {
      return {
        success: false,
        data: '',
        error: error instanceof Error ? error.message : 'Unknown download error',
        message: 'Failed to download sound'
      };
    }
  }

  /**
   * Perform actual sound download
   */
  private async performSoundDownload(sound: SoundFile, quality?: SoundQualityLevel): Promise<AudioOperationResult<string>> {
    const targetQuality = quality || this.userPreferences.preferredQuality;
    const fileName = `${sound.id}_${targetQuality}.${sound.format}`;
    const localPath = `${this.CACHE_DIR}${fileName}`;

    try {
      // Initialize download progress
      const downloadProgress: SoundDownloadProgress = {
        soundId: sound.id,
        progress: 0,
        bytesDownloaded: 0,
        totalBytes: sound.fileSize,
        isComplete: false,
        error: null,
        startedAt: Date.now(),
        estimatedTimeRemaining: 0
      };

      this.downloadQueue.set(sound.id, downloadProgress);

      // Perform download with progress tracking
      const downloadResumable = FileSystem.createDownloadResumable(
        sound.fileUrl,
        localPath,
        {},
        (downloadProgressUpdate) => {
          const progress = downloadProgressUpdate.totalBytesWritten / downloadProgressUpdate.totalBytesExpectedToWrite;
          downloadProgress.progress = Math.round(progress * 100);
          downloadProgress.bytesDownloaded = downloadProgressUpdate.totalBytesWritten;
          
          // Update estimated time remaining
          const elapsed = Date.now() - downloadProgress.startedAt;
          if (progress > 0) {
            const totalEstimated = elapsed / progress;
            downloadProgress.estimatedTimeRemaining = totalEstimated - elapsed;
          }
        }
      );

      const downloadResult = await downloadResumable.downloadAsync();
      
      if (downloadResult && downloadResult.uri) {
        // Download successful
        downloadProgress.isComplete = true;
        downloadProgress.progress = 100;

        // Update sound metadata
        sound.isDownloaded = true;
        sound.localPath = downloadResult.uri;
        sound.downloadProgress = 100;

        // Update cache
        this.soundCache.set(sound.id, sound);

        // Update cache usage
        await this.calculateCacheUsage();

        // Clean up download queue
        this.downloadQueue.delete(sound.id);

        // Save metadata
        await this.saveCachedMetadata();

        return {
          success: true,
          data: downloadResult.uri,
          message: 'Sound downloaded successfully'
        };

      } else {
        throw new Error('Download failed - no file received');
      }

    } catch (error) {
      // Clean up failed download
      this.downloadQueue.delete(sound.id);

      // Try to remove partial file
      try {
        const fileInfo = await FileSystem.getInfoAsync(localPath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(localPath);
        }
      } catch (cleanupError) {
        console.warn('Failed to clean up partial download:', cleanupError);
      }

      return {
        success: false,
        data: '',
        error: error instanceof Error ? error.message : 'Unknown download error',
        message: 'Failed to download sound'
      };
    }
  }

  /**
   * Get download progress for a sound
   */
  public getDownloadProgress(soundId: string): SoundDownloadProgress | null {
    return this.downloadQueue.get(soundId) || null;
  }

  /**
   * Cancel sound download
   */
  public async cancelDownload(soundId: string): Promise<AudioOperationResult<boolean>> {
    try {
      const downloadProgress = this.downloadQueue.get(soundId);
      if (!downloadProgress) {
        return {
          success: false,
          data: false,
          error: 'No download in progress',
          message: 'No active download found for this sound'
        };
      }

      // Remove from download queue
      this.downloadQueue.delete(soundId);

      // Try to remove partial file
      const sound = this.soundCache.get(soundId);
      if (sound) {
        const fileName = `${sound.id}_${this.userPreferences.preferredQuality}.${sound.format}`;
        const localPath = `${this.CACHE_DIR}${fileName}`;

        try {
          const fileInfo = await FileSystem.getInfoAsync(localPath);
          if (fileInfo.exists) {
            await FileSystem.deleteAsync(localPath);
          }
        } catch (cleanupError) {
          console.warn('Failed to clean up cancelled download:', cleanupError);
        }
      }

      return {
        success: true,
        data: true,
        message: 'Download cancelled successfully'
      };

    } catch (error) {
      return {
        success: false,
        data: false,
        error: error instanceof Error ? error.message : 'Unknown cancellation error',
        message: 'Failed to cancel download'
      };
    }
  }

  /**
   * Delete downloaded sound to free up space
   */
  public async deleteDownloadedSound(soundId: string): Promise<AudioOperationResult<boolean>> {
    try {
      const sound = this.soundCache.get(soundId);
      if (!sound || !sound.isDownloaded || !sound.localPath) {
        return {
          success: false,
          data: false,
          error: 'Sound not downloaded',
          message: 'Cannot delete sound that is not downloaded'
        };
      }

      // Delete the file
      const fileInfo = await FileSystem.getInfoAsync(sound.localPath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(sound.localPath);
      }

      // Update sound metadata
      sound.isDownloaded = false;
      sound.localPath = null;
      sound.downloadProgress = 0;

      // Update cache
      this.soundCache.set(soundId, sound);

      // Update cache usage
      await this.calculateCacheUsage();

      // Save metadata
      await this.saveCachedMetadata();

      return {
        success: true,
        data: true,
        message: 'Downloaded sound deleted successfully'
      };

    } catch (error) {
      return {
        success: false,
        data: false,
        error: error instanceof Error ? error.message : 'Unknown deletion error',
        message: 'Failed to delete downloaded sound'
      };
    }
  }

  /**
   * Clean up cache based on retention policy
   */
  public async cleanupCache(forceCleanup?: boolean): Promise<AudioOperationResult<{ freedSpaceMB: number, filesDeleted: number }>> {
    try {
      const shouldCleanup = forceCleanup || 
        (this.cacheManager.currentCacheSizeMB / this.cacheManager.maxCacheSizeMB) > this.cacheManager.cleanupThreshold;

      if (!shouldCleanup) {
        return {
          success: true,
          data: { freedSpaceMB: 0, filesDeleted: 0 },
          message: 'No cleanup needed'
        };
      }

      let freedSpace = 0;
      let filesDeleted = 0;

      // Get sounds sorted by last access time (LRU policy)
      const downloadedSounds = Array.from(this.soundCache.values())
        .filter(sound => sound.isDownloaded && sound.localPath)
        .sort((a, b) => (a.analytics.lastPlayedAt || 0) - (b.analytics.lastPlayedAt || 0));

      // Don't delete favorites if auto-download is enabled
      const soundsToDelete = downloadedSounds.filter(sound => {
        if (this.userPreferences.autoDownloadFavorites && this.userPreferences.favoriteSounds.includes(sound.id)) {
          return false;
        }
        return true;
      });

      // Delete oldest sounds until we're under threshold
      for (const sound of soundsToDelete) {
        if ((this.cacheManager.currentCacheSizeMB / this.cacheManager.maxCacheSizeMB) <= 0.7) {
          break; // Stop when we're under 70% usage
        }

        const deleteResult = await this.deleteDownloadedSound(sound.id);
        if (deleteResult.success) {
          freedSpace += sound.fileSize / (1024 * 1024); // Convert to MB
          filesDeleted++;
        }
      }

      return {
        success: true,
        data: { freedSpaceMB: Math.round(freedSpace * 100) / 100, filesDeleted },
        message: `Cache cleanup completed: ${filesDeleted} files deleted, ${Math.round(freedSpace * 100) / 100}MB freed`
      };

    } catch (error) {
      return {
        success: false,
        data: { freedSpaceMB: 0, filesDeleted: 0 },
        error: error instanceof Error ? error.message : 'Unknown cleanup error',
        message: 'Failed to cleanup cache'
      };
    }
  }

  /**
   * Get sound recommendations based on user preferences
   */
  public getSoundRecommendations(limit: number = 10): SoundRecommendation[] {
    if (!this.userPreferences.recommendationsEnabled) {
      return [];
    }

    const recommendations: SoundRecommendation[] = [];
    const allSounds = Array.from(this.soundCache.values());

    // Recommend sounds from favorite categories
    if (this.userPreferences.favoriteCategories.length > 0) {
      const categoryRecommendations = allSounds
        .filter(sound => this.userPreferences.favoriteCategories.includes(sound.category))
        .filter(sound => !this.userPreferences.favoriteSounds.includes(sound.id))
        .sort((a, b) => (b.analytics.averageRating || 0) - (a.analytics.averageRating || 0))
        .slice(0, Math.ceil(limit * 0.6)) // 60% from favorite categories
        .map(sound => ({
          sound,
          reason: 'category_preference',
          confidence: 0.8,
          priority: 'high' as const
        }));

      recommendations.push(...categoryRecommendations);
    }

    // Recommend popular sounds
    const popularRecommendations = allSounds
      .filter(sound => !this.userPreferences.favoriteSounds.includes(sound.id))
      .filter(sound => !recommendations.some(r => r.sound.id === sound.id))
      .sort((a, b) => (b.analytics.playCount || 0) - (a.analytics.playCount || 0))
      .slice(0, Math.ceil(limit * 0.4)) // 40% popular sounds
      .map(sound => ({
        sound,
        reason: 'popularity',
        confidence: 0.6,
        priority: 'medium' as const
      }));

    recommendations.push(...popularRecommendations);

    return recommendations.slice(0, limit);
  }

  /**
   * Record sound play analytics
   */
  public async recordSoundPlay(soundId: string, sessionDuration?: number): Promise<void> {
    try {
      const sound = this.soundCache.get(soundId);
      if (!sound) return;

      // Update analytics
      sound.analytics.playCount = (sound.analytics.playCount || 0) + 1;
      sound.analytics.lastPlayedAt = Date.now();

      // Update user preferences
      const recentIndex = this.userPreferences.recentlyPlayed.indexOf(soundId);
      if (recentIndex > -1) {
        this.userPreferences.recentlyPlayed.splice(recentIndex, 1);
      }
      this.userPreferences.recentlyPlayed.unshift(soundId);

      // Keep only last 50 recently played
      if (this.userPreferences.recentlyPlayed.length > 50) {
        this.userPreferences.recentlyPlayed = this.userPreferences.recentlyPlayed.slice(0, 50);
      }

      // Add to playback history
      this.userPreferences.playbackHistory.push({
        soundId,
        playedAt: Date.now(),
        duration: sessionDuration || 0,
        quality: this.state.currentQualityLevel
      });

      // Keep only last 200 playback entries
      if (this.userPreferences.playbackHistory.length > 200) {
        this.userPreferences.playbackHistory = this.userPreferences.playbackHistory.slice(-200);
      }

      // Update cache
      this.soundCache.set(soundId, sound);

      // Save changes
      await this.saveUserPreferences();
      await this.saveCachedMetadata();

    } catch (error) {
      console.warn('Failed to record sound play analytics:', error);
    }
  }

  /**
   * Get current library state
   */
  public getState(): Readonly<SoundLibraryState> {
    return { ...this.state };
  }

  /**
   * Get user preferences
   */
  public getUserPreferences(): Readonly<UserSoundPreferences> {
    return { ...this.userPreferences };
  }

  /**
   * Update user preferences
   */
  public async updateUserPreferences(preferences: Partial<UserSoundPreferences>): Promise<AudioOperationResult<boolean>> {
    try {
      this.userPreferences = { ...this.userPreferences, ...preferences };

      // Update related state
      if (preferences.preferredQuality) {
        this.state.currentQualityLevel = preferences.preferredQuality;
      }

      if (preferences.offlineModeEnabled !== undefined) {
        this.state.offlineMode = preferences.offlineModeEnabled;
      }

      await this.saveUserPreferences();

      return {
        success: true,
        data: true,
        message: 'User preferences updated successfully'
      };

    } catch (error) {
      return {
        success: false,
        data: false,
        error: error instanceof Error ? error.message : 'Unknown preferences error',
        message: 'Failed to update user preferences'
      };
    }
  }

  /**
   * Check if sound requires premium subscription
   */
  public requiresPremium(soundId: string): boolean {
    const sound = this.soundCache.get(soundId);
    return sound ? sound.isPremium && !this.premiumManager.isSubscriptionActive : false;
  }

  /**
   * Update premium subscription status
   */
  public async updatePremiumStatus(isActive: boolean, subscriptionType?: 'free' | 'premium' | 'premium_plus'): Promise<void> {
    this.premiumManager.isSubscriptionActive = isActive;
    this.premiumManager.subscriptionType = subscriptionType || (isActive ? 'premium' : 'free');
    this.premiumManager.lastSubscriptionCheck = Date.now();

    if (isActive) {
      this.premiumManager.premiumSoundsUnlocked = this.state.premiumSoundsAvailable;
    } else {
      this.premiumManager.premiumSoundsUnlocked = 0;
    }
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    try {
      // Cancel any ongoing downloads
      const downloadPromises = Array.from(this.downloadQueue.keys()).map(soundId => 
        this.cancelDownload(soundId)
      );
      await Promise.all(downloadPromises);

      // Save final state
      await this.saveUserPreferences();
      await this.saveCachedMetadata();

      // Clear caches
      this.soundCache.clear();
      this.downloadQueue.clear();

      SoundLibraryManager.initialized = false;
      SoundLibraryManager.instance = null;

    } catch (error) {
      console.warn('Sound library cleanup error:', error);
    }
  }
}

// Export singleton instance getter
export const getSoundLibraryManager = () => SoundLibraryManager.getInstance();

export default SoundLibraryManager;