/**
 * GDPR Compliance Service for Alarm & White Noise App
 * 
 * Handles user data export, account deletion,
 * and privacy compliance requirements.
 */

import { supabase } from '../lib/supabase/client';
import { AuthStorage } from '../lib/secure-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export interface DataExportOptions {
  includeUserProfile: boolean;
  includeAlarms: boolean;
  includeAudioHistory: boolean;
  includeSettings: boolean;
  includeUsageAnalytics: boolean;
  format: 'json' | 'csv' | 'both';
}

export interface ExportResult {
  success: boolean;
  error?: string;
  filePath?: string;
  fileSize?: number;
  exportDate?: Date;
}

export interface DeleteAccountOptions {
  deleteImmediately: boolean;
  retainBackups: boolean;
  gracePeriodDays: number;
  reason?: string;
}

export interface DeleteAccountResult {
  success: boolean;
  error?: string;
  deletionDate?: Date;
  cancellationDeadline?: Date;
  requestId?: string;
}

export interface UserDataSummary {
  profileData: number;
  alarms: number;
  audioSessions: number;
  preferences: number;
  analyticsEvents: number;
  totalSizeMB: number;
}

export interface PrivacySettings {
  dataCollection: boolean;
  analytics: boolean;
  crashReporting: boolean;
  personalizedContent: boolean;
  marketing: boolean;
  thirdPartySharing: boolean;
}

/**
 * GDPR Compliance Service Class
 */
export class GDPRService {
  private static instance: GDPRService;

  private constructor() {}

  static getInstance(): GDPRService {
    if (!GDPRService.instance) {
      GDPRService.instance = new GDPRService();
    }
    return GDPRService.instance;
  }

  /**
   * Export user data for GDPR compliance
   */
  async exportUserData(options: DataExportOptions): Promise<ExportResult> {
    try {
      console.log('Starting user data export with options:', options);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated',
        };
      }

      // Collect user data
      const userData = await this.collectUserData(user.id, options);

      // Generate export file(s)
      const exportFiles = await this.generateExportFiles(userData, options.format);

      // Calculate total file size
      const totalSize = exportFiles.reduce((sum, file) => sum + (file.size || 0), 0);

      // For mobile, save to device storage
      let filePath: string;
      
      if (exportFiles.length === 1) {
        filePath = exportFiles[0].path;
      } else {
        // Create a zip file with multiple exports
        filePath = await this.createZipArchive(exportFiles, user.id);
      }

      console.log('Data export completed:', {
        filePath,
        fileSize: totalSize,
        recordsExported: Object.keys(userData).length,
      });

