/**
 * Floating Session Monitor
 * 
 * A floating mini-player that appears when a session is active,
 * providing quick access to session controls and navigation to
 * the full session monitoring screen.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { PanGestureHandler, State, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

// Store imports
import { useSessionProgressStore } from '../store/session-progress-store';
import { useTheme } from './providers/ThemeProvider';

// Hook imports
import { useSessionProgress } from '../hooks/useSessionProgress';

// Type imports
import type { NavigationProp } from '../types/navigation';

export interface FloatingSessionMonitorProps {
  /** Initial position from top */
  initialTop?: number;
  /** Initial position from right */
  initialRight?: number;
  /** Whether the monitor can be dragged */
  draggable?: boolean;
  /** Callback when monitor is tapped */
  onTap?: () => void;
  /** Callback when monitor is dismissed */
  onDismiss?: () => void;
}

export const FloatingSessionMonitor: React.FC<FloatingSessionMonitorProps> = ({
  initialTop = 100,
  initialRight = 20,
  draggable = true,
  onTap,
  onDismiss,
}) => {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp<'Main'>>();
  const insets = useSafeAreaInsets();

  // Session progress state
  const {
    isSessionActive,
    activeSessionId,
    sessionType,
    progressPercentage,
    formattedTimeRemaining,
    currentStatus,
    audioPlaying,
    canPause,
    canResume,
  } = useSessionProgress();

  // Animation states
  const [position] = useState(new Animated.ValueXY({ x: initialRight, y: initialTop }));
  const [scale] = useState(new Animated.Value(1));
  const [opacity] = useState(new Animated.Value(0));

  // Local state
  const [isDragging, setIsDragging] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Show/hide animation
  useEffect(() => {
    if (isSessionActive && !isVisible) {
      setIsVisible(true);
      Animated.spring(opacity, {
        toValue: 1,
        useNativeDriver: true,
        tension: 150,
        friction: 8,
      }).start();
    } else if (!isSessionActive && isVisible) {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setIsVisible(false);
      });
    }
  }, [isSessionActive, isVisible, opacity]);

  // Handle pan gesture
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: position.x, translationY: position.y } }],
    { useNativeDriver: false }
  );

  const onHandlerStateChange = useCallback(
    (event: PanGestureHandlerGestureEvent) => {
      const { state, translationX, translationY } = event.nativeEvent;

      switch (state) {
        case State.BEGAN:
          setIsDragging(true);
          Animated.spring(scale, {
            toValue: 1.1,
            useNativeDriver: true,
          }).start();
          break;

        case State.END:
          setIsDragging(false);
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
          }).start();

          // Snap to edges
          const screenWidth = 400; // Approximate screen width
          const snapToRight = translationX > screenWidth / 2;
          
          Animated.spring(position, {
            toValue: {
              x: snapToRight ? screenWidth - 100 : 20,
              y: Math.max(insets.top + 20, Math.min(translationY, 600)),
            },
            useNativeDriver: false,
          }).start();
          break;
      }
    },
    [scale, position, insets.top]
  );

  // Handle tap
  const handleTap = useCallback(() => {
    if (isDragging) return;

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Custom tap handler
    if (onTap) {
      onTap();
      return;
    }

    // Navigate to session monitoring screen
    if (activeSessionId) {
      // Try to navigate within current stack first
      try {
        (navigation as any).navigate('SessionMonitoring', {
          sessionId: activeSessionId,
        });
      } catch (error) {
        // Fallback: navigate to alarm stack if we're not in the right context
        navigation.navigate('Main', {
          screen: 'Alarms',
          params: {
            screen: 'SessionMonitoring',
            params: { sessionId: activeSessionId },
          },
        });
      }
    }
  }, [isDragging, onTap, activeSessionId, navigation]);

  // Handle play/pause
  const handlePlayPause = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { pauseSession, resumeSession } = useSessionProgressStore.getState();
    
    if (audioPlaying && canPause) {
      await pauseSession();
    } else if (!audioPlaying && canResume) {
      await resumeSession();
    }
  }, [audioPlaying, canPause, canResume]);

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (onDismiss) {
      onDismiss();
    } else {
      // Just hide the floating monitor but keep session active
      setIsVisible(false);
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [onDismiss, opacity]);

  // Don't render if no session is active
  if (!isSessionActive || !isVisible) {
    return null;
  }

  const sessionTypeIcon = sessionType === 'alarm' ? 'alarm' : 'musical-notes';
  const statusColor = currentStatus === 'active' ? theme.colors.primary : theme.colors.warning;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateX: position.x },
            { translateY: position.y },
            { scale },
          ],
          opacity,
        },
      ]}
    >
      <PanGestureHandler
        onGestureEvent={draggable ? onGestureEvent : undefined}
        onHandlerStateChange={draggable ? onHandlerStateChange : undefined}
        enabled={draggable}
      >
        <Animated.View style={styles.panContainer}>
          <BlurView
            intensity={80}
            tint={theme.colors.background === '#0A0D14' ? 'dark' : 'light'}
            style={styles.blurContainer}
          >
            <LinearGradient
              colors={[
                `${theme.colors.primary}20`,
                `${theme.colors.primaryDark}15`,
              ]}
              style={styles.gradient}
            >
              <TouchableOpacity
                style={styles.content}
                onPress={handleTap}
                activeOpacity={0.8}
              >
                {/* Dismiss button */}
                <TouchableOpacity
                  style={[styles.dismissButton, { backgroundColor: theme.colors.surface }]}
                  onPress={handleDismiss}
                >
                  <Ionicons
                    name="close"
                    size={12}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>

                {/* Session icon and type */}
                <View style={styles.iconContainer}>
                  <Ionicons
                    name={sessionTypeIcon}
                    size={20}
                    color={statusColor}
                  />
                </View>

                {/* Progress and time */}
                <View style={styles.infoContainer}>
                  <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          backgroundColor: statusColor,
                          width: `${Math.max(0, Math.min(100, progressPercentage))}%`,
                        },
                      ]}
                    />
                  </View>
                  
                  <Text style={[styles.timeText, { color: theme.colors.text }]}>
                    {formattedTimeRemaining}
                  </Text>
                </View>

                {/* Play/pause button */}
                {(canPause || canResume) && (
                  <TouchableOpacity
                    style={[styles.playPauseButton, { backgroundColor: statusColor }]}
                    onPress={handlePlayPause}
                  >
                    <Ionicons
                      name={audioPlaying ? 'pause' : 'play'}
                      size={16}
                      color="white"
                    />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </LinearGradient>
          </BlurView>
        </Animated.View>
      </PanGestureHandler>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 1000,
    elevation: 1000,
  },
  panContainer: {
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  blurContainer: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  gradient: {
    borderRadius: 25,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 180,
    position: 'relative',
  },
  dismissButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  iconContainer: {
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
    marginRight: 8,
  },
  progressBar: {
    height: 3,
    borderRadius: 1.5,
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  playPauseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FloatingSessionMonitor;