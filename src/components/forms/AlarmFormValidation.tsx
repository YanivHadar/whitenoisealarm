/**
 * AlarmFormValidation Component
 * 
 * Comprehensive form validation with real-time feedback
 * and sleep-optimized error messaging.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import { AlarmFormData, AlarmValidationResult, AlarmValidationError } from '../../types/alarm';

interface AlarmFormValidationProps {
  formData: Partial<AlarmFormData>;
  validationResult?: AlarmValidationResult;
  showAllErrors?: boolean;
  testID?: string;
}

export const validateAlarmForm = (formData: Partial<AlarmFormData>): AlarmValidationResult => {
  const errors: AlarmValidationError[] = [];
  
  // Time validation
  if (!formData.time || !isValidTimeFormat(formData.time)) {
    errors.push({
      field: 'time',
      code: 'INVALID_TIME_FORMAT',
      message: 'Please select a valid alarm time'
    });
  }

  // Name validation
  if (formData.name && formData.name.length > 50) {
    errors.push({
      field: 'name',
      code: 'NAME_TOO_LONG',
      message: 'Alarm name must be 50 characters or less'
    });
  }

  // Volume validation
  if (formData.volume !== undefined && (formData.volume < 0 || formData.volume > 1)) {
    errors.push({
      field: 'volume',
      code: 'INVALID_VOLUME_RANGE',
      message: 'Volume must be between 0% and 100%'
    });
  }

  if (formData.white_noise_volume !== undefined && 
      (formData.white_noise_volume < 0 || formData.white_noise_volume > 1)) {
    errors.push({
      field: 'white_noise_volume',
      code: 'INVALID_WHITE_NOISE_VOLUME_RANGE',
      message: 'White noise volume must be between 0% and 100%'
    });
  }

  // Repeat pattern validation
  if (formData.repeat_pattern === 'custom') {
    if (!formData.repeat_days || formData.repeat_days.length === 0) {
      errors.push({
        field: 'repeat_days',
        code: 'NO_CUSTOM_DAYS_SELECTED',
        message: 'Please select at least one day for custom repeat pattern'
      });
    }

    if (formData.repeat_days && formData.repeat_days.some(day => day < 0 || day > 6)) {
      errors.push({
        field: 'repeat_days',
        code: 'INVALID_DAY_VALUES',
        message: 'Invalid day values in repeat pattern'
      });
    }
  }

  // Snooze validation
  if (formData.snooze_enabled) {
    if (formData.snooze_duration !== undefined && 
        (formData.snooze_duration < 1 || formData.snooze_duration > 30)) {
      errors.push({
        field: 'snooze_duration',
        code: 'INVALID_SNOOZE_DURATION',
        message: 'Snooze duration must be between 1 and 30 minutes'
      });
    }

    if (formData.snooze_count_limit !== undefined && 
        (formData.snooze_count_limit < 1 || formData.snooze_count_limit > 10)) {
      errors.push({
        field: 'snooze_count_limit',
        code: 'INVALID_SNOOZE_LIMIT',
        message: 'Snooze limit must be between 1 and 10 times'
      });
    }
  }

  // White noise validation
  if (formData.white_noise_enabled && !formData.white_noise_file_url) {
    errors.push({
      field: 'white_noise_file_url',
      code: 'NO_WHITE_NOISE_SELECTED',
      message: 'Please select a white noise sound'
    });
  }

  if (formData.white_noise_duration !== undefined && formData.white_noise_duration !== null) {
    if (formData.white_noise_duration < 5 || formData.white_noise_duration > 720) {
      errors.push({
        field: 'white_noise_duration',
        code: 'INVALID_WHITE_NOISE_DURATION',
        message: 'White noise duration must be between 5 minutes and 12 hours'
      });
    }
  }

  // Fade duration validation
  if (formData.fade_in_duration !== undefined && 
      (formData.fade_in_duration < 0 || formData.fade_in_duration > 60)) {
    errors.push({
      field: 'fade_in_duration',
      code: 'INVALID_FADE_IN_DURATION',
      message: 'Fade in duration must be between 0 and 60 seconds'
    });
  }

  if (formData.fade_out_duration !== undefined && 
      (formData.fade_out_duration < 0 || formData.fade_out_duration > 60)) {
    errors.push({
      field: 'fade_out_duration',
      code: 'INVALID_FADE_OUT_DURATION',
      message: 'Fade out duration must be between 0 and 60 seconds'
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: []
  };
};

const isValidTimeFormat = (time: string): boolean => {
  const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
  return timeRegex.test(time);
};

export const AlarmFormValidation: React.FC<AlarmFormValidationProps> = ({
  formData,
  validationResult,
  showAllErrors = false,
  testID = 'alarm-form-validation'
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // Use provided validation result or compute it
  const validation = validationResult || validateAlarmForm(formData);

  // Filter errors to show
  const errorsToShow = showAllErrors 
    ? validation.errors 
    : validation.errors.filter(error => {
        // Show errors only for fields that have been touched/have values
        const fieldValue = formData[error.field];
        return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
      });

  if (errorsToShow.length === 0) {
    return null;
  }

  const getErrorIcon = (code: string): string => {
    switch (code) {
      case 'INVALID_TIME_FORMAT':
        return '⏰';
      case 'NAME_TOO_LONG':
        return '✏️';
      case 'INVALID_VOLUME_RANGE':
      case 'INVALID_WHITE_NOISE_VOLUME_RANGE':
        return '🔊';
      case 'NO_CUSTOM_DAYS_SELECTED':
      case 'INVALID_DAY_VALUES':
        return '📅';
      case 'INVALID_SNOOZE_DURATION':
      case 'INVALID_SNOOZE_LIMIT':
        return '⏰';
      case 'NO_WHITE_NOISE_SELECTED':
      case 'INVALID_WHITE_NOISE_DURATION':
        return '🌊';
      case 'INVALID_FADE_IN_DURATION':
      case 'INVALID_FADE_OUT_DURATION':
        return '🎵';
      default:
        return '⚠️';
    }
  };

  const getSeverityColor = (code: string) => {
    // Critical errors that prevent saving
    const criticalErrors = [
      'INVALID_TIME_FORMAT',
      'NO_CUSTOM_DAYS_SELECTED',
      'NO_WHITE_NOISE_SELECTED'
    ];
    
    return criticalErrors.includes(code) 
      ? theme.colors.error 
      : theme.colors.warning;
  };

  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.title}>
        Configuration Issues ({errorsToShow.length})
      </Text>
      
      {errorsToShow.map((error, index) => (
        <View 
          key={`${error.field}-${error.code}`}
          style={[
            styles.errorItem,
            { borderLeftColor: getSeverityColor(error.code) }
          ]}
          testID={`${testID}-error-${index}`}
        >
          <Text style={styles.errorIcon}>
            {getErrorIcon(error.code)}
          </Text>
          <View style={styles.errorContent}>
            <Text style={styles.errorMessage}>
              {error.message}
            </Text>
            <Text style={styles.errorField}>
              Field: {error.field.replace(/_/g, ' ')}
            </Text>
          </View>
        </View>
      ))}

      {/* Summary for sleep-friendly quick scanning */}
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          {validation.valid 
            ? '✅ All settings configured correctly'
            : `❌ ${errorsToShow.length} issue${errorsToShow.length !== 1 ? 's' : ''} need attention`
          }
        </Text>
      </View>
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.error + '10',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    marginVertical: theme.spacing[4],
    borderWidth: 1,
    borderColor: theme.colors.error + '30',
  },
  title: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.error,
    marginBottom: theme.spacing[3],
  },
  errorItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing[3],
    marginBottom: theme.spacing[2],
    borderLeftWidth: 4,
  },
  errorIcon: {
    fontSize: theme.fontSize.lg,
    marginRight: theme.spacing[3],
    marginTop: theme.spacing[1],
  },
  errorContent: {
    flex: 1,
  },
  errorMessage: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    fontWeight: theme.fontWeight.medium,
    lineHeight: theme.lineHeight.snug * theme.fontSize.sm,
    marginBottom: theme.spacing[1],
  },
  errorField: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
  },
  summary: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing[3],
    marginTop: theme.spacing[2],
    alignItems: 'center',
  },
  summaryText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    textAlign: 'center',
  },
});

export default AlarmFormValidation;