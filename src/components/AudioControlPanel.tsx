/**
 * Audio Control Panel Component
 * 
 * Provides real-time audio playback controls during active sessions.
 * Includes play/pause/stop buttons, volume sliders, and audio status indicators.
 * Integrates with session progress store and background audio processor.
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  Animated,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { useSessionProgressStore } from '../store/session-progress-store';
import { theme } from '../constants/theme';

export interface AudioControlPanelProps {
  /** Show compact controls for smaller spaces */
  compact?: boolean;
  /** Disable certain controls */
  disabledControls?: ('pause' | 'resume' | 'stop' | 'volume' | 'whiteNoiseVolume')[];
  /** Custom styling */
  style?: any;
  /** Callback for control actions */
  onControlAction?: (action: string, value?: any) => void;
}

export const AudioControlPanel: React.FC<AudioControlPanelProps> = ({
  compact = false,
  disabledControls = [],
  style,
  onControlAction,
}) => {
  const {
    sessionMonitoring,
    pauseSession,
    resumeSession,
    updateSessionVolume,
    updateWhiteNoiseVolume,
    stopSessionTracking,
    isUpdating,
    error,
  } = useSessionProgressStore();

  // Local state for volume sliders (for smooth UX)
  const [localVolume, setLocalVolume] = useState(0.7);
  const [localWhiteNoiseVolume, setLocalWhiteNoiseVolume] = useState(0.5);
  const [volumeUpdateTimeout, setVolumeUpdateTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Animation values
  const [buttonScale] = useState(new Animated.Value(1));
  const [pulseAnimation] = useState(new Animated.Value(1));

  // Initialize local volume states from store
  useEffect(() => {
    if (sessionMonitoring) {
      setLocalVolume(sessionMonitoring.volume);
      setLocalWhiteNoiseVolume(sessionMonitoring.whiteNoiseVolume);
    }
  }, [sessionMonitoring?.volume, sessionMonitoring?.whiteNoiseVolume]);

  // Pulse animation for active playback
  useEffect(() => {
    if (sessionMonitoring?.audioPlaying) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnimation.setValue(1);
    }
  }, [sessionMonitoring?.audioPlaying, pulseAnimation]);

  if (!sessionMonitoring) {
    return (
      <View style={[styles.container, styles.emptyState, style]}>
        <Text style={styles.emptyStateText}>No active session</Text>
      </View>
    );
  }

  const handleButtonPress = (callback: () => void) => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    Vibration.vibrate(50); // Haptic feedback
    callback();
  };

  const handlePause = async () => {
    if (disabledControls.includes('pause') || !sessionMonitoring.canPause) return;
    
    handleButtonPress(async () => {
      const result = await pauseSession();
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to pause session');
      }
      onControlAction?.('pause');
    });
  };

  const handleResume = async () => {
    if (disabledControls.includes('resume') || !sessionMonitoring.canResume) return;
    
    handleButtonPress(async () => {
      const result = await resumeSession();
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to resume session');
      }
      onControlAction?.('resume');
    });
  };

  const handleStop = async () => {
    if (disabledControls.includes('stop') || !sessionMonitoring.canStop) return;
    
    Alert.alert(
      'Stop Session',
      'Are you sure you want to stop the current session?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Stop', 
          style: 'destructive',
          onPress: () => {
            handleButtonPress(async () => {
              await stopSessionTracking();
              onControlAction?.('stop');
            });
          }
        },
      ]
    );
  };

  const handleVolumeChange = (volume: number) => {
    if (disabledControls.includes('volume')) return;
    
    setLocalVolume(volume);
    
    // Debounce server updates
    if (volumeUpdateTimeout) {
      clearTimeout(volumeUpdateTimeout);
    }
    
    const timeout = setTimeout(async () => {
      const result = await updateSessionVolume(volume);
      if (!result.success) {
        console.error('Failed to update volume:', result.error);
        // Revert local state on error
        setLocalVolume(sessionMonitoring.volume);
      }
    }, 300);
    
    setVolumeUpdateTimeout(timeout);
    onControlAction?.('volume', volume);
  };

  const handleWhiteNoiseVolumeChange = (volume: number) => {
    if (disabledControls.includes('whiteNoiseVolume')) return;
    
    setLocalWhiteNoiseVolume(volume);
    
    // Debounce server updates (reuse same timeout for simplicity)
    if (volumeUpdateTimeout) {
      clearTimeout(volumeUpdateTimeout);
    }
    
    const timeout = setTimeout(async () => {
      const result = await updateWhiteNoiseVolume(volume);
      if (!result.success) {
        console.error('Failed to update white noise volume:', result.error);
        // Revert local state on error
        setLocalWhiteNoiseVolume(sessionMonitoring.whiteNoiseVolume);
      }
    }, 300);
    
    setVolumeUpdateTimeout(timeout);
    onControlAction?.('whiteNoiseVolume', volume);
  };

  const getPlayPauseButton = () => {
    const isPlaying = sessionMonitoring.audioPlaying;
    const canPause = sessionMonitoring.canPause && !disabledControls.includes('pause');
    const canResume = sessionMonitoring.canResume && !disabledControls.includes('resume');
    
    if (isPlaying && canPause) {
      return (
        <TouchableOpacity
          style={[styles.controlButton, styles.pauseButton]}
          onPress={handlePause}
          disabled={isUpdating}
        >
          <Animated.View
            style={{
              transform: [{ scale: buttonScale }, { scale: pulseAnimation }]
            }}
          >
            <Ionicons 
              name="pause" 
              size={compact ? 24 : 32} 
              color={theme.colors.surface}
            />
          </Animated.View>
        </TouchableOpacity>
      );
    } else if (!isPlaying && canResume) {
      return (
        <TouchableOpacity
          style={[styles.controlButton, styles.playButton]}
          onPress={handleResume}
          disabled={isUpdating}
        >
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <Ionicons 
              name="play" 
              size={compact ? 24 : 32} 
              color={theme.colors.surface}
            />
          </Animated.View>
        </TouchableOpacity>
      );
    } else {
      return (
        <View style={[styles.controlButton, styles.disabledButton]}>
          <Ionicons 
            name="play" 
            size={compact ? 24 : 32} 
            color={theme.colors.textSecondary}
          />
        </View>
      );
    }
  };

  const formatVolumePercentage = (volume: number) => {
    return `${Math.round(volume * 100)}%`;
  };

  return (
    <View style={[styles.container, compact && styles.compactContainer, style]}>
      {/* Error Display */}
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={16} color={theme.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Control Buttons */}
      <View style={[styles.buttonRow, compact && styles.compactButtonRow]}>
        {/* Play/Pause Button */}
        {getPlayPauseButton()}

        {/* Stop Button */}
        {sessionMonitoring.canStop && !disabledControls.includes('stop') && (
          <TouchableOpacity
            style={[styles.controlButton, styles.stopButton]}
            onPress={handleStop}
            disabled={isUpdating}
          >
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <Ionicons 
                name="stop" 
                size={compact ? 20 : 24} 
                color={theme.colors.surface}
              />
            </Animated.View>
          </TouchableOpacity>
        )}

        {/* Status Indicator */}
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusDot,
            {
              backgroundColor: sessionMonitoring.audioPlaying 
                ? theme.colors.success 
                : theme.colors.warning
            }
          ]} />
          <Text style={styles.statusText}>
            {sessionMonitoring.currentStatus}
          </Text>
        </View>
      </View>

      {/* Volume Controls */}
      {!compact && (
        <>
          {/* Main Volume */}
          <View style={styles.volumeControl}>
            <View style={styles.volumeHeader}>
              <Ionicons 
                name="volume-medium-outline" 
                size={20} 
                color={theme.colors.textSecondary}
              />
              <Text style={styles.volumeLabel}>Volume</Text>
              <Text style={styles.volumeValue}>
                {formatVolumePercentage(localVolume)}
              </Text>
            </View>
            <Slider
              style={styles.volumeSlider}
              value={localVolume}
              onValueChange={handleVolumeChange}
              minimumValue={0}
              maximumValue={1}
              step={0.01}
              minimumTrackTintColor={theme.colors.primary}
              maximumTrackTintColor={theme.colors.surfaceVariant}
              thumbTintColor={theme.colors.primary}
              disabled={disabledControls.includes('volume')}
            />
          </View>

          {/* White Noise Volume */}
          <View style={styles.volumeControl}>
            <View style={styles.volumeHeader}>
              <Ionicons 
                name="leaf-outline" 
                size={20} 
                color={theme.colors.textSecondary}
              />
              <Text style={styles.volumeLabel}>White Noise</Text>
              <Text style={styles.volumeValue}>
                {formatVolumePercentage(localWhiteNoiseVolume)}
              </Text>
            </View>
            <Slider
              style={styles.volumeSlider}
              value={localWhiteNoiseVolume}
              onValueChange={handleWhiteNoiseVolumeChange}
              minimumValue={0}
              maximumValue={1}
              step={0.01}
              minimumTrackTintColor={theme.colors.accent}
              maximumTrackTintColor={theme.colors.surfaceVariant}
              thumbTintColor={theme.colors.primary}
              disabled={disabledControls.includes('whiteNoiseVolume')}
            />
          </View>
        </>
      )}

      {/* Background Status Indicators */}
      <View style={styles.backgroundStatusRow}>
        <View style={styles.backgroundStatusItem}>
          <Ionicons 
            name="phone-portrait-outline" 
            size={16} 
            color={sessionMonitoring.backgroundAudioActive ? theme.colors.success : theme.colors.textSecondary}
          />
          <Text style={[
            styles.backgroundStatusText,
            { color: sessionMonitoring.backgroundAudioActive ? theme.colors.success : theme.colors.textSecondary }
          ]}>
            Background Audio
          </Text>
        </View>

        <View style={styles.backgroundStatusItem}>
          <Ionicons 
            name="battery-charging-outline" 
            size={16} 
            color={sessionMonitoring.batteryOptimized ? theme.colors.success : theme.colors.warning}
          />
          <Text style={[
            styles.backgroundStatusText,
            { color: sessionMonitoring.batteryOptimized ? theme.colors.success : theme.colors.warning }
          ]}>
            Optimized
          </Text>
        </View>
      </View>

      {/* Loading Overlay */}
      {isUpdating && (
        <View style={styles.loadingOverlay}>
          <Animated.View
            style={[
              styles.loadingSpinner,
              {
                transform: [{ rotate: '0deg' }] // Would need actual spinner animation
              }
            ]}
          >
            <Ionicons name="refresh" size={24} color={theme.colors.primary} />
          </Animated.View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  
  compactContainer: {
    padding: theme.spacing.md,
  },
  
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  
  emptyStateText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fonts.medium,
  },
  
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.errorSurface,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  
  errorText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.error,
    fontFamily: theme.typography.fonts.medium,
    marginLeft: theme.spacing.xs,
    flex: 1,
  },
  
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  
  compactButtonRow: {
    marginBottom: theme.spacing.md,
  },
  
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: theme.spacing.sm,
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  
  playButton: {
    backgroundColor: theme.colors.success,
  },
  
  pauseButton: {
    backgroundColor: theme.colors.warning,
  },
  
  stopButton: {
    backgroundColor: theme.colors.error,
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  
  disabledButton: {
    backgroundColor: theme.colors.surfaceVariant,
  },
  
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: theme.spacing.lg,
  },
  
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: theme.spacing.xs,
  },
  
  statusText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fonts.medium,
    textTransform: 'capitalize',
  },
  
  volumeControl: {
    marginBottom: theme.spacing.lg,
  },
  
  volumeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  
  volumeLabel: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fonts.medium,
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  
  volumeValue: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fonts.medium,
    fontVariant: ['tabular-nums'],
  },
  
  volumeSlider: {
    height: 40,
  },
  
  sliderThumb: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  
  backgroundStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  
  backgroundStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  backgroundStatusText: {
    fontSize: theme.typography.sizes.xs,
    fontFamily: theme.typography.fonts.medium,
    marginLeft: theme.spacing.xs,
  },
  
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.lg,
  },
  
  loadingSpinner: {
    padding: theme.spacing.md,
  },
});