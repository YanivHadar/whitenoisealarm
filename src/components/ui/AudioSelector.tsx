/**
 * AudioSelector Component
 * 
 * Sleep-optimized sound selection with preview functionality
 * and categorized sound library integration.
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  ScrollView, 
  ActivityIndicator,
  Alert 
} from 'react-native';
import { Audio } from 'expo-av';
import { useTheme } from '../providers/ThemeProvider';
import { AlarmSound, WhiteNoiseSound, WhiteNoiseCategory } from '../../types/alarm';
import Button from './Button';

interface AudioSelectorProps {
  selectedSoundId?: string;
  onSoundSelect: (soundId: string, soundUrl: string) => void;
  soundType: 'alarm' | 'whitenoise';
  volume?: number;
  disabled?: boolean;
  testID?: string;
}

// Mock sound data - in production, this would come from backend/assets
const ALARM_SOUNDS: AlarmSound[] = [
  { id: '1', name: 'Gentle Wake', file_url: 'https://example.com/gentle-wake.mp3', duration: 30, category: 'default', is_premium: false },
  { id: '2', name: 'Classic Bell', file_url: 'https://example.com/classic-bell.mp3', duration: 15, category: 'default', is_premium: false },
  { id: '3', name: 'Bird Song', file_url: 'https://example.com/bird-song.mp3', duration: 45, category: 'default', is_premium: false },
  { id: '4', name: 'Ocean Waves', file_url: 'https://example.com/ocean-waves.mp3', duration: 60, category: 'premium', is_premium: true },
  { id: '5', name: 'Rain Forest', file_url: 'https://example.com/rain-forest.mp3', duration: 90, category: 'premium', is_premium: true },
];

const WHITE_NOISE_SOUNDS: WhiteNoiseSound[] = [
  { id: 'wn1', name: 'White Noise', file_url: 'https://example.com/white-noise.mp3', category: 'ambient', duration: null, is_loopable: true, is_premium: false },
  { id: 'wn2', name: 'Brown Noise', file_url: 'https://example.com/brown-noise.mp3', category: 'ambient', duration: null, is_loopable: true, is_premium: false },
  { id: 'wn3', name: 'Rain', file_url: 'https://example.com/rain.mp3', category: 'nature', duration: null, is_loopable: true, is_premium: false },
  { id: 'wn4', name: 'Ocean', file_url: 'https://example.com/ocean.mp3', category: 'nature', duration: null, is_loopable: true, is_premium: false },
  { id: 'wn5', name: 'Forest', file_url: 'https://example.com/forest.mp3', category: 'nature', duration: null, is_loopable: true, is_premium: true },
  { id: 'wn6', name: 'Fan', file_url: 'https://example.com/fan.mp3', category: 'mechanical', duration: null, is_loopable: true, is_premium: false },
];

export const AudioSelector: React.FC<AudioSelectorProps> = ({
  selectedSoundId,
  onSoundSelect,
  soundType,
  volume = 0.7,
  disabled = false,
  testID = 'audio-selector'
}) => {
  const { theme } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const styles = createStyles(theme);

  const sounds = soundType === 'alarm' ? ALARM_SOUNDS : WHITE_NOISE_SOUNDS;
  const selectedSound = sounds.find(s => s.id === selectedSoundId);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      stopPreview();
    };
  }, []);

  const getDisplayText = () => {
    return selectedSound?.name || 'Select Sound';
  };

  const getDescriptionText = () => {
    if (selectedSound) {
      const premiumText = selectedSound.is_premium ? ' • Premium' : '';
      const durationText = selectedSound.duration 
        ? ` • ${selectedSound.duration}s` 
        : ' • Loopable';
      return `${selectedSound.category}${durationText}${premiumText}`;
    }
    return 'Choose from our sound library';
  };

  const playPreview = async (sound: AlarmSound | WhiteNoiseSound) => {
    try {
      setLoading(true);
      setPreviewingId(sound.id);

      // Stop any current preview
      await stopPreview();

      // Configure audio mode for previews
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Create and load new sound
      const { sound: audioSound } = await Audio.Sound.createAsync(
        { uri: sound.file_url },
        { 
          shouldPlay: true, 
          volume: volume,
          isLooping: false // Always non-looping for previews
        }
      );

      soundRef.current = audioSound;

      // Auto-stop preview after 10 seconds
      previewTimeoutRef.current = setTimeout(() => {
        stopPreview();
      }, 10000);

      // Listen for playback completion
      audioSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          stopPreview();
        }
      });

    } catch (error) {
      console.error('Error playing sound preview:', error);
      Alert.alert('Preview Error', 'Unable to play sound preview. Please try again.');
      setPreviewingId(null);
    } finally {
      setLoading(false);
    }
  };

  const stopPreview = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
        previewTimeoutRef.current = null;
      }
      
      setPreviewingId(null);
    } catch (error) {
      console.error('Error stopping sound preview:', error);
    }
  };

  const handleSoundSelect = (sound: AlarmSound | WhiteNoiseSound) => {
    onSoundSelect(sound.id, sound.file_url);
    setShowModal(false);
    stopPreview(); // Stop any playing preview
  };

  const openModal = () => {
    if (!disabled) {
      setShowModal(true);
    }
  };

  const closeModal = () => {
    stopPreview();
    setShowModal(false);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'nature': return '🌿';
      case 'ambient': return '🌊';
      case 'mechanical': return '⚙️';
      case 'binaural': return '🧠';
      case 'default': return '🔔';
      case 'premium': return '⭐';
      default: return '🎵';
    }
  };

  const groupSoundsByCategory = () => {
    const grouped = sounds.reduce((acc, sound) => {
      const category = 'category' in sound ? sound.category : 'default';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(sound);
      return acc;
    }, {} as Record<string, (AlarmSound | WhiteNoiseSound)[]>);

    return grouped;
  };

  return (
    <View style={styles.container} testID={testID}>
      <TouchableOpacity
        style={[styles.selector, disabled && styles.disabled]}
        onPress={openModal}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Selected sound: ${getDisplayText()}`}
        accessibilityHint="Double tap to change sound"
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
        onRequestClose={closeModal}
        testID={`${testID}-modal`}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {soundType === 'alarm' ? 'Alarm Sounds' : 'White Noise'}
            </Text>
            <TouchableOpacity
              onPress={closeModal}
              style={styles.closeButton}
              testID={`${testID}-close`}
            >
              <Text style={styles.closeButtonText}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {Object.entries(groupSoundsByCategory()).map(([category, categorySounds]) => (
              <View key={category} style={styles.categorySection}>
                <Text style={styles.categoryTitle}>
                  {getCategoryIcon(category)} {category.charAt(0).toUpperCase() + category.slice(1)}
                </Text>
                
                {categorySounds.map((sound) => (
                  <View key={sound.id} style={styles.soundItem}>
                    <TouchableOpacity
                      style={[
                        styles.soundButton,
                        selectedSoundId === sound.id && styles.selectedSound
                      ]}
                      onPress={() => handleSoundSelect(sound)}
                      testID={`${testID}-sound-${sound.id}`}
                    >
                      <View style={styles.soundInfo}>
                        <Text style={[
                          styles.soundName,
                          selectedSoundId === sound.id && styles.selectedSoundText
                        ]}>
                          {sound.name}
                        </Text>
                        <Text style={[
                          styles.soundMeta,
                          selectedSoundId === sound.id && styles.selectedSoundMeta
                        ]}>
                          {sound.duration ? `${sound.duration}s` : 'Loopable'}
                          {sound.is_premium ? ' • Premium' : ''}
                        </Text>
                      </View>
                      
                      <TouchableOpacity
                        style={styles.previewButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          if (previewingId === sound.id) {
                            stopPreview();
                          } else {
                            playPreview(sound);
                          }
                        }}
                        disabled={loading}
                        testID={`${testID}-preview-${sound.id}`}
                      >
                        {loading && previewingId === sound.id ? (
                          <ActivityIndicator size="small" color={theme.colors.primary} />
                        ) : (
                          <Text style={styles.previewButtonText}>
                            {previewingId === sound.id ? '⏸️' : '▶️'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ))}
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
  categorySection: {
    marginBottom: theme.spacing[6],
  },
  categoryTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing[3],
    textTransform: 'capitalize',
  },
  soundItem: {
    marginBottom: theme.spacing[2],
  },
  soundButton: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedSound: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '20',
  },
  soundInfo: {
    flex: 1,
  },
  soundName: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing[1],
  },
  selectedSoundText: {
    color: theme.colors.primary,
  },
  soundMeta: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  selectedSoundMeta: {
    color: theme.colors.primary,
  },
  previewButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: theme.spacing[3],
  },
  previewButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
});

export default AudioSelector;