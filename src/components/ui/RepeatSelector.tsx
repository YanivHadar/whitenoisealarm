/**
 * RepeatSelector Component
 * 
 * Sleep-optimized repeat pattern selector with support for
 * custom day selection and clear visual feedback.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import { RepeatPattern, DAY_NAMES, DAY_ABBREV } from '../../types/alarm';
import Button from './Button';

interface RepeatSelectorProps {
  value: RepeatPattern;
  customDays?: number[];
  onRepeatChange: (pattern: RepeatPattern, customDays?: number[]) => void;
  disabled?: boolean;
  testID?: string;
}

const REPEAT_OPTIONS: Array<{
  value: RepeatPattern;
  label: string;
  description: string;
}> = [
  { value: 'none', label: 'Once', description: 'Alarm will not repeat' },
  { value: 'daily', label: 'Daily', description: 'Every day' },
  { value: 'weekdays', label: 'Weekdays', description: 'Monday to Friday' },
  { value: 'weekends', label: 'Weekends', description: 'Saturday and Sunday' },
  { value: 'custom', label: 'Custom', description: 'Select specific days' },
];

export const RepeatSelector: React.FC<RepeatSelectorProps> = ({
  value,
  customDays = [],
  onRepeatChange,
  disabled = false,
  testID = 'repeat-selector'
}) => {
  const { theme } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>(customDays);
  const styles = createStyles(theme);

  const getDisplayText = () => {
    const option = REPEAT_OPTIONS.find(opt => opt.value === value);
    if (value === 'custom' && customDays.length > 0) {
      if (customDays.length === 7) return 'Daily';
      if (customDays.length === 5 && customDays.every(day => day >= 1 && day <= 5)) return 'Weekdays';
      if (customDays.length === 2 && customDays.includes(0) && customDays.includes(6)) return 'Weekends';
      
      // Show abbreviated day names
      return customDays
        .sort()
        .map(day => DAY_ABBREV[day])
        .join(', ');
    }
    return option?.label || 'Once';
  };

  const getDescriptionText = () => {
    const option = REPEAT_OPTIONS.find(opt => opt.value === value);
    if (value === 'custom' && customDays.length > 0) {
      return `${customDays.length} day${customDays.length !== 1 ? 's' : ''} selected`;
    }
    return option?.description || 'Alarm will not repeat';
  };

  const handlePatternSelect = (pattern: RepeatPattern) => {
    if (pattern === 'custom') {
      // Don't close modal, let user select custom days
      return;
    }
    
    onRepeatChange(pattern, []);
    setShowModal(false);
  };

  const handleDayToggle = (day: number) => {
    const newSelectedDays = selectedDays.includes(day)
      ? selectedDays.filter(d => d !== day)
      : [...selectedDays, day].sort();
    
    setSelectedDays(newSelectedDays);
  };

  const handleCustomSave = () => {
    if (selectedDays.length === 0) {
      onRepeatChange('none', []);
    } else {
      onRepeatChange('custom', selectedDays);
    }
    setShowModal(false);
  };

  const openModal = () => {
    if (!disabled) {
      setSelectedDays(customDays);
      setShowModal(true);
    }
  };

  return (
    <View style={styles.container} testID={testID}>
      <TouchableOpacity
        style={[styles.selector, disabled && styles.disabled]}
        onPress={openModal}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Repeat pattern: ${getDisplayText()}`}
        accessibilityHint="Double tap to change repeat pattern"
        testID={`${testID}-button`}
      >
        <View style={styles.selectorContent}>
          <Text style={[styles.labelText, disabled && styles.disabledText]}>
            {getDisplayText()}
          </Text>
          <Text style={[styles.descriptionText, disabled && styles.disabledText]}>
            {getDescriptionText()}
          </Text>
        </View>
        <Text style={[styles.chevron, disabled && styles.disabledText]}>›</Text>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
        testID={`${testID}-modal`}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Repeat Pattern</Text>
            <TouchableOpacity
              onPress={() => setShowModal(false)}
              style={styles.closeButton}
              testID={`${testID}-close`}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Quick Repeat Options */}
            <View style={styles.quickOptions}>
              {REPEAT_OPTIONS.filter(opt => opt.value !== 'custom').map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    value === option.value && styles.selectedOption
                  ]}
                  onPress={() => handlePatternSelect(option.value)}
                  testID={`${testID}-option-${option.value}`}
                >
                  <Text style={[
                    styles.optionLabel,
                    value === option.value && styles.selectedOptionText
                  ]}>
                    {option.label}
                  </Text>
                  <Text style={[
                    styles.optionDescription,
                    value === option.value && styles.selectedOptionDescription
                  ]}>
                    {option.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom Day Selection */}
            <View style={styles.customSection}>
              <Text style={styles.sectionTitle}>Custom Days</Text>
              <Text style={styles.sectionDescription}>
                Select specific days for your alarm
              </Text>
              
              <View style={styles.dayGrid}>
                {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayButton,
                      selectedDays.includes(day) && styles.selectedDay
                    ]}
                    onPress={() => handleDayToggle(day)}
                    testID={`${testID}-day-${day}`}
                  >
                    <Text style={[
                      styles.dayButtonText,
                      selectedDays.includes(day) && styles.selectedDayText
                    ]}>
                      {DAY_ABBREV[day]}
                    </Text>
                    <Text style={[
                      styles.dayFullName,
                      selectedDays.includes(day) && styles.selectedDayFullName
                    ]}>
                      {DAY_NAMES[day]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Button
                title={`Save Custom Pattern (${selectedDays.length} days)`}
                onPress={handleCustomSave}
                variant="primary"
                size="large"
                fullWidth
                disabled={selectedDays.length === 0}
                style={styles.saveButton}
                testID={`${testID}-save-custom`}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    marginVertical: theme.spacing[2],
  },
  selector: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 60,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectorContent: {
    flex: 1,
  },
  labelText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing[1],
  },
  descriptionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  chevron: {
    fontSize: theme.fontSize.xl,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.bold,
  },
  disabled: {
    backgroundColor: theme.colors.disabled,
    opacity: 0.6,
  },
  disabledText: {
    color: theme.colors.textSecondary,
  },
  modal: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  modalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  closeButton: {
    padding: theme.spacing[2],
  },
  closeButtonText: {
    fontSize: theme.fontSize.base,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },
  modalContent: {
    flex: 1,
    padding: theme.spacing[4],
  },
  quickOptions: {
    marginBottom: theme.spacing[8],
  },
  optionButton: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[3],
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedOption: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '20',
  },
  optionLabel: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing[1],
  },
  selectedOptionText: {
    color: theme.colors.primary,
  },
  optionDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  selectedOptionDescription: {
    color: theme.colors.primary,
  },
  customSection: {
    marginTop: theme.spacing[4],
  },
  sectionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing[2],
  },
  sectionDescription: {
    fontSize: theme.fontSize.base,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing[4],
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: theme.spacing[6],
  },
  dayButton: {
    width: '13%',
    aspectRatio: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedDay: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  dayButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing[1],
  },
  selectedDayText: {
    color: '#FFFFFF',
  },
  dayFullName: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  selectedDayFullName: {
    color: '#FFFFFF',
  },
  saveButton: {
    marginTop: theme.spacing[4],
  },
});

export default RepeatSelector;