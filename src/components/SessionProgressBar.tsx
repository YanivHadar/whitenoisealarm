/**
 * Session Progress Bar Component
 * 
 * Real-time progress bar that updates every second during active sessions.
 * Shows elapsed time, progress percentage, and estimated completion time.
 * Integrates with session progress store for real-time updates.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSessionProgressStore } from '../store/session-progress-store';
import { theme } from '../constants/theme';

export interface SessionProgressBarProps {
  /** Height of the progress bar */
  height?: number;
  /** Show time labels above and below */
  showTimeLabels?: boolean;
  /** Show percentage text */
  showPercentage?: boolean;
  /** Animate progress changes */
  animated?: boolean;
  /** Custom colors for the progress gradient */
  colors?: [string, string, ...string[]];
  /** Show estimated end time */
  showEstimatedEndTime?: boolean;
}

export const SessionProgressBar: React.FC<SessionProgressBarProps> = ({
  height = 8,
  showTimeLabels = true,
  showPercentage = true,
  animated = true,
  colors = [theme.colors.primary, theme.colors.accent],
  showEstimatedEndTime = false,
}) => {
  const {
    progressCalculation,
    sessionMonitoring,
    getFormattedTimeRemaining,
    error,
  } = useSessionProgressStore();

  // Local animation state
  const [progressAnimation] = useState(new Animated.Value(0));
  const [pulseAnimation] = useState(new Animated.Value(1));

  // Update progress animation when calculation changes
  useEffect(() => {
    if (!progressCalculation) return;

    const targetProgress = progressCalculation.progressPercentage / 100;

    if (animated) {
      Animated.timing(progressAnimation, {
        toValue: targetProgress,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      progressAnimation.setValue(targetProgress);
    }
  }, [progressCalculation?.progressPercentage, animated, progressAnimation]);

  // Pulse animation for active sessions
  useEffect(() => {
    if (sessionMonitoring?.currentStatus === 'active') {
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();

      return () => pulseLoop.stop();
    } else {
      pulseAnimation.setValue(1);
    }
  }, [sessionMonitoring?.currentStatus, pulseAnimation]);

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Unable to load progress</Text>
      </View>
    );
  }

  if (!progressCalculation || !sessionMonitoring) {
    return (
      <View style={styles.placeholderContainer}>
        <Text style={styles.placeholderText}>No active session</Text>
      </View>
    );
  }

  const {
    progressPercentage,
    elapsedSeconds,
    remainingSeconds,
    totalDurationSeconds,
    estimatedEndTime,
  } = progressCalculation;

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
  };

  const getStatusColor = () => {
    switch (sessionMonitoring.currentStatus) {
      case 'active':
        return colors[0];
      case 'paused':
        return theme.colors.warning;
      case 'error':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  return (
    <Animated.View 
      style={[
        styles.container,
        { transform: [{ scale: pulseAnimation }] }
      ]}
    >
      {/* Time Labels */}
      {showTimeLabels && (
        <View style={styles.timeLabelsContainer}>
          <Text style={styles.timeLabel}>
            {formatTime(elapsedSeconds)}
          </Text>
          <Text style={[styles.timeLabel, styles.remainingTime]}>
            -{formatTime(remainingSeconds)}
          </Text>
        </View>
      )}

      {/* Progress Bar Container */}
      <View style={[styles.progressBarContainer, { height }]}>
        {/* Background */}
        <View style={[styles.progressBackground, { height }]} />
        
        {/* Progress Fill */}
        <Animated.View
          style={[
            styles.progressFillContainer,
            {
              height,
              width: progressAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        >
          <LinearGradient
            colors={colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.progressFill}
          />
        </Animated.View>

        {/* Status Indicator */}
        <View
          style={[
            styles.statusIndicator,
            {
              backgroundColor: getStatusColor(),
              opacity: sessionMonitoring.currentStatus === 'active' ? 1 : 0.6,
            },
          ]}
        />
      </View>

      {/* Bottom Row */}
      <View style={styles.bottomRow}>
        {/* Percentage */}
        {showPercentage && (
          <Text style={styles.percentageText}>
            {Math.round(progressPercentage)}%
          </Text>
        )}

        {/* Status */}
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {sessionMonitoring.currentStatus.charAt(0).toUpperCase() + 
           sessionMonitoring.currentStatus.slice(1)}
        </Text>

        {/* Estimated End Time */}
        {showEstimatedEndTime && (
          <Text style={styles.estimatedTime}>
            Ends: {estimatedEndTime.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })}
          </Text>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: theme.spacing.sm,
  },
  
  errorContainer: {
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  
  errorText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.error,
    fontFamily: theme.typography.fonts.medium,
  },
  
  placeholderContainer: {
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  
  placeholderText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fonts.regular,
  },
  
  timeLabelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  
  timeLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fonts.medium,
  },
  
  remainingTime: {
    color: theme.colors.textSecondary,
  },
  
  progressBarContainer: {
    position: 'relative',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: theme.spacing.xs,
  },
  
  progressBackground: {
    backgroundColor: theme.colors.surfaceVariant,
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    borderRadius: 4,
  },
  
  progressFillContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: 4,
    overflow: 'hidden',
  },
  
  progressFill: {
    flex: 1,
  },
  
  statusIndicator: {
    position: 'absolute',
    right: -2,
    top: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  
  percentageText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
    fontFamily: theme.typography.fonts.medium,
    fontVariant: ['tabular-nums'],
  },
  
  statusText: {
    fontSize: theme.typography.sizes.xs,
    fontFamily: theme.typography.fonts.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  estimatedTime: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fonts.regular,
  },
});