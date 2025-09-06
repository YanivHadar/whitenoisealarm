/**
 * Onboarding Complete Screen
 * 
 * Final step in the onboarding process that welcomes users
 * and guides them to create their first alarm or explore features.
 * Provides smooth transition to the main app experience.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackScreenProps } from '../../types/navigation';
import { useTheme } from '../../components/providers/ThemeProvider';
import Button from '../../components/ui/Button';

type OnboardingCompleteScreenProps = AuthStackScreenProps<'OnboardingComplete'>;

export const OnboardingCompleteScreen: React.FC<OnboardingCompleteScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));

  const styles = createStyles(theme);

  useEffect(() => {
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const handleGetStarted = () => {
    // This would typically navigate to the main app
    // For now, we'll handle this in the auth navigator logic
    console.log('Onboarding completed - transitioning to main app');
  };

  const handleCreateFirstAlarm = () => {
    // This would navigate directly to alarm creation
    // Implementation would depend on main app navigation structure
    handleGetStarted();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Success Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconBackground}>
              <Ionicons name="checkmark" size={48} color="#FFFFFF" />
            </View>
            <View style={styles.iconRing} />
          </View>

          {/* Welcome Message */}
          <View style={styles.messageContainer}>
            <Text style={styles.title}>You're All Set!</Text>
            <Text style={styles.subtitle}>
              Welcome to your personalized sleep optimization experience
            </Text>
          </View>

          {/* Feature Highlights */}
          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="alarm" size={20} color={theme.colors.primary} />
              </View>
              <Text style={styles.featureText}>
                Smart alarms that adapt to your sleep patterns
              </Text>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="musical-notes" size={20} color={theme.colors.primary} />
              </View>
              <Text style={styles.featureText}>
                Curated white noise library for better sleep
              </Text>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="analytics" size={20} color={theme.colors.primary} />
              </View>
              <Text style={styles.featureText}>
                Sleep insights and personalized recommendations
              </Text>
            </View>
          </View>

          {/* Quick Start Tips */}
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>Quick Start Tips</Text>
            
            <View style={styles.tipItem}>
              <Text style={styles.tipNumber}>1</Text>
              <Text style={styles.tipText}>
                Create your first alarm with white noise for tonight
              </Text>
            </View>

            <View style={styles.tipItem}>
              <Text style={styles.tipNumber}>2</Text>
              <Text style={styles.tipText}>
                Explore the sound library to find your perfect sleep sounds
              </Text>
            </View>

            <View style={styles.tipItem}>
              <Text style={styles.tipNumber}>3</Text>
              <Text style={styles.tipText}>
                Adjust settings for the best bedtime experience
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Create Your First Alarm"
          variant="primary"
          size="large"
          onPress={handleCreateFirstAlarm}
          containerStyle={styles.primaryButton}
        />
        
        <Button
          title="Explore Features"
          variant="secondary"
          size="large"
          onPress={handleGetStarted}
          containerStyle={styles.secondaryButton}
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
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing[6],
    paddingTop: theme.spacing[8],
    alignItems: 'center',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: theme.spacing[8],
  },
  iconBackground: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.lg,
  },
  iconRing: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 56,
    borderWidth: 2,
    borderColor: theme.colors.success,
    opacity: 0.3,
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing[10],
  },
  title: {
    fontSize: theme.fontSize['4xl'],
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
    maxWidth: 280,
  },
  featuresContainer: {
    width: '100%',
    gap: theme.spacing[4],
    marginBottom: theme.spacing[8],
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[4],
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    borderRadius: theme.borderRadius.lg,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: theme.fontSize.base,
    color: theme.colors.text,
    lineHeight: theme.lineHeight.relaxed * theme.fontSize.base,
  },
  tipsContainer: {
    width: '100%',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[6],
    marginBottom: theme.spacing[4],
  },
  tipsTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing[4],
    textAlign: 'center',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing[3],
    marginBottom: theme.spacing[3],
  },
  tipNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    color: '#FFFFFF',
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    textAlign: 'center',
    lineHeight: 24,
  },
  tipText: {
    flex: 1,
    fontSize: theme.fontSize.base,
    color: theme.colors.textSecondary,
    lineHeight: theme.lineHeight.relaxed * theme.fontSize.base,
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

export default OnboardingCompleteScreen;