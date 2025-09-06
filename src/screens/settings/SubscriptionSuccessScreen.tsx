/**
 * Subscription Success Screen
 * 
 * Post-purchase success screen with welcome message,
 * feature highlights, and onboarding guidance.
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../components/providers/ThemeProvider';
import { Button } from '../../components/ui/Button';
import { SubscriptionPlan } from '../../services/subscription-service';
import { SettingsStackScreenProps } from '../../types/navigation';

const { width } = Dimensions.get('window');

interface FeatureHighlightProps {
  icon: string;
  title: string;
  description: string;
}

const FeatureHighlight: React.FC<FeatureHighlightProps> = ({ icon, title, description }) => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing[4],
      marginBottom: theme.spacing[3],
      alignItems: 'center',
    },
    icon: {
      backgroundColor: theme.colors.primary + '20',
      borderRadius: theme.borderRadius.full,
      width: 60,
      height: 60,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing[3],
    },
    title: {
      fontSize: theme.typography.sizes.md,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      textAlign: 'center',
      marginBottom: theme.spacing[1],
    },
    description: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.icon}>
        <Ionicons name={icon as any} size={24} color={theme.colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
};

type SubscriptionSuccessScreenProps = SettingsStackScreenProps<'SubscriptionSuccess'>;

export const SubscriptionSuccessScreen: React.FC<SubscriptionSuccessScreenProps> = ({ 
  navigation, 
  route 
}) => {
  const { theme } = useTheme();
  const { planId, plan } = route.params;

  useEffect(() => {
    // Reset the navigation stack to prevent going back to purchase screens
    navigation.reset({
      index: 0,
      routes: [
        { name: 'SettingsHome' },
        { name: 'SubscriptionSettings' },
      ],
    });
  }, [navigation]);

  const handleGetStarted = () => {
    // Navigate to main app and potentially show feature highlights
    navigation.navigate('SettingsHome');
  };

  const handleExploreFeatures = () => {
    // Navigate to main app and show premium features
    navigation.getParent()?.navigate('Alarms');
  };

  const features = [
    {
      icon: 'infinite',
      title: 'Unlimited Alarms',
      description: 'Create as many alarms as you need for your perfect schedule'
    },
    {
      icon: 'musical-notes',
      title: 'Premium Sound Library',
      description: 'Access our full collection of high-quality white noise and alarm sounds'
    },
    {
      icon: 'settings',
      title: 'Advanced Settings',
      description: 'Fine-tune your alarms with custom fade-in/out and white noise integration'
    },
    {
      icon: 'cloud-upload',
      title: 'Custom Audio',
      description: 'Upload your own audio files for truly personalized alarm experiences'
    },
    {
      icon: 'sync',
      title: 'Cloud Sync',
      description: 'Your settings sync across all your devices automatically'
    },
    {
      icon: 'help-circle',
      title: 'Priority Support',
      description: 'Get faster response times and premium customer support'
    },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      padding: theme.spacing[4],
      alignItems: 'center',
    },
    header: {
      alignItems: 'center',
      marginBottom: theme.spacing[6],
      paddingVertical: theme.spacing[4],
    },
    successIcon: {
      backgroundColor: theme.colors.success + '20',
      borderRadius: theme.borderRadius.full,
      width: 100,
      height: 100,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing[4],
    },
    title: {
      fontSize: theme.typography.sizes['3xl'],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      textAlign: 'center',
      marginBottom: theme.spacing[2],
    },
    subtitle: {
      fontSize: theme.typography.sizes.lg,
      color: theme.colors.success,
      fontWeight: theme.typography.fontWeight.semibold,
      textAlign: 'center',
      marginBottom: theme.spacing[2],
    },
    description: {
      fontSize: theme.typography.sizes.md,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    planInfo: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing[4],
      marginBottom: theme.spacing[6],
      width: '100%',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.primary + '30',
    },
    planTitle: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.primary,
      marginBottom: theme.spacing[1],
    },
    planPrice: {
      fontSize: theme.typography.sizes.md,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing[2],
    },
    trialInfo: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.success,
      fontWeight: theme.typography.fontWeight.medium,
      textAlign: 'center',
    },
    featuresSection: {
      width: '100%',
      marginBottom: theme.spacing[6],
    },
    featuresTitle: {
      fontSize: theme.typography.sizes.xl,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      textAlign: 'center',
      marginBottom: theme.spacing[4],
    },
    featuresGrid: {
      width: '100%',
    },
    footer: {
      width: '100%',
      marginTop: theme.spacing[4],
    },
    getStartedButton: {
      marginBottom: theme.spacing[3],
    },
    exploreButton: {
      alignSelf: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.successIcon}>
            <Ionicons 
              name="checkmark" 
              size={48} 
              color={theme.colors.success} 
            />
          </View>
          
          <Text style={styles.title}>Welcome to Premium!</Text>
          <Text style={styles.subtitle}>{plan.title} Activated</Text>
          <Text style={styles.description}>
            You now have access to all premium features for the ultimate sleep experience
          </Text>
        </View>

        <View style={styles.planInfo}>
          <Text style={styles.planTitle}>{plan.title}</Text>
          <Text style={styles.planPrice}>{plan.price}/{plan.period}</Text>
          {plan.id.includes('monthly') && (
            <Text style={styles.trialInfo}>
              🎉 Your 7-day free trial has started!{'\n'}
              First charge: {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
            </Text>
          )}
        </View>

        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>Your Premium Features</Text>
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <FeatureHighlight
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
              />
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            title="Get Started"
            variant="primary"
            onPress={handleGetStarted}
            style={styles.getStartedButton}
            fullWidth
            leftIcon="rocket"
          />

          <Button
            title="Explore Premium Features"
            variant="ghost"
            onPress={handleExploreFeatures}
            style={styles.exploreButton}
          />
        </View>
      </ScrollView>
    </View>
  );
};

export default SubscriptionSuccessScreen;