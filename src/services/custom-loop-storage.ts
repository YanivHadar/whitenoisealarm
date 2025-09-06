/**
 * Custom Loop Points Storage Service
 * 
 * Persistent storage and management for custom audio loop points.
 * Provides both local storage and cloud sync capabilities for
 * user-defined loop points across devices.
 * 
 * Features:
 * - Local AsyncStorage persistence
 * - Supabase cloud sync for premium users
 * - Offline-first operation with sync when online
 * - Version control for loop point changes
 * - Cross-device synchronization
 * 
 * @author Alarm & White Noise App Development Team
 * @version 1.0.0
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase/client';
import { subscriptionService } from './subscription-service';
import type { CustomLoopPoint } from '../services/audio-mixing-engine';
import type { AudioOperationResult } from '../types/audio';

/**
 * Stored loop point with metadata
 */
interface StoredLoopPoint extends CustomLoopPoint {
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  isSynced: boolean;
}

/**
 * Loop points storage configuration
 */
interface LoopStorageConfiguration {
  enableCloudSync: boolean;
  syncInterval: number;
  maxLocalStorage: number;
  compressionEnabled: boolean;
}

/**
 * Custom Loop Points Storage Service
 */
export class CustomLoopStorage {
  private static instance: CustomLoopStorage | null = null;
  private static initialized = false;

  private readonly STORAGE_KEY = '@custom_loop_points';
  private readonly SYNC_QUEUE_KEY = '@loop_points_sync_queue';
  private loopPointsCache: Map<string, StoredLoopPoint> = new Map();
  private syncQueue: string[] = [];
  private isOnline = true;
  private lastSyncTime = 0;

