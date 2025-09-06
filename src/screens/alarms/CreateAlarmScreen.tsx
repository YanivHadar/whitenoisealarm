/**
 * Create/Edit Alarm Screen
 * 
 * Comprehensive alarm creation and editing interface
 * with white noise integration and sleep optimization.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  Alert,
  KeyboardAvoidingView,
  Platform 
} from 'react-native';
import { AlarmStackScreenProps } from '../../types/navigation';
import { useTheme } from '../../components/providers/ThemeProvider';
import { AlarmFormData, RepeatPattern, AudioOutput, DEFAULT_ALARM_CONFIG } from '../../types/alarm';
import { useAuthStore } from '../../store/auth-store';
import { EnhancedAlarmService } from '../../services/alarm-service';

// Import all the UI components
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import TimePicker from '../../components/ui/TimePicker';
import RepeatSelector from '../../components/ui/RepeatSelector';
import AudioSelector from '../../components/ui/AudioSelector';
import VolumeSlider from '../../components/ui/VolumeSlider';
import ToggleSwitch from '../../components/ui/ToggleSwitch';
import WhiteNoiseConfiguration from '../../components/ui/WhiteNoiseConfiguration';
import AlarmFormValidation, { validateAlarmForm } from '../../components/forms/AlarmFormValidation';

type CreateAlarmScreenProps = AlarmStackScreenProps<'CreateAlarm'>;

export const CreateAlarmScreen: React.FC<CreateAlarmScreenProps> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { user, userProfile, isPremiumUser } = useAuthStore();
  const { alarmId } = route.params || {};
  const isEditing = !!alarmId;

  const styles = createStyles(theme);

  // Form state based on AlarmFormData interface
  const [formData, setFormData] = useState<AlarmFormData>({
    name: '',
    time: '07:00',
    enabled: true,
    repeat_pattern: 'none',
    repeat_days: null,
    
    // Audio settings
    audio_file_url: null,
    audio_output: 'auto',
    volume: 0.7,
    
    // Behavior settings
    vibration_enabled: true,
    snooze_enabled: true,
    snooze_duration: 5,
    snooze_count_limit: 3,
    
    // White noise integration
    white_noise_enabled: false,
    white_noise_file_url: null,
    white_noise_category: null,
    white_noise_volume: 0.5,
    white_noise_duration: null,
    
    // Audio effects
    fade_in_duration: 0,
    fade_out_duration: 0,
    
    ...DEFAULT_ALARM_CONFIG
  });

  const [loading, setLoading] = useState(false);
  const [validationResult, setValidationResult] = useState(validateAlarmForm(formData));

  useEffect(() => {
    navigation.setOptions({
      title: isEditing ? 'Edit Alarm' : 'Create Alarm'
    });
  }, [navigation, isEditing]);

  // Load existing alarm data if editing
  useEffect(() => {
    if (isEditing && alarmId) {
      // Check if initial data is passed from EditAlarmScreen
      const initialData = route.params?.initialData as AlarmFormData | undefined;
      
      if (initialData) {
        // Pre-populate form with existing alarm data
        setFormData(initialData);
        console.log('Pre-populating form with existing alarm data:', initialData);
      } else {
        // Load alarm data from service if not pre-populated
        const loadAlarmData = async () => {
          try {
            const result = await EnhancedAlarmService.getById(alarmId);
            if (result.success && result.data) {
              const alarm = result.data;
              
              // Convert alarm database format to form format
              const formData: AlarmFormData = {
                name: alarm.name || '',
                time: alarm.time,
                enabled: alarm.enabled || false,
                repeat_pattern: alarm.repeat_pattern || 'none',
                repeat_days: alarm.repeat_days,
                audio_file_url: alarm.alarm_sound,
                audio_output: alarm.audio_output || 'auto',
                volume: alarm.volume || 0.8,
                vibration_enabled: alarm.vibration_enabled || false,
                snooze_enabled: alarm.snooze_enabled || false,
                snooze_duration: alarm.snooze_duration || 5,
                snooze_count_limit: alarm.snooze_count_limit || 3,
                white_noise_enabled: alarm.white_noise_enabled || false,
                white_noise_file_url: alarm.white_noise_sound,
                white_noise_category: null,
                white_noise_volume: alarm.white_noise_volume || 0.5,
                white_noise_duration: null,
                fade_in_duration: alarm.fade_in_duration,
                fade_out_duration: alarm.fade_out_duration,
              };
              
              setFormData(formData);
              console.log('Loaded alarm data from service:', formData);
            } else {
              console.error('Failed to load alarm data:', result.error);
              Alert.alert(
                'Error',
                'Failed to load alarm data. Please try again.',
                [
                  { text: 'OK', onPress: () => navigation.goBack() }
                ]
              );
            }
          } catch (error) {
            console.error('Error loading alarm data:', error);
            Alert.alert(
              'Error',
              'Failed to load alarm data. Please try again.',
              [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]
            );
          }
        };
        
        loadAlarmData();
      }
    }
  }, [isEditing, alarmId, route.params, navigation]);

  // Real-time validation
  useEffect(() => {
    const validation = validateAlarmForm(formData);
    setValidationResult(validation);
  }, [formData]);

  // Form field update helper
  const updateFormData = useCallback((updates: Partial<AlarmFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const handleSave = async () => {
    setLoading(true);
    
    try {
      const validation = validateAlarmForm(formData);
      
      if (!validation.valid) {
        Alert.alert(
          'Configuration Issues',
          `Please fix ${validation.errors.length} issue${validation.errors.length !== 1 ? 's' : ''} before saving.`,
          [{ text: 'OK' }]
        );
        return;
      }

      // Check if user is authenticated
      if (!user) {
        Alert.alert(
          'Authentication Required',
          'Please sign in to save your alarm.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Save alarm using EnhancedAlarmService
      let result;
      if (isEditing && alarmId) {
        result = await EnhancedAlarmService.update(
          alarmId,
          formData,
          isPremiumUser()
        );
      } else {
        result = await EnhancedAlarmService.create(
          formData,
          user.id,
          isPremiumUser()
        );
      }

      if (result.success && result.data) {
        Alert.alert(
          'Success',
          isEditing ? 'Alarm updated successfully!' : 'Alarm created successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        const errorMessage = result.error?.message || 'Failed to save alarm';
        Alert.alert(
          'Error',
          errorMessage,
          [{ text: 'OK' }]
        );
      }
      
    } catch (error) {
      console.error('Error saving alarm:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to save alarm. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (Object.keys(formData).some(key => formData[key as keyof AlarmFormData] !== '')) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { 
            text: 'Discard', 
            style: 'destructive',
            onPress: () => navigation.goBack() 
          }
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Time Picker Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⏰ Alarm Time</Text>
            <TimePicker
              value={formData.time}
              onTimeChange={(time) => updateFormData({ time })}
              testID="alarm-time-picker"
            />
          </View>

          {/* Basic Settings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Basic Settings</Text>
            
            <Input
              label="Alarm Label (Optional)"
              value={formData.name}
              onChangeText={(name) => updateFormData({ name })}
              placeholder="Wake up, Morning routine, etc."
              maxLength={50}
              style={styles.inputSpacing}
              testID="alarm-name-input"
            />
            
            <RepeatSelector
              value={formData.repeat_pattern}
              customDays={formData.repeat_days || []}
              onRepeatChange={(pattern, days) => 
                updateFormData({ 
                  repeat_pattern: pattern, 
                  repeat_days: days || null 
                })
              }
              testID="alarm-repeat-selector"
            />
            
            <ToggleSwitch
              label="Enable Alarm"
              description="Alarm will be active after saving"
              value={formData.enabled}
              onValueChange={(enabled) => updateFormData({ enabled })}
              icon="🔔"
              testID="alarm-enabled-toggle"
            />
          </View>

          {/* Audio Configuration Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎵 Audio Configuration</Text>
            
            <AudioSelector
              selectedSoundId={formData.audio_file_url || undefined}
              onSoundSelect={(soundId, soundUrl) => 
                updateFormData({ audio_file_url: soundUrl })
              }
              soundType="alarm"
              volume={formData.volume}
              testID="alarm-sound-selector"
            />
            
            <VolumeSlider
              value={formData.volume}
              onValueChange={(volume) => updateFormData({ volume })}
              label="Alarm Volume"
              showQuickSettings
              testID="alarm-volume-slider"
            />
            
            {/* Audio Output Selector */}
            <View style={styles.audioOutputContainer}>
              <Text style={styles.configLabel}>Audio Output</Text>
              <View style={styles.audioOutputButtons}>
                {[
                  { value: 'auto' as AudioOutput, label: 'Auto-detect', icon: '🔍' },
                  { value: 'speaker' as AudioOutput, label: 'Speaker', icon: '🔊' },
                  { value: 'headphones' as AudioOutput, label: 'Headphones', icon: '🎧' }
                ].map((option) => (
                  <Button
                    key={option.value}
                    title={`${option.icon} ${option.label}`}
                    onPress={() => updateFormData({ audio_output: option.value })}
                    variant={formData.audio_output === option.value ? 'primary' : 'secondary'}
                    size="small"
                    style={styles.audioOutputButton}
                    testID={`audio-output-${option.value}`}
                  />
                ))}
              </View>
            </View>
          </View>

          {/* Behavior Settings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚙️ Behavior Settings</Text>
            
            <ToggleSwitch
              label="Vibration"
              description="Vibrate when alarm triggers"
              value={formData.vibration_enabled}
              onValueChange={(vibration_enabled) => updateFormData({ vibration_enabled })}
              icon="📳"
              testID="vibration-toggle"
            />
            
            <ToggleSwitch
              label="Snooze"
              description="Allow snoozing this alarm"
              value={formData.snooze_enabled}
              onValueChange={(snooze_enabled) => updateFormData({ snooze_enabled })}
              icon="⏰"
              testID="snooze-toggle"
            />
            
            {formData.snooze_enabled && (
              <View style={styles.snoozeConfig}>
                <View style={styles.snoozeRow}>
                  <Text style={styles.snoozeLabel}>Duration: {formData.snooze_duration} min</Text>
                  <View style={styles.snoozeButtons}>
                    {[1, 5, 10, 15].map(duration => (
                      <Button
                        key={duration}
                        title={`${duration}m`}
                        onPress={() => updateFormData({ snooze_duration: duration })}
                        variant={formData.snooze_duration === duration ? 'primary' : 'secondary'}
                        size="small"
                        style={styles.snoozeButton}
                        testID={`snooze-duration-${duration}`}
                      />
                    ))}
                  </View>
                </View>
                
                <View style={styles.snoozeRow}>
                  <Text style={styles.snoozeLabel}>Limit: {formData.snooze_count_limit} times</Text>
                  <View style={styles.snoozeButtons}>
                    {[1, 3, 5, 10].map(limit => (
                      <Button
                        key={limit}
                        title={`${limit}x`}
                        onPress={() => updateFormData({ snooze_count_limit: limit })}
                        variant={formData.snooze_count_limit === limit ? 'primary' : 'secondary'}
                        size="small"
                        style={styles.snoozeButton}
                        testID={`snooze-limit-${limit}`}
                      />
                    ))}
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* White Noise Configuration Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🌊 White Noise Integration</Text>
            
            <WhiteNoiseConfiguration
              enabled={formData.white_noise_enabled}
              soundId={formData.white_noise_file_url || undefined}
              soundUrl={formData.white_noise_file_url || undefined}
              category={formData.white_noise_category}
              volume={formData.white_noise_volume}
              duration={formData.white_noise_duration}
              onEnabledChange={(enabled) => updateFormData({ white_noise_enabled: enabled })}
              onSoundChange={(soundId, soundUrl) => 
                updateFormData({ white_noise_file_url: soundUrl })
              }
              onVolumeChange={(volume) => updateFormData({ white_noise_volume: volume })}
              onDurationChange={(duration) => updateFormData({ white_noise_duration: duration })}
              testID="white-noise-config"
            />
          </View>

          {/* Validation Errors */}
          {!validationResult.valid && (
            <AlarmFormValidation
              formData={formData}
              validationResult={validationResult}
              showAllErrors={false}
              testID="alarm-form-validation"
            />
          )}

          {/* Footer Spacing */}
          <View style={styles.footerSpacing} />
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.footer}>
          <View style={styles.buttonRow}>
            <Button
              title="Cancel"
              variant="secondary"
              size="large"
              onPress={handleCancel}
              style={styles.cancelButton}
              testID="cancel-button"
            />
            <Button
              title={isEditing ? "Update Alarm" : "Create Alarm"}
              variant="primary"
              size="large"
              onPress={handleSave}
              loading={loading}
              disabled={!validationResult.valid}
              style={styles.saveButton}
              testID="save-button"
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: theme.spacing[4],
  },
  section: {
    marginBottom: theme.spacing[8],
  },
  sectionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing[4],
  },
  inputSpacing: {
    marginBottom: theme.spacing[4],
  },
  configLabel: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing[3],
  },
  audioOutputContainer: {
    marginTop: theme.spacing[4],
  },
  audioOutputButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  audioOutputButton: {
    flex: 1,
    marginHorizontal: theme.spacing[1],
  },
  snoozeConfig: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    marginTop: theme.spacing[3],
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  snoozeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  snoozeLabel: {
    fontSize: theme.fontSize.base,
    color: theme.colors.text,
    fontWeight: theme.fontWeight.medium,
    flex: 1,
  },
  snoozeButtons: {
    flexDirection: 'row',
  },
  snoozeButton: {
    marginLeft: theme.spacing[2],
    minWidth: 40,
  },
  footerSpacing: {
    height: theme.spacing[8],
  },
  footer: {
    padding: theme.spacing[4],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    marginRight: theme.spacing[3],
  },
  saveButton: {
    flex: 2,
  },
});

export default CreateAlarmScreen;