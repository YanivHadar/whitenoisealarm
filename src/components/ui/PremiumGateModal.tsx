/**
 * Premium Gate Modal
 * 
 * Modal displayed when users attempt to access premium features
 * without an active subscription. Provides clear upgrade path.
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../providers/ThemeProvider';
import { Button } from './Button';

const { width, height } = Dimensions.get('window');

export type PremiumFeatureType = 
  | 'unlimited_alarms' 
  | 'premium_sounds' 
  | 'white_noise' 
  | 'custom_audio' 
  | 'advanced_settings'
  | 'cloud_sync';

interface PremiumGateModalProps {
  visible: boolean;
  featureType: PremiumFeatureType;
  onClose: () => void;
  onUpgrade: () => void;
  currentLimit?: number;
  attemptedAction?: string;
}

const featureDetails = {
  unlimited_alarms: {
    icon: 'infinite',
    title: 'Unlock Unlimited Alarms',
    description: 'Free users are limited to 2 alarms. Upgrade to Premium for unlimited alarms and advanced scheduling.',
    benefits: [
      'Create unlimited alarms',
      'Advanced repeat patterns',
      'Custom alarm names',
      'Priority scheduling',
    ],
  },
  premium_sounds: {
    icon: 'musical-notes',
    title: 'Access Premium Sound Library',
    description: 'Unlock our full collection of professionally crafted alarm sounds and white noise tracks.',
    benefits: [
      'Premium alarm tones',
      'High-quality white noise',
      'Nature sounds collection',
      'Sleep-optimized audio',
    ],
  },
  white_noise: {
    icon: 'moon',
    title: 'Unlock White Noise Integration',
    description: 'Combine alarms with white noise for the perfect sleep-to-wake transition.',
    benefits: [
      'White noise with alarms',
      'Fade-in/out effects',
      'Sleep session tracking',
      'Custom duration settings',
    ],
  },
  custom_audio: {
    icon: 'cloud-upload',
    title: 'Upload Custom Audio',
    description: 'Wake up to your favorite songs or use your own white noise recordings.',
    benefits: [
      'Upload custom alarm sounds',
      'Personal white noise files',
      'Unlimited storage',
      'High-quality playback',
    ],
  },
  advanced_settings: {
    icon: 'settings',
    title: 'Advanced Alarm Settings',
    description: 'Fine-tune every aspect of your alarms with premium customization options.',
    benefits: [
      'Custom fade-in duration',
      'Volume ramping',
      'Snooze customization',
      'Audio output routing',
    ],
  },
  cloud_sync: {
    icon: 'sync',
    title: 'Cloud Sync & Backup',
    description: 'Keep your alarms and settings synchronized across all your devices.',
    benefits: [
      'Cross-device sync',
      'Automatic backup',
      'Settings migration',
      'Data recovery',
    ],
  },
};

export const PremiumGateModal: React.FC<PremiumGateModalProps> = ({
  visible,
  featureType,
  onClose,
  onUpgrade,
  currentLimit,
  attemptedAction,
}) => {
  const { theme } = useTheme();
  const feature = featureDetails[featureType];

  const getLimitMessage = () => {
    switch (featureType) {
      case 'unlimited_alarms':
        return `You've reached the limit of ${currentLimit || 2} alarms on the free plan.`;
      case 'premium_sounds':
        return 'This sound is only available with Premium.';
      case 'white_noise':
        return 'White noise integration requires Premium.';
      case 'custom_audio':
        return 'Custom audio uploads require Premium.';
      case 'advanced_settings':
        return 'Advanced settings are only available with Premium.';
      case 'cloud_sync':
        return 'Cloud synchronization requires Premium.';
      default:
        return 'This feature requires Premium.';
    }
  };

  const styles = StyleSheet.create({
    modal: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      margin: theme.spacing[4],
      maxHeight: height * 0.8,
      width: width - (theme.spacing[4] * 2),
      maxWidth: 400,
    },
    header: {
      alignItems: 'center',
      padding: theme.spacing[6],
      paddingBottom: theme.spacing[4],
    },
    iconContainer: {
      backgroundColor: theme.colors.primary + '20',
      borderRadius: theme.borderRadius.full,
      width: 80,
      height: 80,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing[3],
    },
    closeButton: {
      position: 'absolute',
      top: theme.spacing[4],
      right: theme.spacing[4],
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.borderRadius.full,
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: theme.typography.sizes.xl,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      textAlign: 'center',
      marginBottom: theme.spacing[2],
    },
    description: {
      fontSize: theme.typography.sizes.md,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    scrollView: {
      maxHeight: height * 0.4,
    },
    content: {
      paddingHorizontal: theme.spacing[6],
    },
    limitMessage: {
      backgroundColor: theme.colors.warning + '20',
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing[3],
      marginBottom: theme.spacing[4],
      alignItems: 'center',
    },
    limitText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.warning,
      fontWeight: theme.typography.fontWeight.medium,
      textAlign: 'center',
    },
    benefitsContainer: {
      marginBottom: theme.spacing[4],
    },
    benefitsTitle: {
      fontSize: theme.typography.sizes.md,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing[3],
      textAlign: 'center',
    },
    benefitsList: {
      gap: theme.spacing[2],
    },
    benefitItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    benefitIcon: {
      marginRight: theme.spacing[2],
    },
    benefitText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      flex: 1,
    },
    trialHighlight: {
      backgroundColor: theme.colors.success + '20',
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing[3],
      marginBottom: theme.spacing[4],
      alignItems: 'center',
    },
    trialText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.success,
      fontWeight: theme.typography.fontWeight.semibold,
      textAlign: 'center',
    },
    footer: {
      padding: theme.spacing[6],
      paddingTop: theme.spacing[4],
    },
    upgradeButton: {
      marginBottom: theme.spacing[3],
    },
    cancelButton: {
      alignSelf: 'center',
    },
  });

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity 
        style={styles.modal} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <TouchableOpacity 
          style={styles.container} 
          activeOpacity={1}
          onPress={() => {}} // Prevent modal close when tapping inside
        >
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons 
              name="close" 
              size={18} 
              color={theme.colors.textSecondary} 
            />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons 
                name={feature.icon as any} 
                size={36} 
                color={theme.colors.primary} 
              />
            </View>
            <Text style={styles.title}>{feature.title}</Text>
            <Text style={styles.description}>{feature.description}</Text>
          </View>

          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.limitMessage}>
              <Text style={styles.limitText}>{getLimitMessage()}</Text>
            </View>

            <View style={styles.trialHighlight}>
              <Text style={styles.trialText}>
                🎉 Start with a 7-day free trial!{'\n'}
                Full access to all premium features
              </Text>
            </View>

            <View style={styles.benefitsContainer}>
              <Text style={styles.benefitsTitle}>Premium Benefits:</Text>
              <View style={styles.benefitsList}>
                {feature.benefits.map((benefit, index) => (
                  <View key={index} style={styles.benefitItem}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={theme.colors.success}
                      style={styles.benefitIcon}
                    />
                    <Text style={styles.benefitText}>{benefit}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title="Upgrade to Premium"
              variant="primary"
              onPress={onUpgrade}
              style={styles.upgradeButton}
              fullWidth
              leftIcon="rocket"
            />

            <Button
              title="Maybe Later"
              variant="ghost"
              onPress={onClose}
              style={styles.cancelButton}
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export default PremiumGateModal;