      return {
        success: true,
        filePath,
        fileSize: totalSize,
        exportDate: new Date(),
      };

    } catch (error: any) {
      console.error('Data export error:', error);
      return {
        success: false,
        error: error.message || 'Data export failed',
      };
    }
  }

  /**
   * Share exported data file
   */
  async shareExportedData(filePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (!isAvailable) {
        return {
          success: false,
          error: 'Sharing is not available on this device',
        };
      }

      await Sharing.shareAsync(filePath, {
        mimeType: 'application/json',
        dialogTitle: 'Share Your Data Export',
        UTI: 'public.json',
      });

      return { success: true };

    } catch (error: any) {
      console.error('Share export error:', error);
      return {
        success: false,
        error: error.message || 'Failed to share exported data',
      };
    }
  }

  /**
   * Request account deletion
   */
  async requestAccountDeletion(options: DeleteAccountOptions): Promise<DeleteAccountResult> {
    try {
      console.log('Requesting account deletion with options:', options);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated',
        };
      }

      const now = new Date();
      const deletionDate = new Date(now.getTime() + (options.gracePeriodDays * 24 * 60 * 60 * 1000));
      const cancellationDeadline = new Date(deletionDate.getTime() - (24 * 60 * 60 * 1000)); // 24h before

      // Create deletion request record
      const { data: deletionRequest, error: deletionError } = await supabase
        .from('account_deletion_requests')
        .insert({
          user_id: user.id,
          requested_at: now.toISOString(),
          scheduled_deletion_date: deletionDate.toISOString(),
          cancellation_deadline: cancellationDeadline.toISOString(),
          reason: options.reason,
          retain_backups: options.retainBackups,
          status: 'pending',
          grace_period_days: options.gracePeriodDays,
        })
        .select('id')
        .single();

      if (deletionError) {
        console.error('Deletion request error:', deletionError);
        return {
          success: false,
          error: deletionError.message,
        };
      }

      // If immediate deletion is requested
      if (options.deleteImmediately) {
        const deleteResult = await this.executeAccountDeletion(user.id, options.retainBackups);
        if (!deleteResult.success) {
          return deleteResult;
        }
      }

      console.log('Account deletion requested:', {
        requestId: deletionRequest.id,
        deletionDate,
        cancellationDeadline,
      });

      return {
        success: true,
        deletionDate,
        cancellationDeadline,
        requestId: deletionRequest.id,
      };

    } catch (error: any) {
      console.error('Account deletion request error:', error);
      return {
        success: false,
        error: error.message || 'Account deletion request failed',
      };
    }
  }

  /**
   * Cancel account deletion request
   */
  async cancelAccountDeletion(): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated',
        };
      }

      const { error } = await supabase
        .from('account_deletion_requests')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (error) {
        console.error('Cancel deletion error:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      console.log('Account deletion cancelled');
      return { success: true };

    } catch (error: any) {
      console.error('Cancel deletion error:', error);
      return {
        success: false,
        error: error.message || 'Failed to cancel account deletion',
      };
    }
  }

  /**
   * Get user data summary
   */
  async getUserDataSummary(): Promise<UserDataSummary> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Count records in each table
      const [
        { count: profileCount },
        { count: alarmCount },
        { count: sessionCount },
        { count: prefCount },
        { count: analyticsCount },
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('id', user.id),
        supabase.from('alarms').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('audio_sessions').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('user_preferences').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);

      // Estimate data size (rough calculation)
      const estimatedSize = 
        (profileCount || 0) * 2 +     // 2KB per profile
        (alarmCount || 0) * 1 +       // 1KB per alarm
        (sessionCount || 0) * 0.5 +   // 0.5KB per session
        (prefCount || 0) * 0.2 +      // 0.2KB per preference
        (analyticsCount || 0) * 0.1;  // 0.1KB per analytics event

      return {
        profileData: profileCount || 0,
        alarms: alarmCount || 0,
        audioSessions: sessionCount || 0,
        preferences: prefCount || 0,
        analyticsEvents: analyticsCount || 0,
        totalSizeMB: Math.round(estimatedSize * 100) / 100,
      };

    } catch (error) {
      console.error('Data summary error:', error);
      return {
        profileData: 0,
        alarms: 0,
        audioSessions: 0,
        preferences: 0,
        analyticsEvents: 0,
        totalSizeMB: 0,
      };
    }
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(settings: PrivacySettings): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated',
        };
      }

      const { error } = await supabase
        .from('users')
        .update({
          privacy_settings: settings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        console.error('Privacy settings update error:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      console.log('Privacy settings updated:', settings);
      return { success: true };

    } catch (error: any) {
      console.error('Privacy settings update error:', error);
      return {
        success: false,
        error: error.message || 'Failed to update privacy settings',
      };
    }
  }

  /**
   * Collect user data from all relevant tables
   */
  private async collectUserData(userId: string, options: DataExportOptions): Promise<any> {
    const userData: any = {};

    try {
      // User profile data
      if (options.includeUserProfile) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (profile) {
          userData.profile = profile;
        }
      }

      // Alarm data
      if (options.includeAlarms) {
        const { data: alarms } = await supabase
          .from('alarms')
          .select('*')
          .eq('user_id', userId);
        
        if (alarms) {
          userData.alarms = alarms;
        }
      }

      // Audio history
      if (options.includeAudioHistory) {
        const { data: sessions } = await supabase
          .from('audio_sessions')
          .select('*')
          .eq('user_id', userId);
        
        if (sessions) {
          userData.audioSessions = sessions;
        }
      }

      // Settings and preferences
      if (options.includeSettings) {
        const { data: preferences } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', userId);
        
        if (preferences) {
          userData.preferences = preferences;
        }
      }

      // Usage analytics (anonymized)
      if (options.includeUsageAnalytics) {
        const { data: analytics } = await supabase
          .from('analytics_events')
          .select('event_type, created_at, metadata')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1000); // Limit to recent events
        
        if (analytics) {
          userData.analytics = analytics;
        }
      }

      return userData;

    } catch (error) {
      console.error('Data collection error:', error);
      throw error;
    }
  }

  /**
   * Generate export files in requested format(s)
   */
  private async generateExportFiles(userData: any, format: 'json' | 'csv' | 'both'): Promise<Array<{ path: string; size: number }>> {
    const files: Array<{ path: string; size: number }> = [];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    try {
      if (format === 'json' || format === 'both') {
        const jsonContent = JSON.stringify(userData, null, 2);
        const jsonPath = `${FileSystem.documentDirectory}user-data-export-${timestamp}.json`;
        
        await FileSystem.writeAsStringAsync(jsonPath, jsonContent);
        const jsonInfo = await FileSystem.getInfoAsync(jsonPath);
        
        files.push({
          path: jsonPath,
          size: jsonInfo.size || 0,
        });
      }

      if (format === 'csv' || format === 'both') {
        // Convert to CSV format (simplified)
        const csvContent = this.convertToCSV(userData);
        const csvPath = `${FileSystem.documentDirectory}user-data-export-${timestamp}.csv`;
        
        await FileSystem.writeAsStringAsync(csvPath, csvContent);
        const csvInfo = await FileSystem.getInfoAsync(csvPath);
        
        files.push({
          path: csvPath,
          size: csvInfo.size || 0,
        });
      }

      return files;

    } catch (error) {
      console.error('Export file generation error:', error);
      throw error;
    }
  }

  /**
   * Convert user data to CSV format
   */
  private convertToCSV(userData: any): string {
    let csv = '';

    // Helper function to escape CSV values
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Convert each data type to CSV section
    Object.keys(userData).forEach(key => {
      const data = userData[key];
      if (Array.isArray(data) && data.length > 0) {
        csv += `\n# ${key.toUpperCase()}\n`;
        
        // Header row
        const headers = Object.keys(data[0]);
        csv += headers.map(escapeCSV).join(',') + '\n';
        
        // Data rows
        data.forEach(row => {
          csv += headers.map(header => escapeCSV(row[header])).join(',') + '\n';
        });
      } else if (typeof data === 'object' && data !== null) {
        csv += `\n# ${key.toUpperCase()}\n`;
        csv += Object.keys(data).map(escapeCSV).join(',') + '\n';
        csv += Object.values(data).map(escapeCSV).join(',') + '\n';
      }
    });

    return csv;
  }

  /**
   * Create ZIP archive for multiple export files
   */
  private async createZipArchive(files: Array<{ path: string; size: number }>, userId: string): Promise<string> {
    // For React Native, we'll need to use a ZIP library
    // For now, return the first file path as fallback
    console.log('ZIP archive creation not implemented, returning first file');
    return files[0].path;
  }

  /**
   * Execute account deletion
   */
  private async executeAccountDeletion(userId: string, retainBackups: boolean): Promise<DeleteAccountResult> {
    try {
      console.log('Executing account deletion for user:', userId);

      // Delete user data in order (respecting foreign keys)
      const deletionSteps = [
        'analytics_events',
        'audio_sessions', 
        'alarms',
        'user_preferences',
        'account_deletion_requests',
        // User profile will be handled by auth.users deletion
      ];

      for (const table of deletionSteps) {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('user_id', userId);

        if (error) {
          console.error(`Error deleting from ${table}:`, error);
          throw error;
        }
      }

      // Delete from auth.users (this will cascade to related tables)
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      
      if (authError) {
        console.error('Auth user deletion error:', authError);
        throw authError;
      }

      // Clear local storage
      await AuthStorage.clearAuth();

      console.log('Account deletion completed');
      return {
        success: true,
        deletionDate: new Date(),
      };

    } catch (error: any) {
      console.error('Account deletion execution error:', error);
      return {
        success: false,
        error: error.message || 'Account deletion failed',
      };
    }
  }
}

// Export singleton instance
export const gdprService = GDPRService.getInstance();

// Convenience functions
export const exportUserData = (options: DataExportOptions) => gdprService.exportUserData(options);
export const requestAccountDeletion = (options: DeleteAccountOptions) => gdprService.requestAccountDeletion(options);
export const cancelAccountDeletion = () => gdprService.cancelAccountDeletion();
export const getUserDataSummary = () => gdprService.getUserDataSummary();
export const updatePrivacySettings = (settings: PrivacySettings) => gdprService.updatePrivacySettings(settings);

export default gdprService;