  private config: LoopStorageConfiguration = {
    enableCloudSync: true,
    syncInterval: 5 * 60 * 1000, // 5 minutes
    maxLocalStorage: 1000, // Maximum stored loop points
    compressionEnabled: true
  };

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): CustomLoopStorage {
    if (!CustomLoopStorage.instance) {
      CustomLoopStorage.instance = new CustomLoopStorage();
    }
    return CustomLoopStorage.instance;
  }

  /**
   * Initialize storage service
   */
  public static async initialize(config?: Partial<LoopStorageConfiguration>): Promise<AudioOperationResult<boolean>> {
    try {
      const instance = CustomLoopStorage.getInstance();

      if (CustomLoopStorage.initialized) {
        return {
          success: true,
          data: true,
          message: 'Custom loop storage already initialized'
        };
      }

      // Apply configuration
      if (config) {
        instance.config = { ...instance.config, ...config };
      }

      // Load cached loop points from local storage
      await instance.loadFromLocalStorage();

      // Load sync queue
      await instance.loadSyncQueue();

      // Set up periodic sync for premium users
      if (instance.config.enableCloudSync) {
        instance.setupPeriodicSync();
      }

      CustomLoopStorage.initialized = true;

      return {
        success: true,
        data: true,
        message: 'Custom loop storage initialized successfully'
      };

    } catch (error) {
      return {
        success: false,
        data: false,
        error: error instanceof Error ? error.message : 'Unknown initialization error',
        message: 'Failed to initialize custom loop storage'
      };
    }
  }

  /**
   * Store custom loop point
   */
  public async storeLoopPoint(loopPoint: CustomLoopPoint, userId: string): Promise<AudioOperationResult<boolean>> {
    try {
      const storedLoopPoint: StoredLoopPoint = {
        ...loopPoint,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        isSynced: false
      };

      // Check if loop point already exists
      const existingLoopPoint = this.loopPointsCache.get(loopPoint.soundId);
      if (existingLoopPoint) {
        storedLoopPoint.createdAt = existingLoopPoint.createdAt;
        storedLoopPoint.version = existingLoopPoint.version + 1;
      }

      // Store in cache
      this.loopPointsCache.set(loopPoint.soundId, storedLoopPoint);

      // Save to local storage
      await this.saveToLocalStorage();

      // Add to sync queue if cloud sync is enabled
      if (this.config.enableCloudSync && this.isOnline) {
        await this.addToSyncQueue(loopPoint.soundId);
      }

      return {
        success: true,
        data: true,
        message: 'Custom loop point stored successfully'
      };

    } catch (error) {
      return {
        success: false,
        data: false,
        error: error instanceof Error ? error.message : 'Unknown storage error',
        message: 'Failed to store custom loop point'
      };
    }
  }

  /**
   * Retrieve custom loop point
   */
  public async getLoopPoint(soundId: string): Promise<AudioOperationResult<CustomLoopPoint | null>> {
    try {
      const storedLoopPoint = this.loopPointsCache.get(soundId);
      
      if (!storedLoopPoint) {
        return {
          success: true,
          data: null,
          message: 'No custom loop point found for this sound'
        };
      }

      // Return just the loop point data (without storage metadata)
      const loopPoint: CustomLoopPoint = {
        soundId: storedLoopPoint.soundId,
        startTime: storedLoopPoint.startTime,
        endTime: storedLoopPoint.endTime,
        enabled: storedLoopPoint.enabled
      };

      return {
        success: true,
        data: loopPoint,
        message: 'Custom loop point retrieved successfully'
      };

    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown retrieval error',
        message: 'Failed to retrieve custom loop point'
      };
    }
  }

  /**
   * Get all loop points for a user
   */
  public async getAllLoopPoints(userId: string): Promise<AudioOperationResult<CustomLoopPoint[]>> {
    try {
      const userLoopPoints: CustomLoopPoint[] = [];

      for (const storedLoopPoint of this.loopPointsCache.values()) {
        if (storedLoopPoint.userId === userId) {
          userLoopPoints.push({
            soundId: storedLoopPoint.soundId,
            startTime: storedLoopPoint.startTime,
            endTime: storedLoopPoint.endTime,
            enabled: storedLoopPoint.enabled
          });
        }
      }

      return {
        success: true,
        data: userLoopPoints,
        message: `Retrieved ${userLoopPoints.length} custom loop points`
      };

    } catch (error) {
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Unknown retrieval error',
        message: 'Failed to retrieve loop points'
      };
    }
  }

  /**
   * Delete custom loop point
   */
  public async deleteLoopPoint(soundId: string): Promise<AudioOperationResult<boolean>> {
    try {
      const existed = this.loopPointsCache.has(soundId);
      
      if (!existed) {
        return {
          success: false,
          data: false,
          error: 'Loop point not found',
          message: 'No custom loop point found to delete'
        };
      }

      // Remove from cache
      this.loopPointsCache.delete(soundId);

      // Save to local storage
      await this.saveToLocalStorage();

      // Add deletion to sync queue if cloud sync is enabled
      if (this.config.enableCloudSync && this.isOnline) {
        await this.addDeletionToSyncQueue(soundId);
      }

      return {
        success: true,
        data: true,
        message: 'Custom loop point deleted successfully'
      };

    } catch (error) {
      return {
        success: false,
        data: false,
        error: error instanceof Error ? error.message : 'Unknown deletion error',
        message: 'Failed to delete custom loop point'
      };
    }
  }

  /**
   * Sync with cloud storage (for premium users)
   */
  public async syncWithCloud(userId: string): Promise<AudioOperationResult<{ uploaded: number; downloaded: number }>> {
    try {
      // Check if user has premium subscription
      const hasPremium = await subscriptionService.hasPremiumAccess();
      if (!hasPremium) {
        return {
          success: false,
          data: { uploaded: 0, downloaded: 0 },
          error: 'Premium subscription required',
          message: 'Cloud sync requires a premium subscription'
        };
      }

      let uploadedCount = 0;
      let downloadedCount = 0;

      // Upload pending changes
      for (const soundId of this.syncQueue) {
        try {
          const loopPoint = this.loopPointsCache.get(soundId);
          if (loopPoint && !loopPoint.isSynced) {
            await this.uploadLoopPoint(loopPoint);
            loopPoint.isSynced = true;
            uploadedCount++;
          }
        } catch (uploadError) {
          console.warn(`Failed to upload loop point ${soundId}:`, uploadError);
        }
      }

      // Download remote changes
      try {
        const remoteLoopPoints = await this.downloadLoopPoints(userId);
        for (const remoteLoopPoint of remoteLoopPoints) {
          const localLoopPoint = this.loopPointsCache.get(remoteLoopPoint.soundId);
          
          // Update local if remote is newer
          if (!localLoopPoint || remoteLoopPoint.version > localLoopPoint.version) {
            this.loopPointsCache.set(remoteLoopPoint.soundId, remoteLoopPoint);
            downloadedCount++;
          }
        }
      } catch (downloadError) {
        console.warn('Failed to download remote loop points:', downloadError);
      }

      // Clear sync queue and save
      this.syncQueue = [];
      await this.saveToLocalStorage();
      await this.saveSyncQueue();

      this.lastSyncTime = Date.now();

      return {
        success: true,
        data: { uploaded: uploadedCount, downloaded: downloadedCount },
        message: `Sync completed: ${uploadedCount} uploaded, ${downloadedCount} downloaded`
      };

    } catch (error) {
      return {
        success: false,
        data: { uploaded: 0, downloaded: 0 },
        error: error instanceof Error ? error.message : 'Unknown sync error',
        message: 'Failed to sync with cloud'
      };
    }
  }

  /**
   * Load loop points from local storage
   */
  private async loadFromLocalStorage(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsedData = JSON.parse(stored);
        
        // Convert dates back from strings
        for (const [soundId, loopPoint] of Object.entries(parsedData)) {
          const storedLoopPoint = loopPoint as any;
          storedLoopPoint.createdAt = new Date(storedLoopPoint.createdAt);
          storedLoopPoint.updatedAt = new Date(storedLoopPoint.updatedAt);
          this.loopPointsCache.set(soundId, storedLoopPoint);
        }
      }
    } catch (error) {
      console.warn('Failed to load loop points from local storage:', error);
    }
  }

  /**
   * Save loop points to local storage
   */
  private async saveToLocalStorage(): Promise<void> {
    try {
      const dataToStore = Object.fromEntries(this.loopPointsCache.entries());
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(dataToStore));
    } catch (error) {
      console.warn('Failed to save loop points to local storage:', error);
    }
  }

  /**
   * Load sync queue from local storage
   */
  private async loadSyncQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.SYNC_QUEUE_KEY);
      if (stored) {
        this.syncQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load sync queue:', error);
    }
  }

  /**
   * Save sync queue to local storage
   */
  private async saveSyncQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(this.syncQueue));
    } catch (error) {
      console.warn('Failed to save sync queue:', error);
    }
  }

  /**
   * Add sound ID to sync queue
   */
  private async addToSyncQueue(soundId: string): Promise<void> {
    if (!this.syncQueue.includes(soundId)) {
      this.syncQueue.push(soundId);
      await this.saveSyncQueue();
    }
  }

  /**
   * Add deletion to sync queue
   */
  private async addDeletionToSyncQueue(soundId: string): Promise<void> {
    // For deletions, we need to track differently
    // This would be enhanced in a full implementation
    const deleteMarker = `DELETE:${soundId}`;
    if (!this.syncQueue.includes(deleteMarker)) {
      this.syncQueue.push(deleteMarker);
      await this.saveSyncQueue();
    }
  }

  /**
   * Upload loop point to cloud storage
   */
  private async uploadLoopPoint(loopPoint: StoredLoopPoint): Promise<void> {
    const { data, error } = await supabase
      .from('user_custom_loop_points')
      .upsert({
        user_id: loopPoint.userId,
        sound_id: loopPoint.soundId,
        start_time: loopPoint.startTime,
        end_time: loopPoint.endTime,
        enabled: loopPoint.enabled,
        version: loopPoint.version,
        updated_at: loopPoint.updatedAt.toISOString()
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  /**
   * Download loop points from cloud storage
   */
  private async downloadLoopPoints(userId: string): Promise<StoredLoopPoint[]> {
    const { data, error } = await supabase
      .from('user_custom_loop_points')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Download failed: ${error.message}`);
    }

    return (data || []).map(row => ({
      soundId: row.sound_id,
      startTime: row.start_time,
      endTime: row.end_time,
      enabled: row.enabled,
      userId: row.user_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      version: row.version,
      isSynced: true
    }));
  }

  /**
   * Set up periodic sync for premium users
   */
  private setupPeriodicSync(): void {
    setInterval(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && this.syncQueue.length > 0) {
          await this.syncWithCloud(user.id);
        }
      } catch (error) {
        console.warn('Periodic sync error:', error);
      }
    }, this.config.syncInterval);
  }

  /**
   * Get storage statistics
   */
  public getStorageStats(): {
    totalLoopPoints: number;
    syncPending: number;
    lastSyncTime: number;
    storageUsed: number;
  } {
    return {
      totalLoopPoints: this.loopPointsCache.size,
      syncPending: this.syncQueue.length,
      lastSyncTime: this.lastSyncTime,
      storageUsed: JSON.stringify(Object.fromEntries(this.loopPointsCache.entries())).length
    };
  }

  /**
   * Clean up storage
   */
  public async cleanup(): Promise<void> {
    try {
      // Save any pending changes
      await this.saveToLocalStorage();
      await this.saveSyncQueue();

      // Clear caches
      this.loopPointsCache.clear();
      this.syncQueue = [];

      CustomLoopStorage.initialized = false;
      CustomLoopStorage.instance = null;

    } catch (error) {
      console.warn('Custom loop storage cleanup error:', error);
    }
  }
}

// Export singleton instance getter
export const getCustomLoopStorage = () => CustomLoopStorage.getInstance();

export default CustomLoopStorage;