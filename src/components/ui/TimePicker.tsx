/**
 * TimePicker Component
 * 
 * Sleep-optimized time picker with platform-native styling
 * and large touch targets for nighttime usage.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../providers/ThemeProvider';

interface TimePickerProps {
  value: string; // HH:MM format
  onTimeChange: (time: string) => void;
  disabled?: boolean;
  testID?: string;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onTimeChange,
  disabled = false,
  testID = 'time-picker'
}) => {
  const { theme } = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const styles = createStyles(theme);

  // Convert HH:MM string to Date object
  const stringToDate = (timeString: string): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  // Convert Date object to HH:MM string
  const dateToString = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Format time for display (12-hour format)
  const formatTimeDisplay = (timeString: string): string => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const isPM = hours >= 12;
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const period = isPM ? 'PM' : 'AM';
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    
    if (selectedDate) {
      const timeString = dateToString(selectedDate);
      onTimeChange(timeString);
    }
  };

  const handlePress = () => {
    if (!disabled) {
      setShowPicker(true);
    }
  };

  return (
    <View style={styles.container} testID={testID}>
      <TouchableOpacity 
        style={[styles.timeDisplay, disabled && styles.disabled]}
        onPress={handlePress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Alarm time: ${formatTimeDisplay(value)}`}
        accessibilityHint="Double tap to change the alarm time"
        testID={`${testID}-button`}
      >
        <Text style={[styles.timeText, disabled && styles.disabledText]}>
          {formatTimeDisplay(value)}
        </Text>
        <Text style={[styles.timeSubtext, disabled && styles.disabledText]}>
          Tap to change time
        </Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={stringToDate(value)}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
          style={Platform.OS === 'ios' ? styles.iosPicker : undefined}
          testID={`${testID}-native`}
        />
      )}
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    marginVertical: theme.spacing[2],
  },
  timeDisplay: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[6],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 120, // Large touch target for nighttime use
    ...theme.shadows.default,
  },
  timeText: {
    fontSize: theme.fontSize['4xl'],
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing[1],
  },
  timeSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
  },
  disabled: {
    backgroundColor: theme.colors.disabled,
    opacity: 0.6,
  },
  disabledText: {
    color: theme.colors.textSecondary,
  },
  iosPicker: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing[4],
  },
});

export default TimePicker;