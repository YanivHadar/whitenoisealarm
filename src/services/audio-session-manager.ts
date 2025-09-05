/**
 * Audio Session Manager Service
 * 
 * Manages real-time audio session state with comprehensive Supabase synchronization
 * for cross-device continuity and persistent session recovery. Handles session
 * lifecycle, progress tracking, conflict resolution, and offline-first operation.
 * 
 * Key Features:
 * - Real-time session state synchronization with Supabase
 * - Cross-device session continuity and conflict resolution
 * - Persistent session recovery after app restart
 * - Progress tracking with second-precision updates
 * - Offline-first operation with queue-based sync
 * - Session analytics and performance metrics
 * - Background sync optimization for battery efficiency
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase/client';
import type {
  AudioSession,
  AudioSessionState,
  AudioSessionType,
  AudioTimestamp,
  AudioSyncState,
  DeviceSyncConfig,
  CloudSyncConfig,
  ConflictResolutionConfig,
  AudioPerformanceMetrics,
  AudioOperationResult,
  AudioError,
  AudioErrorCode,
} from '../types/audio';

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

/**
 * Database schema for audio sessions
 */
export interface AudioSessionRecord {
  id: string;
  user_id: string;
  type: AudioSessionType;
  state: AudioSessionState;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  ended_at: string | null;
  duration_target: number | null;
  duration_actual: number | null;
  
  // Configuration JSON fields
  sound_config: any;
  volume_config: any;
  fade_config: any;
  loop_config: any;
  routing_config: any;
  
  // Sync and performance
  device_id: string;
  device_name: string;
  sync_version: number;
  performance_metrics: any;
  
  // Progress tracking
  progress_seconds: number;
  progress_percentage: number | null;
  last_heartbeat_at: string | null;
}

/**
 * Real-time update message
 */
export interface SessionUpdateMessage {
  session_id: string;
  user_id: string;
  update_type: 'state_change' | 'progress_update' | 'config_change' | 'heartbeat';
  data: Partial<AudioSessionRecord>;
  timestamp: string;
  device_id: string;
  sync_version: number;
}

/**
 * Conflict resolution data
 */
export interface SessionConflict {
  session_id: string;
  local_version: number;
  remote_version: number;
  local_data: Partial<AudioSessionRecord>;
  remote_data: Partial<AudioSessionRecord>;
  conflict_type: 'state_mismatch' | 'progress_discrepancy' | 'config_divergence';
  resolution_strategy: 'last_write_wins' | 'manual' | 'merge';
  created_at: Date;
}

/**
 * Sync queue item
 */
export interface SyncQueueItem {
  id: string;
  session_id: string;
  operation: 'create' | 'update' | 'delete' | 'heartbeat';
  data: Partial<AudioSessionRecord>;
  timestamp: Date;
  retry_count: number;
  max_retries: number;
  next_retry_at: Date | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEYS = {
  SESSIONS: 'audio_session_manager_sessions',
  SYNC_QUEUE: 'audio_session_manager_sync_queue',
  DEVICE_INFO: 'audio_session_manager_device_info',
  SYNC_STATE: 'audio_session_manager_sync_state',
  CONFLICTS: 'audio_session_manager_conflicts',
} as const;

const SYNC_CONFIG = {
  HEARTBEAT_INTERVAL: 5000, // 5 seconds
  PROGRESS_UPDATE_INTERVAL: 1000, // 1 second
  SYNC_RETRY_INTERVALS: [1000, 5000, 15000, 60000], // Exponential backoff
  MAX_SYNC_RETRIES: 4,
  OFFLINE_QUEUE_MAX_SIZE: 100,
  CONFLICT_RESOLUTION_TIMEOUT: 30000, // 30 seconds
} as const;

const DATABASE_TABLES = {
  AUDIO_SESSIONS: 'audio_sessions',
  SESSION_ANALYTICS: 'session_analytics',
  SYNC_CONFLICTS: 'session_sync_conflicts',
} as const;

// ============================================================================
// MAIN AUDIO SESSION MANAGER CLASS
// ============================================================================

export class AudioSessionManager {
  private static instance: AudioSessionManager | null = null;
  private static initialized = false;

