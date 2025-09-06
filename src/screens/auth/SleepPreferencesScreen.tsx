/**
 * Sleep Preferences Setup Screen
 * 
 * Initial sleep preferences configuration during onboarding.
 * Collects basic sleep schedule, preferred wake-up style, and 
 * white noise preferences to personalize the user experience.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackScreenProps } from '../../types/navigation';
import { useTheme } from '../../components/providers/ThemeProvider';
import Button from '../../components/ui/Button';

type SleepPreferencesScreenProps = AuthStackScreenProps<'BiometricSetup'>; // This would be added to navigation types

interface SleepPreferences {
  bedtime: string;
  wakeTime: string;
  sleepGoal: number; // hours
  wakeUpStyle: 'gentle' | 'standard' | 'energetic';
  whiteNoisePreference: 'none' | 'light' | 'moderate' | 'heavy';
  preferredSounds: string[];
}

const WAKE_UP_STYLES = [
  {
    id: 'gentle',
    name: 'Gentle Wake-up',
    description: 'Soft sounds that gradually increase',
    icon: 'sunny-outline',
  },
  {
    id: 'standard',
    name: 'Standard',
    description: 'Classic alarm sounds',
    icon: 'alarm-outline',
  },
  {
    id: 'energetic',
    name: 'Energetic',
    description: 'Upbeat sounds to start your day',
    icon: 'flash-outline',
  },
];

const WHITE_NOISE_LEVELS = [
  {
    id: 'none',
    name: 'No White Noise',
    description: 'Prefer silence for sleep',
    icon: 'volume-mute-outline',
  },
  {
    id: 'light',
    name: 'Light Sounds',
    description: 'Gentle nature sounds',
    icon: 'volume-low-outline',
  },
  {
    id: 'moderate',
    name: 'Moderate',
    description: 'Steady background noise',
    icon: 'volume-medium-outline',
  },
  {
    id: 'heavy',
    name: 'Heavy White Noise',
    description: 'Consistent masking sounds',
    icon: 'volume-high-outline',
  },
];

const PREFERRED_SOUNDS = [
  { id: 'rain', name: 'Rain', icon: 'rainy' },
  { id: 'ocean', name: 'Ocean Waves', icon: 'water' },
  { id: 'forest', name: 'Forest', icon: 'leaf' },
  { id: 'thunder', name: 'Thunder', icon: 'thunderstorm' },
  { id: 'wind', name: 'Wind', icon: 'cloudy' },
  { id: 'fireplace', name: 'Fireplace', icon: 'flame' },
];

export const SleepPreferencesScreen: React.FC<SleepPreferencesScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<SleepPreferences>({
    bedtime: '22:00',
    wakeTime: '07:00',
    sleepGoal: 8,
    wakeUpStyle: 'standard',
    whiteNoisePreference: 'moderate',
    preferredSounds: ['rain'],
  });

  const styles = createStyles(theme);

  const updatePreference = <K extends keyof SleepPreferences>(
    key: K,
    value: SleepPreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const togglePreferredSound = (soundId: string) => {
    setPreferences(prev => ({
      ...prev,
      preferredSounds: prev.preferredSounds.includes(soundId)
        ? prev.preferredSounds.filter(id => id !== soundId)
        : [...prev.preferredSounds, soundId],
    }));
  };

  const handleSavePreferences = async () => {
    setLoading(true);
    
    try {
      // Here you would save preferences to your backend/storage
      console.log('Saving sleep preferences:', preferences);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Navigate to next step (BiometricSetup)
      navigation.navigate('BiometricSetup');
      
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert(
        'Error',
        'Failed to save your preferences. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="moon" size={48} color={theme.colors.primary} />
          </View>
          <Text style={styles.title}>Set Your Sleep Preferences</Text>
          <Text style={styles.subtitle}>
            Help us personalize your sleep experience with a few quick questions
          </Text>
        </View>

        {/* Sleep Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sleep Schedule</Text>
          
          <View style={styles.timeRow}>
            <View style={styles.timeItem}>
              <Text style={styles.timeLabel}>Bedtime</Text>
              <TouchableOpacity style={styles.timeButton}>
                <Text style={styles.timeText}>{formatTime(preferences.bedtime)}</Text>
                <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.timeItem}>
              <Text style={styles.timeLabel}>Wake Time</Text>
              <TouchableOpacity style={styles.timeButton}>
                <Text style={styles.timeText}>{formatTime(preferences.wakeTime)}</Text>
                <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.goalContainer}>
            <Text style={styles.goalLabel}>Sleep Goal: {preferences.sleepGoal} hours</Text>
            <View style={styles.goalButtons}>
              {[7, 8, 9].map(hours => (
                <TouchableOpacity
                  key={hours}
                  style={[
                    styles.goalButton,
                    preferences.sleepGoal === hours && styles.goalButtonActive
                  ]}
                  onPress={() => updatePreference('sleepGoal', hours)}
                >
                  <Text style={[
                    styles.goalButtonText,
                    preferences.sleepGoal === hours && styles.goalButtonTextActive
                  ]}>
                    {hours}h
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Wake-up Style */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wake-up Style</Text>
          {WAKE_UP_STYLES.map(style => (
            <TouchableOpacity
              key={style.id}
              style={[
                styles.optionCard,
                preferences.wakeUpStyle === style.id && styles.optionCardActive
              ]}
              onPress={() => updatePreference('wakeUpStyle', style.id as any)}
            >
              <Ionicons 
                name={style.icon as any} 
                size={24} 
                color={preferences.wakeUpStyle === style.id ? theme.colors.primary : theme.colors.textSecondary} 
              />
              <View style={styles.optionText}>
                <Text style={[
                  styles.optionTitle,
                  preferences.wakeUpStyle === style.id && styles.optionTitleActive
                ]}>
                  {style.name}
                </Text>
                <Text style={styles.optionDescription}>{style.description}</Text>
              </View>
              <View style={[
                styles.radio,
                preferences.wakeUpStyle === style.id && styles.radioActive
              ]}>
                {preferences.wakeUpStyle === style.id && (
                  <View style={styles.radioDot} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* White Noise Preference */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>White Noise Preference</Text>
          {WHITE_NOISE_LEVELS.map(level => (
            <TouchableOpacity
              key={level.id}
              style={[
                styles.optionCard,
                preferences.whiteNoisePreference === level.id && styles.optionCardActive
              ]}
              onPress={() => updatePreference('whiteNoisePreference', level.id as any)}
            >
              <Ionicons 
                name={level.icon as any} 
                size={24} 
                color={preferences.whiteNoisePreference === level.id ? theme.colors.primary : theme.colors.textSecondary} 
              />
              <View style={styles.optionText}>
                <Text style={[
                  styles.optionTitle,
                  preferences.whiteNoisePreference === level.id && styles.optionTitleActive
                ]}>
                  {level.name}
                </Text>
                <Text style={styles.optionDescription}>{level.description}</Text>
              </View>
              <View style={[
                styles.radio,
                preferences.whiteNoisePreference === level.id && styles.radioActive
              ]}>
                {preferences.whiteNoisePreference === level.id && (
                  <View style={styles.radioDot} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Preferred Sounds */}
        {preferences.whiteNoisePreference !== 'none' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferred Sounds</Text>
            <Text style={styles.sectionSubtitle}>Select your favorite sleep sounds</Text>
            
            <View style={styles.soundsGrid}>
              {PREFERRED_SOUNDS.map(sound => (
                <TouchableOpacity
                  key={sound.id}
                  style={[
                    styles.soundCard,
                    preferences.preferredSounds.includes(sound.id) && styles.soundCardActive
                  ]}
                  onPress={() => togglePreferredSound(sound.id)}
                >
                  <Ionicons 
                    name={sound.icon as any} 
                    size={20} 
                    color={preferences.preferredSounds.includes(sound.id) ? theme.colors.primary : theme.colors.textSecondary} 
                  />
                  <Text style={[
                    styles.soundText,
                    preferences.preferredSounds.includes(sound.id) && styles.soundTextActive
                  ]}>
                    {sound.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Save Preferences"
          variant="primary"
          size="large"
          onPress={handleSavePreferences}
          loading={loading}
          containerStyle={styles.saveButton}
        />
      </View>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing[6],
    paddingTop: theme.spacing[4],
    paddingBottom: theme.spacing[4],
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing[8],
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primaryBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing[4],
  },
  title: {
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing[2],
  },
  subtitle: {
    fontSize: theme.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: theme.lineHeight.relaxed * theme.fontSize.base,
  },
  section: {
    marginBottom: theme.spacing[8],
  },
  sectionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing[4],
  },
  sectionSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing[4],
  },
  timeRow: {
    flexDirection: 'row',
    gap: theme.spacing[4],
    marginBottom: theme.spacing[4],
  },
  timeItem: {
    flex: 1,
  },
  timeLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing[2],
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  timeText: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
  },
  goalContainer: {
    alignItems: 'center',
  },
  goalLabel: {
    fontSize: theme.fontSize.base,
    color: theme.colors.text,
    marginBottom: theme.spacing[3],
  },
  goalButtons: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  goalButton: {
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  goalButtonActive: {
    backgroundColor: theme.colors.primaryBackground,
    borderColor: theme.colors.primary,
  },
  goalButtonText: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  goalButtonTextActive: {
    color: theme.colors.primary,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[4],
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing[3],
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  optionCardActive: {
    backgroundColor: theme.colors.primaryBackground,
    borderColor: theme.colors.primary,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing[1],
  },
  optionTitleActive: {
    color: theme.colors.primary,
  },
  optionDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: theme.colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  soundsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[3],
  },
  soundCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  soundCardActive: {
    backgroundColor: theme.colors.primaryBackground,
    borderColor: theme.colors.primary,
  },
  soundText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  soundTextActive: {
    color: theme.colors.primary,
  },
  actions: {
    padding: theme.spacing[6],
  },
  saveButton: {
    minHeight: 56,
  },
});

export default SleepPreferencesScreen;