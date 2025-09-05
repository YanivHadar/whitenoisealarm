/**
 * Welcome Screen
 * 
 * Initial screen shown to new users with app introduction
 * and sign-in/sign-up options.
 */

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { AuthStackScreenProps } from '../../types/navigation';
import { useTheme } from '../../components/providers/ThemeProvider';
import Button from '../../components/ui/Button';

type WelcomeScreenProps = AuthStackScreenProps<'Welcome'>;

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();

  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo/Header Section */}
        <View style={styles.header}>
          <Text style={styles.title}>Alarm & White Noise</Text>
          <Text style={styles.subtitle}>
            Your perfect sleep companion for restful nights and reliable wake-ups
          </Text>
        </View>

        {/* Feature Highlights */}
        <View style={styles.features}>
          <Text style={styles.featureText}>✨ Customizable alarms with white noise</Text>
          <Text style={styles.featureText}>🌙 Sleep-optimized dark interface</Text>
          <Text style={styles.featureText}>🔒 Secure biometric authentication</Text>
          <Text style={styles.featureText}>☁️ Sync across all your devices</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            title="Get Started"
            variant="primary"
            size="large"
            fullWidth
            onPress={() => navigation.navigate('SignUp')}
            containerStyle={styles.primaryButton}
          />
          
          <Button
            title="I already have an account"
            variant="ghost"
            size="medium"
            fullWidth
            onPress={() => navigation.navigate('SignIn')}
            containerStyle={styles.secondaryButton}
          />
        </View>
      </View>
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
    paddingHorizontal: theme.spacing[6],
    paddingVertical: theme.spacing[8],
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: theme.spacing[16],
  },
  title: {
    fontSize: theme.fontSize['3xl'],
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing[4],
  },
  subtitle: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: theme.lineHeight.relaxed * theme.fontSize.lg,
  },
  features: {
    alignItems: 'flex-start',
    marginVertical: theme.spacing[8],
  },
  featureText: {
    fontSize: theme.fontSize.base,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing[3],
    lineHeight: theme.lineHeight.normal * theme.fontSize.base,
  },
  actions: {
    gap: theme.spacing[4],
  },
  primaryButton: {
    marginBottom: theme.spacing[2],
  },
  secondaryButton: {
    // Additional styling if needed
  },
});

export default WelcomeScreen;