  // Core state
  private sessions = new Map<string, AudioSession>();
  private syncQueue: SyncQueueItem[] = [];
  private conflicts = new Map<string, SessionConflict>();
  
  // Real-time sync
  private realtimeChannel: RealtimeChannel | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private progressInterval: NodeJS.Timeout | null = null;
  private syncProcessInterval: NodeJS.Timeout | null = null;
  
  // Configuration
  private userId: string | null = null;
  private deviceId: string = '';
  private deviceName: string = '';
  private syncConfig: CloudSyncConfig = {
    enabled: true,
    provider: 'supabase',
    sync_frequency: 5000,
    conflict_resolution_strategy: 'last_write_wins',
  };
  
  // State tracking
  private isOnline = true;
  private lastSyncAt: Date | null = null;
  private syncVersion = 0;

  // ============================================================================
  // SINGLETON PATTERN & INITIALIZATION
  // ============================================================================

  private constructor() {}

  static getInstance(): AudioSessionManager {
    if (!AudioSessionManager.instance) {
      AudioSessionManager.instance = new AudioSessionManager();
    }
    return AudioSessionManager.instance;
  }

  /**
   * Initialize the audio session manager
   */
  static async initialize(userId: string, deviceId?: string): Promise<void> {
    const manager = AudioSessionManager.getInstance();
    
    if (AudioSessionManager.initialized) {
      return;
    }

    try {
      console.log('Initializing AudioSessionManager...');
      
      // Set user context
      manager.userId = userId;
      manager.deviceId = deviceId || await manager.generateDeviceId();
      manager.deviceName = await manager.getDeviceName();
      
      // Load persistent state
      await manager.loadPersistedState();
      
      // Initialize real-time sync
      await manager.initializeRealtimeSync();
      
      // Start background processes
      manager.startBackgroundProcesses();
      
      // Recover any incomplete sessions
      await manager.recoverIncompleteSessions();

      AudioSessionManager.initialized = true;
      console.log('AudioSessionManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AudioSessionManager:', error);
      throw error;
    }
  }

  // ============================================================================
  // SESSION LIFECYCLE MANAGEMENT
  // ============================================================================

  /**
   * Create a new audio session with real-time sync
   */
  async createSession(session: AudioSession): Promise<AudioOperationResult<AudioSession>> {
    const startTime = Date.now();

    try {
      console.log(`Creating audio session ${session.id}`);
      
      // Validate session
      const validation = this.validateSession(session);
      if (!validation.valid) {
        return this.createErrorResult('AUDIO_PLAYBACK_FAILED', validation.error || 'Session validation failed', startTime);
      }
      
      // Add device information
      session.sync_state.device_sync.master_device_id = this.deviceId;
      session.created_at = new Date();
      session.updated_at = new Date();
      
      // Store session locally
      this.sessions.set(session.id, session);
      
      // Queue for sync
      await this.queueSyncOperation('create', session);
      
      // Start session tracking
      this.startSessionTracking(session.id);
      
      // Persist locally
      await this.persistSessions();
      
      console.log(`Audio session ${session.id} created successfully`);
      return this.createSuccessResult(session, startTime);
    } catch (error) {
      console.error(`Failed to create session ${session.id}:`, error);
      return this.createErrorResult(
        'AUDIO_PLAYBACK_FAILED',
        `Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`,
        startTime
      );
    }
  }

  /**
   * Update an existing session with conflict resolution
   */
  async updateSession(sessionId: string, updates: Partial<AudioSession>): Promise<AudioOperationResult<AudioSession>> {
    const startTime = Date.now();

    try {
      console.log(`Updating audio session ${sessionId}`);
      
      const session = this.sessions.get(sessionId);
      if (!session) {
        return this.createErrorResult('AUDIO_PLAYBACK_FAILED', 'Session not found', startTime);
      }
      
      // Apply updates with timestamp
      const updatedSession = {
        ...session,
        ...updates,
        updated_at: new Date(),
      };
      
      // Check for conflicts if this is a remote update
      if (updates.sync_state?.sync_id && updates.sync_state.sync_id !== session.sync_state.sync_id) {
        const conflict = await this.detectConflict(session, updatedSession);
        if (conflict) {
          await this.handleConflict(conflict);
        }
      }
      
      // Store updated session
      this.sessions.set(sessionId, updatedSession);
      
      // Queue for sync
      await this.queueSyncOperation('update', updatedSession);
      
      // Persist locally
      await this.persistSessions();
      
      console.log(`Audio session ${sessionId} updated successfully`);
      return this.createSuccessResult(updatedSession, startTime);
    } catch (error) {
      console.error(`Failed to update session ${sessionId}:`, error);
      return this.createErrorResult(
        'AUDIO_PLAYBACK_FAILED',
        `Failed to update session: ${error instanceof Error ? error.message : 'Unknown error'}`,
        startTime
      );
    }
  }

