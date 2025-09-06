/**
 * Session Monitoring Dashboard Screen
 * 
 * Central dashboard for monitoring active sleep/alarm sessions with real-time progress tracking,
 * audio controls, and session statistics. Provides comprehensive session management and monitoring.
 */

import React, { useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SessionProgressBar } from '../../components/SessionProgressBar';
import { AudioControlPanel } from '../../components/AudioControlPanel';
import { useSessionProgressStore } from '../../store/session-progress-store';
import { useUserPreferencesStore } from '../../store/user-preferences-store';
import { theme } from '../../constants/theme';

export const SessionMonitoringScreen: React.FC = () => {
  const {
    activeSessionId,
    activeSession,
    progressCalculation,
    sessionMonitoring,
    isRealTimeActive,
    lastUpdate,
    crossDeviceSync,
    error,
    isLoading,
    enableRealTimeUpdates,
    disableRealTimeUpdates,
    forceProgressUpdate,
    getTimeUntilAlarm,
    getFormattedTimeRemaining,
    getSessionHealthMetrics,
    clearError,
  } = useSessionProgressStore();

  const { preferences } = useUserPreferencesStore();

  // Refresh control state
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Initialize real-time updates when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (activeSessionId && !isRealTimeActive) {
        enableRealTimeUpdates();
      }
      
      return () => {
        // Keep updates running when screen is unfocused to maintain background monitoring
      };
    }, [activeSessionId, isRealTimeActive, enableRealTimeUpdates])
  );

  // Handle pull to refresh
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await forceProgressUpdate();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [forceProgressUpdate]);

  // Handle errors with user-friendly alerts
  useEffect(() => {
    if (error) {
      Alert.alert(
        'Session Error',
        error,
        [
          { text: 'Dismiss', onPress: clearError },
          { text: 'Retry', onPress: forceProgressUpdate },
        ]
      );
    }
  }, [error, clearError, forceProgressUpdate]);

  // Memoized session stats
  const sessionStats = useMemo(() => {
    if (!progressCalculation || !activeSession) return null;

    const timeUntilAlarm = getTimeUntilAlarm();
    const healthMetrics = getSessionHealthMetrics();

    return {
      sessionType: activeSession.session_type,
      startTime: new Date(activeSession.started_at),
      elapsedTime: progressCalculation.elapsedSeconds,
      remainingTime: progressCalculation.remainingSeconds,
      timeUntilAlarm,
      progress: progressCalculation.progressPercentage,
      healthStatus: healthMetrics.status,
      healthMetrics: healthMetrics.metrics,
    };
  }, [progressCalculation, activeSession, getTimeUntilAlarm, getSessionHealthMetrics]);

  // Handle no active session state
  if (!activeSessionId || !activeSession) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDark]}
          style={styles.gradientHeader}
        >
          <Text style={styles.headerTitle}>Session Monitor</Text>
          <Text style={styles.headerSubtitle}>No active session</Text>
        </LinearGradient>
        
        <View style={styles.emptyStateContainer}>
          <Ionicons 
            name="play-circle-outline" 
            size={80} 
            color={theme.colors.textSecondary}
          />
          <Text style={styles.emptyStateTitle}>No Active Session</Text>
          <Text style={styles.emptyStateText}>
            Start an alarm or white noise session to monitor progress here
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    } else if (mins > 0) {
      return `${mins}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getSessionTypeIcon = (type: string) => {
    switch (type) {
      case 'alarm':
        return 'alarm-outline';
      case 'white_noise':
        return 'leaf-outline';
      case 'combined':
        return 'moon-outline';
      default:
        return 'play-circle-outline';
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return theme.colors.success;
      case 'warning':
        return theme.colors.warning;
      case 'error':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      
      {/* Header */}
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDark]}
        style={styles.gradientHeader}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTitleContainer}>
            <Ionicons 
              name={getSessionTypeIcon(activeSession.session_type)} 
              size={24} 
              color={theme.colors.onPrimary}
            />
            <Text style={styles.headerTitle}>Session Monitor</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            {activeSession.session_type.replace('_', ' ').toUpperCase()} SESSION
          </Text>
        </View>

        {/* Real-time Status Indicators */}
        <View style={styles.statusIndicators}>
          <View style={styles.statusIndicator}>
            <View style={[
              styles.statusDot,
              { backgroundColor: isRealTimeActive ? theme.colors.success : theme.colors.error }
            ]} />
            <Text style={styles.statusLabel}>Live</Text>
          </View>
          
          {crossDeviceSync && (
            <View style={styles.statusIndicator}>
              <Ionicons name="sync" size={16} color={theme.colors.onPrimary} />
              <Text style={styles.statusLabel}>Synced</Text>
            </View>
          )}

          {lastUpdate && (
            <Text style={styles.lastUpdateText}>
              Updated {Math.floor((Date.now() - lastUpdate.timestamp.getTime()) / 1000)}s ago
            </Text>
          )}
        </View>
      </LinearGradient>

      {/* Main Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progress</Text>
          <SessionProgressBar
            height={12}
            showTimeLabels={true}
            showPercentage={true}
            showEstimatedEndTime={true}
            animated={true}
          />
          
          {/* Time Until Alarm (if applicable) */}
          {sessionStats?.timeUntilAlarm && (
            <View style={styles.alarmCountdown}>
              <Ionicons name="alarm-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.alarmCountdownText}>
                Alarm in: {formatTime(Math.floor(sessionStats.timeUntilAlarm / 1000))}
              </Text>
            </View>
          )}
        </View>

        {/* Audio Controls Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Audio Controls</Text>
          <AudioControlPanel
            onControlAction={(action, value) => {
              console.log(`Control action: ${action}`, value);
            }}
          />
        </View>

        {/* Session Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Session Statistics</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Started</Text>
                <Text style={styles.statValue}>
                  {sessionStats?.startTime.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Elapsed</Text>
                <Text style={styles.statValue}>
                  {sessionStats ? formatTime(sessionStats.elapsedTime) : '--'}
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Remaining</Text>
                <Text style={styles.statValue}>
                  {getFormattedTimeRemaining()}
                </Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Progress</Text>
                <Text style={styles.statValue}>
                  {Math.round(progressCalculation?.progressPercentage || 0)}%
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Health</Text>
                <Text style={[
                  styles.statValue,
                  { color: getHealthStatusColor(sessionStats?.healthStatus || 'unknown') }
                ]}>
                  {sessionStats?.healthStatus || 'Unknown'}
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Type</Text>
                <Text style={styles.statValue}>
                  {activeSession.session_type.replace('_', ' ')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* System Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Status</Text>
          <View style={styles.systemStatusContainer}>
            <View style={styles.systemStatusItem}>
              <Ionicons 
                name="wifi-outline" 
                size={20} 
                color={crossDeviceSync ? theme.colors.success : theme.colors.error}
              />
              <Text style={styles.systemStatusLabel}>Real-time Sync</Text>
              <Text style={[
                styles.systemStatusValue,
                { color: crossDeviceSync ? theme.colors.success : theme.colors.error }
              ]}>
                {crossDeviceSync ? 'Active' : 'Inactive'}
              </Text>
            </View>

            <View style={styles.systemStatusItem}>
              <Ionicons 
                name="phone-portrait-outline" 
                size={20} 
                color={sessionMonitoring?.backgroundAudioActive ? theme.colors.success : theme.colors.warning}
              />
              <Text style={styles.systemStatusLabel}>Background Audio</Text>
              <Text style={[
                styles.systemStatusValue,
                { color: sessionMonitoring?.backgroundAudioActive ? theme.colors.success : theme.colors.warning }
              ]}>
                {sessionMonitoring?.backgroundAudioActive ? 'Active' : 'Inactive'}
              </Text>
            </View>

            <View style={styles.systemStatusItem}>
              <Ionicons 
                name="battery-charging-outline" 
                size={20} 
                color={sessionMonitoring?.batteryOptimized ? theme.colors.success : theme.colors.warning}
              />
              <Text style={styles.systemStatusLabel}>Battery Optimized</Text>
              <Text style={[
                styles.systemStatusValue,
                { color: sessionMonitoring?.batteryOptimized ? theme.colors.success : theme.colors.warning }
              ]}>
                {sessionMonitoring?.batteryOptimized ? 'Yes' : 'No'}
              </Text>
            </View>
          </View>
        </View>

        {/* Debug Info (Development Only) */}
        {__DEV__ && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Debug Info</Text>
            <View style={styles.debugContainer}>
              <Text style={styles.debugText}>Session ID: {activeSessionId}</Text>
              <Text style={styles.debugText}>
                Real-time Active: {isRealTimeActive ? 'Yes' : 'No'}
              </Text>
              <Text style={styles.debugText}>
                Last Update: {lastUpdate?.timestamp.toISOString() || 'Never'}
              </Text>
              <Text style={styles.debugText}>
                Health Metrics: {JSON.stringify(sessionStats?.healthMetrics || {}, null, 2)}
              </Text>
            </View>
          </View>
        )}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  
  gradientHeader: {
    paddingTop: Platform.OS === 'ios' ? 0 : 24,
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  
  headerContent: {
    marginBottom: theme.spacing.md,
  },
  
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  
  headerTitle: {
    fontSize: theme.typography.sizes.xl,
    fontFamily: theme.typography.fonts.bold,
    color: theme.colors.onPrimary,
    marginLeft: theme.spacing.sm,
  },
  
  headerSubtitle: {
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.medium,
    color: theme.colors.onPrimary,
    opacity: 0.8,
  },
  
  statusIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: theme.spacing.xs,
  },
  
  statusLabel: {
    fontSize: theme.typography.sizes.xs,
    fontFamily: theme.typography.fonts.medium,
    color: theme.colors.onPrimary,
    marginRight: theme.spacing.md,
  },
  
  lastUpdateText: {
    fontSize: theme.typography.sizes.xs,
    fontFamily: theme.typography.fonts.regular,
    color: theme.colors.onPrimary,
    opacity: 0.7,
  },
  
  scrollView: {
    flex: 1,
  },
  
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  
  section: {
    marginBottom: theme.spacing.xl,
  },
  
  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontFamily: theme.typography.fonts.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  
  alarmCountdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primarySurface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.md,
  },
  
  alarmCountdownText: {
    fontSize: theme.typography.sizes.md,
    fontFamily: theme.typography.fonts.bold,
    color: theme.colors.primary,
    marginLeft: theme.spacing.sm,
  },
  
  statsContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  
  statLabel: {
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.medium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  
  statValue: {
    fontSize: theme.typography.sizes.lg,
    fontFamily: theme.typography.fonts.bold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  
  systemStatusContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  
  systemStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  
  systemStatusLabel: {
    fontSize: theme.typography.sizes.md,
    fontFamily: theme.typography.fonts.medium,
    color: theme.colors.textPrimary,
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  
  systemStatusValue: {
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.bold,
  },
  
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  
  emptyStateTitle: {
    fontSize: theme.typography.sizes.xl,
    fontFamily: theme.typography.fonts.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  
  emptyStateText: {
    fontSize: theme.typography.sizes.md,
    fontFamily: theme.typography.fonts.regular,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  
  debugContainer: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  
  debugText: {
    fontSize: theme.typography.sizes.xs,
    fontFamily: theme.typography.fonts.mono || theme.typography.fonts.regular,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  
  bottomSpacing: {
    height: theme.spacing.xl,
  },
});