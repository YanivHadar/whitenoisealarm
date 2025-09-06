/**
 * Biometric Setup Screen
 * 
 * Guides users through setting up biometric authentication
 * during the onboarding process. Integrates with biometric service
 * and provides fallback options for unsupported devices.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackScreenProps } from '../../types/navigation';
import { useTheme } from '../../components/providers/ThemeProvider';
import { biometricService } from '../../services/biometric-service';
import Button from '../../components/ui/Button';

type BiometricSetupScreenProps = AuthStackScreenProps<'BiometricSetup'>;

export const BiometricSetupScreen: React.FC<BiometricSetupScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');
  const [isSupported, setIsSupported] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);

  const styles = createStyles(theme);

  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    try {
      const capabilities = await biometricService.getCapabilities();
      
      if (capabilities.isSupported && capabilities.isEnrolled) {
        setIsSupported(true);
        const typeName = biometricService.getBiometricTypeName(capabilities.availableTypes);
        setBiometricType(typeName);
      } else if (capabilities.isSupported && !capabilities.isEnrolled) {
        setIsSupported(true);
        setBiometricType('Biometric');
        // Show enrollment guidance
      } else {
        setIsSupported(false);
      }
    } catch (error) {
      console.error('Error checking biometric support:', error);
      setIsSupported(false);
    }
  };

  const handleSetupBiometric = async () => {
    if (!isSupported) {
      handleSkipBiometric();
      return;
    }

    setLoading(true);
    try {
      // Test biometric authentication first - this also acts as permission request
      const authResult = await biometricService.authenticate({
        promptTitle: 'Enable Biometric Authentication',
        promptDescription: `Enable ${biometricType} for quick and secure access to your alarms`
      });
      
      if (authResult.success) {
        setSetupComplete(true);
        Alert.alert(
          'Success!',
          `${biometricType} authentication has been enabled for your account.`,
          [
            {
              text: 'Continue',
              onPress: () => navigation.navigate('OnboardingComplete'),
            },
          ]
        );
      } else {
        Alert.alert(
          'Setup Failed',
          authResult.error || 'Failed to set up biometric authentication. You can enable this later in settings.',
          [
            { text: 'Try Again', onPress: handleSetupBiometric },
            { text: 'Skip for Now', onPress: handleSkipBiometric },
          ]
        );
      }
    } catch (error) {
      console.error('Biometric setup error:', error);
      Alert.alert(
        'Setup Error',
        'There was an error setting up biometric authentication. You can enable this later in settings.',
        [
          { text: 'Try Again', onPress: handleSetupBiometric },
          { text: 'Skip for Now', onPress: handleSkipBiometric },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSkipBiometric = () => {
    navigation.navigate('OnboardingComplete');
  };

  const getBiometricIcon = () => {
    if (biometricType.toLowerCase().includes('face')) {
      return 'scan';
    } else if (biometricType.toLowerCase().includes('finger')) {
      return 'finger-print';
    }
    return 'shield-checkmark';
  };

  const getBiometricDescription = () => {
    if (!isSupported) {
      return 'Biometric authentication is not available on this device, but you can still secure your account with a passcode.';
    }
    
    return `Use ${biometricType} to quickly and securely access your alarms without entering your password each time.`;
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
            <Ionicons 
              name={getBiometricIcon()} 
              size={64} 
              color={isSupported ? theme.colors.primary : theme.colors.textSecondary} 
            />
          </View>
          
          <Text style={styles.title}>
            {isSupported ? `Secure with ${biometricType}` : 'Security Setup'}
          </Text>
          
          <Text style={styles.subtitle}>
            {getBiometricDescription()}
          </Text>
        </View>

        {/* Benefits */}
        <View style={styles.benefitsContainer}>
          <View style={styles.benefitItem}>
            <Ionicons name="flash" size={24} color={theme.colors.primary} />
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>Quick Access</Text>
              <Text style={styles.benefitDescription}>
                Access your alarms instantly without typing passwords
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <Ionicons name="shield" size={24} color={theme.colors.primary} />
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>Enhanced Security</Text>
              <Text style={styles.benefitDescription}>
                Your sleep data stays protected with advanced security
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <Ionicons name="moon" size={24} color={theme.colors.primary} />
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>Sleep-Friendly</Text>
              <Text style={styles.benefitDescription}>
                No bright screens or typing required in the dark
              </Text>
            </View>
          </View>
        </View>

        {/* Status Indicator */}
        {setupComplete && (
          <View style={styles.successIndicator}>
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
            <Text style={styles.successText}>
              {biometricType} authentication enabled!
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title={isSupported ? `Enable ${biometricType}` : 'Continue'}
          variant="primary"
          size="large"
          onPress={handleSetupBiometric}
          loading={loading}
          disabled={setupComplete}
          containerStyle={styles.primaryButton}
        />
        
        {isSupported && !setupComplete && (
          <Button
            title="Skip for Now"
            variant="secondary"
            size="large"
            onPress={handleSkipBiometric}
            containerStyle={styles.secondaryButton}
          />
        )}
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
    flexGrow: 1,
    paddingHorizontal: theme.spacing[6],
    paddingTop: theme.spacing[8],
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing[8],
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing[6],
    ...theme.shadows.md,
  },
  title: {
    fontSize: theme.fontSize['3xl'],
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing[3],
  },
  subtitle: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: theme.lineHeight.relaxed * theme.fontSize.lg,
  },
  benefitsContainer: {
    gap: theme.spacing[6],
    marginBottom: theme.spacing[8],
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing[4],
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing[1],
  },
  benefitDescription: {
    fontSize: theme.fontSize.base,
    color: theme.colors.textSecondary,
    lineHeight: theme.lineHeight.relaxed * theme.fontSize.base,
  },
  successIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    backgroundColor: theme.colors.successBackground,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing[4],
  },
  successText: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.success,
  },
  actions: {
    padding: theme.spacing[6],
    gap: theme.spacing[3],
  },
  primaryButton: {
    minHeight: 56,
  },
  secondaryButton: {
    minHeight: 56,
  },
});

export default BiometricSetupScreen;