  /**
   * Delete a session with cleanup
   */
  async deleteSession(sessionId: string): Promise<AudioOperationResult<boolean>> {
    const startTime = Date.now();

    try {
      console.log(`Deleting audio session ${sessionId}`);
      
      const session = this.sessions.get(sessionId);
      if (!session) {
        return this.createErrorResult('AUDIO_PLAYBACK_FAILED', 'Session not found', startTime);
      }
      
      // Stop session tracking
      this.stopSessionTracking(sessionId);
      
      // Remove from local storage
      this.sessions.delete(sessionId);
      
      // Queue deletion for sync
      await this.queueSyncOperation('delete', session);
      
      // Persist changes
      await this.persistSessions();
      
      console.log(`Audio session ${sessionId} deleted successfully`);
      return this.createSuccessResult(true, startTime);
    } catch (error) {
      console.error(`Failed to delete session ${sessionId}:`, error);
      return this.createErrorResult(
        'AUDIO_PLAYBACK_FAILED',
        `Failed to delete session: ${error instanceof Error ? error.message : 'Unknown error'}`,
        startTime
      );
    }
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): AudioSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get all user sessions
   */
  getUserSessions(includeInactive: boolean = false): AudioSession[] {
    const sessions = Array.from(this.sessions.values());
    
    if (includeInactive) {
      return sessions;
    }
    
    return sessions.filter(session => session.is_active);
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): AudioSession[] {
    return Array.from(this.sessions.values()).filter(session => 
      session.is_active && session.state === 'playing'
    );
  }

  // ============================================================================
  // REAL-TIME PROGRESS TRACKING
  // ============================================================================

  /**
   * Update session progress
   */
  async updateProgress(sessionId: string, progressSeconds: number): Promise<AudioOperationResult<AudioTimestamp>> {
    const startTime = Date.now();

    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return this.createErrorResult('AUDIO_PLAYBACK_FAILED', 'Session not found', startTime);
      }
      
      // Calculate progress data
      const totalDuration = session.duration_target;
      const progressPercentage = totalDuration ? (progressSeconds / totalDuration) * 100 : null;
      const remainingTime = totalDuration ? Math.max(0, totalDuration - progressSeconds) : null;
      
      // Create timestamp object
      const timestamp: AudioTimestamp = {
        session_start: session.started_at || new Date(),
        current_position: progressSeconds,
        total_duration: totalDuration,
        remaining_time: remainingTime,
        formatted_position: this.formatDuration(progressSeconds),
        formatted_remaining: remainingTime ? this.formatDuration(remainingTime) : null,
      };
      
      // Update session
      session.updated_at = new Date();
      session.performance.last_measured_at = new Date();
      
      // Queue lightweight progress update
      await this.queueProgressUpdate(sessionId, progressSeconds, progressPercentage);
      
