/**
 * WhiteNoiseConfiguration Component
 * 
 * Comprehensive white noise configuration with duration controls,
 * sound selection, and sleep-optimized interface design.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import { WhiteNoiseCategory } from '../../types/alarm';
import AudioSelector from './AudioSelector';
import VolumeSlider from './VolumeSlider';
import Button from './Button';

interface WhiteNoiseConfigurationProps {
  enabled: boolean;
  soundId?: string;
  soundUrl?: string;
  category?: WhiteNoiseCategory | null;
  volume: number;
  duration?: number | null; // minutes, null for continuous
  onEnabledChange: (enabled: boolean) => void;
  onSoundChange: (soundId: string, soundUrl: string) => void;
  onVolumeChange: (volume: number) => void;
  onDurationChange: (duration: number | null) => void;
  disabled?: boolean;
  testID?: string;
}

const DURATION_PRESETS = [
  { value: null, label: 'Continuous', description: 'Until manually stopped' },
  { value: 15, label: '15 minutes', description: 'Short session' },
  { value: 30, label: '30 minutes', description: 'Popular choice' },
  { value: 60, label: '1 hour', description: 'Medium session' },
  { value: 120, label: '2 hours', description: 'Long session' },
  { value: 480, label: '8 hours', description: 'All night' },
];

export const WhiteNoiseConfiguration: React.FC<WhiteNoiseConfigurationProps> = ({
  enabled,
  soundId,
  soundUrl,
  category,
  volume,
  duration,
  onEnabledChange,
  onSoundChange,
  onVolumeChange,
  onDurationChange,
  disabled = false,
  testID = 'whitenoise-config'
}) => {
  const { theme } = useTheme();
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [customDuration, setCustomDuration] = useState(duration || 60);
  const styles = createStyles(theme);

  const getDurationDisplayText = () => {
    if (duration === null || duration === undefined) return 'Continuous';
    if (duration < 60) return `${duration} minutes`;
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    if (minutes === 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
    return `${hours}h ${minutes}m`;
  };

  const getDurationDescriptionText = () => {
    const preset = DURATION_PRESETS.find(p => p.value === duration);
    return preset?.description || 'Custom duration';
  };

  const handleDurationSelect = (selectedDuration: number | null) => {
    onDurationChange(selectedDuration);
    setShowDurationModal(false);
  };

  const handleCustomDurationSave = () => {
    onDurationChange(customDuration);
    setShowDurationModal(false);
  };

  const formatCustomDurationInput = (value: number): string => {
    if (value < 60) return `${value} min`;
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  return (
    <View style={[styles.container, disabled && styles.disabled]} testID={testID}>
      {/* Master Enable Toggle */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, disabled && styles.disabledText]}>
            White Noise Integration
          </Text>
          <Text style={[styles.subtitle, disabled && styles.disabledText]}>
            Play calming sounds while alarm is set
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={onEnabledChange}
          disabled={disabled}
          trackColor={{
            false: theme.colors.border,
            true: theme.colors.primary + '40',
          }}
          thumbColor={enabled ? theme.colors.primary : theme.colors.textSecondary}
          testID={`${testID}-toggle`}
        />
      </View>

      {/* Configuration Options (only visible when enabled) */}
      {enabled && (
        <View style={styles.configSection}>
          {/* Sound Selection */}
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>White Noise Sound</Text>
            <AudioSelector
              selectedSoundId={soundId}
              onSoundSelect={onSoundChange}
              soundType="whitenoise"
              volume={volume}
              disabled={disabled}
              testID={`${testID}-sound-selector`}
            />
          </View>

          {/* Volume Control */}
          <View style={styles.configItem}>
            <VolumeSlider
              value={volume}
              onValueChange={onVolumeChange}
              label="White Noise Volume"
              showQuickSettings
              disabled={disabled}
              testID={`${testID}-volume`}
            />
          </View>

          {/* Duration Control */}
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>Playback Duration</Text>
            <TouchableOpacity
              style={[styles.durationSelector, disabled && styles.disabledSelector]}
              onPress={() => !disabled && setShowDurationModal(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Duration: ${getDurationDisplayText()}`}
              accessibilityHint="Double tap to change playback duration"
              testID={`${testID}-duration-button`}
            >
              <View style={styles.durationContent}>
                <Text style={[styles.durationText, disabled && styles.disabledText]}>
                  {getDurationDisplayText()}
                </Text>
                <Text style={[styles.durationDescription, disabled && styles.disabledText]}>
                  {getDurationDescriptionText()}
                </Text>
              </View>
              <Text style={[styles.chevron, disabled && styles.disabledText]}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Additional Info */}
          <View style={styles.infoSection}>
            <Text style={styles.infoText}>
              💡 White noise will start playing when the alarm is triggered and continue for the selected duration.
            </Text>
          </View>
        </View>
      )}

      {/* Duration Selection Modal */}
      <Modal
        visible={showDurationModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDurationModal(false)}
        testID={`${testID}-duration-modal`}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Playback Duration</Text>
            <TouchableOpacity
              onPress={() => setShowDurationModal(false)}
              style={styles.closeButton}
              testID={`${testID}-duration-close`}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Preset Durations */}
            <View style={styles.presetsSection}>
              <Text style={styles.sectionTitle}>Preset Durations</Text>
              {DURATION_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.value || 'continuous'}
                  style={[
                    styles.presetButton,
                    duration === preset.value && styles.selectedPreset
                  ]}
                  onPress={() => handleDurationSelect(preset.value)}
                  testID={`${testID}-preset-${preset.value || 'continuous'}`}
                >
                  <View style={styles.presetContent}>
                    <Text style={[
                      styles.presetLabel,
                      duration === preset.value && styles.selectedPresetText
                    ]}>
                      {preset.label}
                    </Text>
                    <Text style={[
                      styles.presetDescription,
                      duration === preset.value && styles.selectedPresetDescription
                    ]}>
                      {preset.description}
                    </Text>
                  </View>
                  {duration === preset.value && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom Duration */}
            <View style={styles.customSection}>
              <Text style={styles.sectionTitle}>Custom Duration</Text>
              <Text style={styles.customDescription}>
                Set a specific duration in minutes (5-720 minutes)
              </Text>
              
              <View style={styles.customInputContainer}>
                <View style={styles.customInputRow}>
                  <TouchableOpacity
                    style={styles.customButton}
                    onPress={() => setCustomDuration(Math.max(5, customDuration - 15))}
                    testID={`${testID}-custom-decrease`}
                  >
                    <Text style={styles.customButtonText}>-</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.customValue}>
                    <Text style={styles.customValueText}>
                      {formatCustomDurationInput(customDuration)}
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.customButton}
                    onPress={() => setCustomDuration(Math.min(720, customDuration + 15))}
                    testID={`${testID}-custom-increase`}
                  >
                    <Text style={styles.customButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
                
                <Button
                  title={`Save Custom Duration (${formatCustomDurationInput(customDuration)})`}
                  onPress={handleCustomDurationSave}
                  variant="primary"
                  size="large"
                  fullWidth
                  style={styles.saveButton}
                  testID={`${testID}-save-custom-duration`}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[4],
    marginVertical: theme.spacing[4],
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  disabled: {
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing[4],
  },
  headerContent: {
    flex: 1,
    marginRight: theme.spacing[4],
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing[1],
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.lineHeight.snug * theme.fontSize.sm,
  },
  disabledText: {
    color: theme.colors.textSecondary,
  },
  configSection: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing[4],
  },
  configItem: {
    marginBottom: theme.spacing[6],
  },
  configLabel: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing[3],
  },
  durationSelector: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  disabledSelector: {
    backgroundColor: theme.colors.disabled,
  },
  durationContent: {
    flex: 1,
  },
  durationText: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing[1],
  },
  durationDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  chevron: {
    fontSize: theme.fontSize.xl,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.bold,
  },
  infoSection: {
    backgroundColor: theme.colors.primary + '10',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    marginTop: theme.spacing[2],
  },
  infoText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    lineHeight: theme.lineHeight.snug * theme.fontSize.sm,
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
  presetsSection: {
    marginBottom: theme.spacing[8],
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing[4],
  },
  presetButton: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPreset: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '20',
  },
  presetContent: {
    flex: 1,
  },
  presetLabel: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing[1],
  },
  selectedPresetText: {
    color: theme.colors.primary,
  },
  presetDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  selectedPresetDescription: {
    color: theme.colors.primary,
  },
  checkmark: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.bold,
  },
  customSection: {
    marginTop: theme.spacing[4],
  },
  customDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing[4],
    lineHeight: theme.lineHeight.snug * theme.fontSize.sm,
  },
  customInputContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing[4],
  },
  customButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customButtonText: {
    fontSize: theme.fontSize.xl,
    color: '#FFFFFF',
    fontWeight: theme.fontWeight.bold,
  },
  customValue: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: theme.spacing[4],
    padding: theme.spacing[3],
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
  },
  customValueText: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  saveButton: {
    marginTop: theme.spacing[2],
  },
});

export default WhiteNoiseConfiguration;