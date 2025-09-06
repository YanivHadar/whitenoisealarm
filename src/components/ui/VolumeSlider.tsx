/**
 * VolumeSlider Component
 * 
 * Sleep-optimized volume control with visual feedback
 * and large touch targets for nighttime adjustments.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PanGestureHandler, State, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../providers/ThemeProvider';
import Button from './Button';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_WIDTH = SCREEN_WIDTH - 80; // Account for padding
const THUMB_SIZE = 24;
const TRACK_HEIGHT = 8;

interface VolumeSliderProps {
  value: number; // 0.0 to 1.0
  onValueChange: (value: number) => void;
  onValueChangeComplete?: (value: number) => void;
  label: string;
  showQuickSettings?: boolean;
  disabled?: boolean;
  testID?: string;
}

export const VolumeSlider: React.FC<VolumeSliderProps> = ({
  value,
  onValueChange,
  onValueChangeComplete,
  label,
  showQuickSettings = true,
  disabled = false,
  testID = 'volume-slider'
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  
  const translateX = useSharedValue(value * (SLIDER_WIDTH - THUMB_SIZE));
  const [currentValue, setCurrentValue] = useState(value);

  // Update shared value when prop changes
  React.useEffect(() => {
    translateX.value = withSpring(value * (SLIDER_WIDTH - THUMB_SIZE));
    setCurrentValue(value);
  }, [value]);

  const updateValue = useCallback((newValue: number) => {
    const clampedValue = Math.max(0, Math.min(1, newValue));
    setCurrentValue(clampedValue);
    onValueChange(clampedValue);
  }, [onValueChange]);

  const onGestureEnd = useCallback((finalValue: number) => {
    onValueChangeComplete?.(finalValue);
  }, [onValueChangeComplete]);

  // Simplified gesture handling for now - can be enhanced later with proper reanimated v3 syntax
  const handleGestureEvent = (event: any) => {
    const newX = Math.max(0, Math.min(SLIDER_WIDTH - THUMB_SIZE, event.nativeEvent.translationX + translateX.value));
    translateX.value = withSpring(newX);
    
    const newValue = newX / (SLIDER_WIDTH - THUMB_SIZE);
    updateValue(newValue);
  };

  const handleGestureEnd = () => {
    const finalValue = translateX.value / (SLIDER_WIDTH - THUMB_SIZE);
    onGestureEnd(finalValue);
  };

  const thumbAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const trackFillAnimatedStyle = useAnimatedStyle(() => {
    const fillWidth = translateX.value + THUMB_SIZE / 2;
    return {
      width: fillWidth,
    };
  });

  const formatPercentage = (val: number): string => {
    return `${Math.round(val * 100)}%`;
  };

  const setQuickValue = (quickValue: number) => {
    if (!disabled) {
      translateX.value = withSpring(quickValue * (SLIDER_WIDTH - THUMB_SIZE));
      updateValue(quickValue);
      onValueChangeComplete?.(quickValue);
    }
  };

  const getVolumeIcon = () => {
    if (currentValue === 0) return '🔇';
    if (currentValue < 0.3) return '🔈';
    if (currentValue < 0.7) return '🔉';
    return '🔊';
  };

  return (
    <View style={[styles.container, disabled && styles.disabled]} testID={testID}>
      {/* Label and Value Display */}
      <View style={styles.header}>
        <Text style={[styles.label, disabled && styles.disabledText]}>
          {label}
        </Text>
        <View style={styles.valueDisplay}>
          <Text style={[styles.volumeIcon, disabled && styles.disabledText]}>
            {getVolumeIcon()}
          </Text>
          <Text style={[styles.value, disabled && styles.disabledText]}>
            {formatPercentage(currentValue)}
          </Text>
        </View>
      </View>

      {/* Slider Track and Thumb */}
      <View style={styles.sliderContainer}>
        <View style={styles.track}>
          <Animated.View style={[styles.trackFill, trackFillAnimatedStyle]} />
        </View>
        
        <PanGestureHandler
          onGestureEvent={handleGestureEvent}
          onHandlerStateChange={({ nativeEvent }) => {
            if (nativeEvent.state === State.END) {
              handleGestureEnd();
            }
          }}
          enabled={!disabled}
          testID={`${testID}-gesture`}
        >
          <Animated.View
            style={[styles.thumb, thumbAnimatedStyle]}
            testID={`${testID}-thumb`}
          />
        </PanGestureHandler>
      </View>

      {/* Quick Setting Buttons */}
      {showQuickSettings && (
        <View style={styles.quickSettings}>
          <Button
            title="Low"
            onPress={() => setQuickValue(0.3)}
            variant={currentValue === 0.3 ? 'primary' : 'secondary'}
            size="small"
            disabled={disabled}
            style={styles.quickButton}
            testID={`${testID}-low`}
          />
          <Button
            title="Medium"
            onPress={() => setQuickValue(0.6)}
            variant={currentValue === 0.6 ? 'primary' : 'secondary'}
            size="small"
            disabled={disabled}
            style={styles.quickButton}
            testID={`${testID}-medium`}
          />
          <Button
            title="High"
            onPress={() => setQuickValue(0.9)}
            variant={currentValue === 0.9 ? 'primary' : 'secondary'}
            size="small"
            disabled={disabled}
            style={styles.quickButton}
            testID={`${testID}-high`}
          />
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    marginVertical: theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
  },
  disabled: {
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[4],
  },
  label: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  valueDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  volumeIcon: {
    fontSize: theme.fontSize.lg,
    marginRight: theme.spacing[2],
  },
  value: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
    minWidth: 40,
    textAlign: 'right',
  },
  disabledText: {
    color: theme.colors.textSecondary,
  },
  sliderContainer: {
    height: 50,
    justifyContent: 'center',
    marginBottom: theme.spacing[4],
  },
  track: {
    width: SLIDER_WIDTH,
    height: TRACK_HEIGHT,
    backgroundColor: theme.colors.border,
    borderRadius: TRACK_HEIGHT / 2,
    position: 'absolute',
    alignSelf: 'center',
  },
  trackFill: {
    height: TRACK_HEIGHT,
    backgroundColor: theme.colors.primary,
    borderRadius: TRACK_HEIGHT / 2,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: theme.colors.primary,
    position: 'absolute',
    alignSelf: 'center',
    ...theme.shadows.default,
    elevation: 4,
  },
  quickSettings: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing[4],
  },
  quickButton: {
    flex: 1,
    marginHorizontal: theme.spacing[1],
  },
});

export default VolumeSlider;