      return this.createSuccessResult(timestamp, startTime);
    } catch (error) {
      console.error(`Failed to update progress for session ${sessionId}:`, error);
      return this.createErrorResult(
        'AUDIO_PLAYBACK_FAILED',
        `Failed to update progress: ${error instanceof Error ? error.message : 'Unknown error'}`,
        startTime
      );
    }
  }

  /**
   * Send heartbeat for session
   */
  async sendHeartbeat(sessionId: string): Promise<AudioOperationResult<boolean>> {
    const startTime = Date.now();

    try {
      const session = this.sessions.get(sessionId);
      if (!session || !session.is_active) {
        return this.createSuccessResult(false, startTime);
      }
      
      // Update last heartbeat
      session.performance.last_measured_at = new Date();
      
      // Queue heartbeat
      await this.queueSyncOperation('heartbeat', session);
      
      return this.createSuccessResult(true, startTime);
    } catch (error) {
      console.error(`Failed to send heartbeat for session ${sessionId}:`, error);
      return this.createErrorResult(
        'AUDIO_PLAYBACK_FAILED',
        `Failed to send heartbeat: ${error instanceof Error ? error.message : 'Unknown error'}`,
        startTime
      );
    }
  }

  // ============================================================================
  // REAL-TIME SYNC & CONFLICT RESOLUTION
  // ============================================================================

  /**
   * Initialize real-time sync with Supabase
   */
  private async initializeRealtimeSync(): Promise<void> {
    if (!this.userId) {
      throw new Error('User ID is required for real-time sync');
    }

    try {
      // Create realtime channel for user's sessions
      this.realtimeChannel = supabase
        .channel(`audio_sessions_${this.userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: DATABASE_TABLES.AUDIO_SESSIONS,
            filter: `user_id=eq.${this.userId}`,
          },
          (payload) => this.handleRealtimeUpdate(payload)
        );

      // Subscribe to channel
      const { error } = await this.realtimeChannel.subscribe();
      if (error) {
        throw error;
      }

      console.log('Real-time sync initialized successfully');
    } catch (error) {
      console.error('Failed to initialize real-time sync:', error);
      throw error;
    }
  }

  /**
   * Handle real-time updates from Supabase
   */
  private async handleRealtimeUpdate(payload: any): Promise<void> {
    try {
      console.log('Received real-time update:', payload);
      
      const { eventType, new: newRecord, old: oldRecord } = payload;
      
      switch (eventType) {
        case 'INSERT':
          await this.handleRemoteSessionCreate(newRecord);
          break;
        case 'UPDATE':
          await this.handleRemoteSessionUpdate(newRecord, oldRecord);
          break;
        case 'DELETE':
          await this.handleRemoteSessionDelete(oldRecord);
          break;
      }
    } catch (error) {
      console.error('Failed to handle real-time update:', error);
    }
  }

  /**
   * Handle remote session creation
   */
  private async handleRemoteSessionCreate(record: AudioSessionRecord): Promise<void> {
    // Skip if this update came from current device
    if (record.device_id === this.deviceId) {
      return;
    }

    const session = this.convertRecordToSession(record);
    
    // Check if we already have this session
    const existingSession = this.sessions.get(session.id);
    if (existingSession) {
      // Check for conflicts
      const conflict = await this.detectConflict(existingSession, session);
      if (conflict) {
        await this.handleConflict(conflict);
      }
    } else {
      // Add new session
      this.sessions.set(session.id, session);
      await this.persistSessions();
    }
  }

  /**
   * Handle remote session update
   */
  private async handleRemoteSessionUpdate(newRecord: AudioSessionRecord, oldRecord: AudioSessionRecord): Promise<void> {
    // Skip if this update came from current device
    if (newRecord.device_id === this.deviceId) {
      return;
    }

    const sessionId = newRecord.id;
    const localSession = this.sessions.get(sessionId);
    const remoteSession = this.convertRecordToSession(newRecord);
    
    if (localSession) {
      // Check for conflicts
      const conflict = await this.detectConflict(localSession, remoteSession);
      if (conflict) {
        await this.handleConflict(conflict);
      } else {
        // Apply update if no conflict
        this.sessions.set(sessionId, remoteSession);
        await this.persistSessions();
      }
    } else {
      // Session doesn't exist locally, add it
      this.sessions.set(sessionId, remoteSession);
      await this.persistSessions();
    }
  }

  /**
   * Handle remote session deletion
   */
  private async handleRemoteSessionDelete(record: AudioSessionRecord): Promise<void> {
    // Skip if this update came from current device
    if (record.device_id === this.deviceId) {
      return;
    }

    const sessionId = record.id;
    const localSession = this.sessions.get(sessionId);
    
    if (localSession && localSession.is_active) {
      // Don't delete active sessions from remote
      console.warn(`Ignoring remote deletion of active session ${sessionId}`);
      return;
    }
    
    // Remove session
    this.sessions.delete(sessionId);
    this.stopSessionTracking(sessionId);
    await this.persistSessions();
  }

  /**
   * Detect conflicts between local and remote sessions
   */
  private async detectConflict(localSession: AudioSession, remoteSession: AudioSession): Promise<SessionConflict | null> {
    // Check sync versions
    const localVersion = localSession.sync_state.last_sync_at?.getTime() || 0;
    const remoteVersion = remoteSession.sync_state.last_sync_at?.getTime() || 0;
    
    // No conflict if remote is newer
    if (remoteVersion > localVersion) {
      return null;
    }
    
    // Check for actual conflicts
    let conflictType: SessionConflict['conflict_type'] | null = null;
    
    if (localSession.state !== remoteSession.state) {
      conflictType = 'state_mismatch';
    } else if (Math.abs((localSession.performance.last_measured_at?.getTime() || 0) - 
                       (remoteSession.performance.last_measured_at?.getTime() || 0)) > 10000) {
      conflictType = 'progress_discrepancy';
    } else if (JSON.stringify(localSession.sound_config) !== JSON.stringify(remoteSession.sound_config)) {
      conflictType = 'config_divergence';
    }
    
    if (!conflictType) {
      return null;
    }
    
    return {
      session_id: localSession.id,
      local_version: localVersion,
      remote_version: remoteVersion,
      local_data: this.convertSessionToRecord(localSession),
      remote_data: this.convertSessionToRecord(remoteSession),
      conflict_type: conflictType,
      resolution_strategy: this.syncConfig.conflict_resolution_strategy,
      created_at: new Date(),
    };
  }

  /**
   * Handle session conflict
   */
  private async handleConflict(conflict: SessionConflict): Promise<void> {
    console.log(`Handling session conflict for ${conflict.session_id}:`, conflict.conflict_type);
    
    // Store conflict for potential manual resolution
    this.conflicts.set(conflict.session_id, conflict);
    
    switch (conflict.resolution_strategy) {
      case 'last_write_wins':
        // Use the version with the latest timestamp
        const useLocal = conflict.local_version > conflict.remote_version;
        const resolvedSession = useLocal 
          ? this.convertRecordToSession(conflict.local_data as AudioSessionRecord)
          : this.convertRecordToSession(conflict.remote_data as AudioSessionRecord);
        
        this.sessions.set(conflict.session_id, resolvedSession);
        break;
        
      case 'manual':
        // Store conflict for user resolution
        console.log(`Manual conflict resolution required for session ${conflict.session_id}`);
        break;
        
      case 'merge':
        // Attempt to merge non-conflicting changes
        await this.attemptConflictMerge(conflict);
        break;
    }
    
    await this.persistSessions();
  }

  /**
   * Attempt to merge conflicting sessions
   */
  private async attemptConflictMerge(conflict: SessionConflict): Promise<void> {
    const localSession = this.convertRecordToSession(conflict.local_data as AudioSessionRecord);
    const remoteSession = this.convertRecordToSession(conflict.remote_data as AudioSessionRecord);
    
    // Merge strategy: prioritize local state for active sessions, remote for configuration
    const mergedSession: AudioSession = {
      ...remoteSession,
      state: localSession.is_active ? localSession.state : remoteSession.state,
      is_active: localSession.is_active || remoteSession.is_active,
      performance: {
        ...remoteSession.performance,
        ...localSession.performance,
        last_measured_at: new Date(),
      },
      updated_at: new Date(),
    };
    
    this.sessions.set(conflict.session_id, mergedSession);
    console.log(`Merged conflict for session ${conflict.session_id}`);
  }

  // ============================================================================
  // BACKGROUND PROCESSES
  // ============================================================================

  /**
   * Start background processes
   */
  private startBackgroundProcesses(): void {
    // Heartbeat interval
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeats();
    }, SYNC_CONFIG.HEARTBEAT_INTERVAL);
    
    // Progress update interval
    this.progressInterval = setInterval(() => {
      this.updateAllProgress();
    }, SYNC_CONFIG.PROGRESS_UPDATE_INTERVAL);
    
    // Sync queue processing
    this.syncProcessInterval = setInterval(() => {
      this.processSyncQueue();
    }, 1000);
    
    console.log('Background processes started');
  }

  /**
   * Send heartbeats for all active sessions
   */
  private async sendHeartbeats(): Promise<void> {
    const activeSessions = this.getActiveSessions();
    
    for (const session of activeSessions) {
      try {
        await this.sendHeartbeat(session.id);
      } catch (error) {
        console.warn(`Failed to send heartbeat for session ${session.id}:`, error);
      }
    }
  }

  /**
   * Update progress for all active sessions
   */
  private async updateAllProgress(): Promise<void> {
    const activeSessions = this.getActiveSessions();
    
    for (const session of activeSessions) {
      if (session.started_at && session.state === 'playing') {
        const elapsed = (Date.now() - session.started_at.getTime()) / 1000;
        await this.updateProgress(session.id, elapsed);
      }
    }
  }

  /**
   * Process sync queue with retry logic
   */
  private async processSyncQueue(): Promise<void> {
    if (this.syncQueue.length === 0 || !this.isOnline) {
      return;
    }
    
    const now = new Date();
    const itemsToProcess = this.syncQueue.filter(item => 
      !item.next_retry_at || item.next_retry_at <= now
    );
    
    for (const item of itemsToProcess) {
      try {
        await this.executeSyncOperation(item);
        
        // Remove successful item from queue
        this.syncQueue = this.syncQueue.filter(queueItem => queueItem.id !== item.id);
      } catch (error) {
        console.warn(`Sync operation failed for ${item.id}:`, error);
        
        // Handle retry logic
        item.retry_count++;
        
        if (item.retry_count >= item.max_retries) {
          console.error(`Max retries exceeded for sync operation ${item.id}`);
          this.syncQueue = this.syncQueue.filter(queueItem => queueItem.id !== item.id);
        } else {
          // Schedule next retry
          const retryDelay = SYNC_CONFIG.SYNC_RETRY_INTERVALS[item.retry_count - 1] || 60000;
          item.next_retry_at = new Date(Date.now() + retryDelay);
        }
      }
    }
    
    // Persist queue state
    await this.persistSyncQueue();
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Start session tracking
   */
  private startSessionTracking(sessionId: string): void {
    console.log(`Started tracking session ${sessionId}`);
  }

  /**
   * Stop session tracking
   */
  private stopSessionTracking(sessionId: string): void {
    console.log(`Stopped tracking session ${sessionId}`);
  }

  /**
   * Generate unique device ID
   */
  private async generateDeviceId(): Promise<string> {
    try {
      let deviceId = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_INFO);
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_INFO, deviceId);
      }
      return deviceId;
    } catch (error) {
      return `device_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
  }

  /**
   * Get device name
   */
  private async getDeviceName(): Promise<string> {
    // In a real implementation, this would get the actual device name
    return 'Mobile Device';
  }

  /**
   * Queue sync operation
   */
  private async queueSyncOperation(operation: SyncQueueItem['operation'], session: AudioSession): Promise<void> {
    const queueItem: SyncQueueItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      session_id: session.id,
      operation,
      data: this.convertSessionToRecord(session),
      timestamp: new Date(),
      retry_count: 0,
      max_retries: SYNC_CONFIG.MAX_SYNC_RETRIES,
      next_retry_at: null,
    };
    
    this.syncQueue.push(queueItem);
    
    // Limit queue size
    if (this.syncQueue.length > SYNC_CONFIG.OFFLINE_QUEUE_MAX_SIZE) {
      this.syncQueue.shift(); // Remove oldest item
    }
  }

  /**
   * Queue progress update
   */
  private async queueProgressUpdate(sessionId: string, progressSeconds: number, progressPercentage: number | null): Promise<void> {
    // Lightweight progress update - only sync every few seconds to reduce network traffic
    if (Date.now() % 5000 < 1000) { // Sync roughly every 5 seconds
      const session = this.sessions.get(sessionId);
      if (session) {
        await this.queueSyncOperation('update', {
          ...session,
          performance: {
            ...session.performance,
            last_measured_at: new Date(),
          },
        });
      }
    }
  }

  /**
   * Execute sync operation
   */
  private async executeSyncOperation(item: SyncQueueItem): Promise<void> {
    switch (item.operation) {
      case 'create':
        await this.syncCreateSession(item.data as AudioSessionRecord);
        break;
      case 'update':
        await this.syncUpdateSession(item.data as AudioSessionRecord);
        break;
      case 'delete':
        await this.syncDeleteSession(item.session_id);
        break;
      case 'heartbeat':
        await this.syncHeartbeat(item.data as AudioSessionRecord);
        break;
    }
  }

  /**
   * Sync operations with Supabase
   */
  private async syncCreateSession(record: AudioSessionRecord): Promise<void> {
    const { error } = await supabase
      .from(DATABASE_TABLES.AUDIO_SESSIONS)
      .insert(record);
    
    if (error) throw error;
  }

  private async syncUpdateSession(record: AudioSessionRecord): Promise<void> {
    const { error } = await supabase
      .from(DATABASE_TABLES.AUDIO_SESSIONS)
      .update(record)
      .eq('id', record.id);
    
    if (error) throw error;
  }

  private async syncDeleteSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from(DATABASE_TABLES.AUDIO_SESSIONS)
      .delete()
      .eq('id', sessionId);
    
    if (error) throw error;
  }

  private async syncHeartbeat(record: AudioSessionRecord): Promise<void> {
    const { error } = await supabase
      .from(DATABASE_TABLES.AUDIO_SESSIONS)
      .update({ 
        last_heartbeat_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', record.id);
    
    if (error) throw error;
  }

  /**
   * Convert session to database record
   */
  private convertSessionToRecord(session: AudioSession): AudioSessionRecord {
    return {
      id: session.id,
      user_id: this.userId!,
      type: session.type,
      state: session.state,
      created_at: session.created_at.toISOString(),
      updated_at: session.updated_at.toISOString(),
      started_at: session.started_at?.toISOString() || null,
      ended_at: session.ended_at?.toISOString() || null,
      duration_target: session.duration_target,
      duration_actual: session.duration_actual,
      sound_config: session.sound_config,
      volume_config: session.volume_config,
      fade_config: session.fade_config,
      loop_config: session.loop_config,
      routing_config: session.routing_config,
      device_id: this.deviceId,
      device_name: this.deviceName,
      sync_version: this.syncVersion++,
      performance_metrics: session.performance,
      progress_seconds: session.started_at 
        ? Math.floor((Date.now() - session.started_at.getTime()) / 1000) 
        : 0,
      progress_percentage: session.duration_target 
        ? ((Date.now() - (session.started_at?.getTime() || 0)) / 1000 / session.duration_target) * 100
        : null,
      last_heartbeat_at: new Date().toISOString(),
    };
  }

  /**
   * Convert database record to session
   */
  private convertRecordToSession(record: AudioSessionRecord): AudioSession {
    return {
      id: record.id,
      type: record.type,
      user_id: record.user_id,
      created_at: new Date(record.created_at),
      updated_at: new Date(record.updated_at),
      state: record.state,
      is_active: ['playing', 'paused', 'loading'].includes(record.state),
      is_background: record.type === 'background_continuous',
      started_at: record.started_at ? new Date(record.started_at) : null,
      ended_at: record.ended_at ? new Date(record.ended_at) : null,
      duration_target: record.duration_target,
      duration_actual: record.duration_actual,
      sound_config: record.sound_config,
      volume_config: record.volume_config,
      fade_config: record.fade_config,
      loop_config: record.loop_config,
      routing_config: record.routing_config,
      performance: record.performance_metrics,
      sync_state: {
        sync_enabled: true,
        sync_id: record.id,
        last_sync_at: new Date(record.updated_at),
        device_sync: {
          enabled: true,
          sync_devices: [],
          master_device_id: record.device_id,
          sync_frequency: this.syncConfig.sync_frequency / 1000,
        },
        cloud_sync: this.syncConfig,
        conflict_resolution: {
          strategy: this.syncConfig.conflict_resolution_strategy,
          auto_resolve_minor_conflicts: true,
          manual_resolution_timeout: SYNC_CONFIG.CONFLICT_RESOLUTION_TIMEOUT / 1000,
        },
      },
    };
  }

  /**
   * Validation methods
   */
  private validateSession(session: AudioSession): { valid: boolean; error?: string } {
    if (!session.id || !session.type) {
      return { valid: false, error: 'Session ID and type are required' };
    }
    
    if (!this.userId) {
      return { valid: false, error: 'User ID is required' };
    }
    
    return { valid: true };
  }

  /**
   * Persistence methods
   */
  private async loadPersistedState(): Promise<void> {
    try {
      // Load sessions
      const sessionsData = await AsyncStorage.getItem(STORAGE_KEYS.SESSIONS);
      if (sessionsData) {
        const sessionRecords = JSON.parse(sessionsData);
        for (const record of sessionRecords) {
          const session = this.convertRecordToSession(record);
          this.sessions.set(session.id, session);
        }
      }
      
      // Load sync queue
      const queueData = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
      if (queueData) {
        this.syncQueue = JSON.parse(queueData);
      }
      
      console.log('Persisted state loaded successfully');
    } catch (error) {
      console.warn('Failed to load persisted state:', error);
    }
  }

  private async persistSessions(): Promise<void> {
    try {
      const sessionRecords = Array.from(this.sessions.values()).map(session => 
        this.convertSessionToRecord(session)
      );
      await AsyncStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessionRecords));
    } catch (error) {
      console.warn('Failed to persist sessions:', error);
    }
  }

  private async persistSyncQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(this.syncQueue));
    } catch (error) {
      console.warn('Failed to persist sync queue:', error);
    }
  }

  /**
   * Recovery methods
   */
  private async recoverIncompleteSessions(): Promise<void> {
    console.log('Checking for incomplete sessions to recover...');
    
    let recoveredCount = 0;
    for (const [sessionId, session] of this.sessions) {
      if (session.is_active && session.state === 'playing') {
        // Check if session should still be active
        const now = Date.now();
        const elapsed = session.started_at ? (now - session.started_at.getTime()) / 1000 : 0;
        
        if (session.duration_target && elapsed >= session.duration_target) {
          // Session should have ended
          session.state = 'ended';
          session.is_active = false;
          session.ended_at = new Date();
          recoveredCount++;
        } else {
          // Session can continue
          this.startSessionTracking(sessionId);
          recoveredCount++;
        }
      }
    }
    
    if (recoveredCount > 0) {
      console.log(`Recovered ${recoveredCount} incomplete sessions`);
      await this.persistSessions();
    }
  }

  /**
   * Utility methods
   */
  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }

  private createSuccessResult<T>(data: T, startTime: number): AudioOperationResult<T> {
    return {
      success: true,
      data,
      error: null,
      performance_metrics: {},
      operation_duration_ms: Date.now() - startTime,
    };
  }

  private createErrorResult(code: AudioErrorCode, message: string, startTime: number): AudioOperationResult<null> {
    const error: AudioError = {
      code,
      message,
      session_id: null,
      sound_id: null,
      timestamp: new Date(),
      platform: 'ios', // Would be determined at runtime
      device_info: {
        model: 'unknown',
        os_version: 'unknown',
        app_version: '1.0.0',
        audio_capabilities: {
          max_sample_rate: 48000,
          supported_formats: ['mp3', 'aac'],
          has_bluetooth: true,
          has_headphone_jack: false,
          max_audio_channels: 2,
        },
        available_storage_mb: 1000,
        battery_level: 1.0,
      },
      stack_trace: null,
      recovery_suggestions: ['Restart the app', 'Check internet connection'],
    };

    return {
      success: false,
      data: null,
      error,
      performance_metrics: {},
      operation_duration_ms: Date.now() - startTime,
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    console.log('Cleaning up AudioSessionManager...');
    
    // Stop intervals
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.progressInterval) clearInterval(this.progressInterval);
    if (this.syncProcessInterval) clearInterval(this.syncProcessInterval);
    
    // Unsubscribe from realtime
    if (this.realtimeChannel) {
      await this.realtimeChannel.unsubscribe();
    }
    
    // Final sync
    await this.processSyncQueue();
    
    // Persist final state
    await this.persistSessions();
    await this.persistSyncQueue();
    
    console.log('AudioSessionManager cleanup completed');
  }
}

export default AudioSessionManager;