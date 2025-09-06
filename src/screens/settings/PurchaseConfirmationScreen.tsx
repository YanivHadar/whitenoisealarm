/**
 * Purchase Confirmation Screen
 * 
 * Final confirmation screen before purchasing a subscription
 * with clear pricing, terms, and purchase processing.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../components/providers/ThemeProvider';
import { Button } from '../../components/ui/Button';
import { subscriptionService, SubscriptionPlan } from '../../services/subscription-service';
import { SettingsStackScreenProps } from '../../types/navigation';

type PurchaseConfirmationScreenProps = SettingsStackScreenProps<'PurchaseConfirmation'>;

export const PurchaseConfirmationScreen: React.FC<PurchaseConfirmationScreenProps> = ({ 
  navigation, 
  route 
}) => {
  const { theme } = useTheme();
  const { planId, plan } = route.params;
  const [purchasing, setPurchasing] = useState(false);

  const handlePurchase = async () => {
    try {
      setPurchasing(true);

      const result = await subscriptionService.purchaseSubscription(planId);

      if (result.success) {
        // Navigate to success screen
        navigation.replace('SubscriptionSuccess', {
          planId,
          plan,
        });
      } else {
        Alert.alert(
          'Purchase Failed',
          result.error || 'Unable to complete purchase. Please try again.',
          [
            {
              text: 'Try Again',
              onPress: () => setPurchasing(false),
            },
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert(
        'Purchase Error',
        'An unexpected error occurred. Please try again.',
        [
          {
            text: 'Try Again',
            onPress: () => setPurchasing(false),
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }
  };

  const handleTermsPress = () => {
    Linking.openURL('https://example.com/terms'); // Replace with actual terms URL
  };

  const handlePrivacyPress = () => {
    Linking.openURL('https://example.com/privacy'); // Replace with actual privacy URL
  };

  const handleCancel = () => {
    if (purchasing) {
      Alert.alert(
        'Cancel Purchase',
        'Are you sure you want to cancel this purchase?',
        [
          {
            text: 'Continue Purchase',
            style: 'cancel',
          },
          {
            text: 'Cancel',
            style: 'destructive',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

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
    },
    header: {
      alignItems: 'center',
      marginBottom: theme.spacing[6],
    },
    icon: {
      marginBottom: theme.spacing[3],
    },
    title: {
      fontSize: theme.typography.sizes['2xl'],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      textAlign: 'center',
      marginBottom: theme.spacing[2],
    },
    subtitle: {
      fontSize: theme.typography.sizes.md,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    planCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing[4],
      marginBottom: theme.spacing[6],
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    planTitle: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing[1],
    },
    planDescription: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing[3],
    },
    priceContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'center',
      marginBottom: theme.spacing[3],
    },
    price: {
      fontSize: theme.typography.sizes['3xl'],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.primary,
    },
    period: {
      fontSize: theme.typography.sizes.md,
      color: theme.colors.textSecondary,
      marginLeft: theme.spacing[1],
    },
    trialContainer: {
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
    featuresContainer: {
      marginBottom: theme.spacing[4],
    },
    featuresTitle: {
      fontSize: theme.typography.sizes.md,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing[3],
    },
    featuresList: {
      marginBottom: theme.spacing[4],
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing[2],
    },
    featureIcon: {
      marginRight: theme.spacing[2],
    },
    featureText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      flex: 1,
    },
    termsContainer: {
      marginBottom: theme.spacing[6],
    },
    termsText: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: theme.spacing[2],
    },
    termsLinks: {
      flexDirection: 'row',
      justifyContent: 'center',
      flexWrap: 'wrap',
    },
    termsLink: {
      color: theme.colors.primary,
      textDecorationLine: 'underline',
    },
    linkSeparator: {
      marginHorizontal: theme.spacing[1],
    },
    footer: {
      marginTop: 'auto',
      paddingTop: theme.spacing[4],
    },
    purchaseButton: {
      marginBottom: theme.spacing[3],
    },
    cancelButton: {
      alignSelf: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Ionicons
            name="card"
            size={48}
            color={theme.colors.primary}
            style={styles.icon}
          />
          <Text style={styles.title}>Complete Purchase</Text>
          <Text style={styles.subtitle}>
            Review your subscription details and complete your purchase
          </Text>
        </View>

        <View style={styles.planCard}>
          <Text style={styles.planTitle}>{plan.title}</Text>
          <Text style={styles.planDescription}>{plan.description}</Text>

          <View style={styles.priceContainer}>
            <Text style={styles.price}>{plan.price}</Text>
            <Text style={styles.period}>/{plan.period}</Text>
          </View>

          {plan.id.includes('monthly') && (
            <View style={styles.trialContainer}>
              <Text style={styles.trialText}>
                🎉 7-day free trial included!{'\n'}
                You won't be charged until {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
              </Text>
            </View>
          )}

          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>What you'll get:</Text>
            <View style={styles.featuresList}>
              {plan.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={theme.colors.success}
                    style={styles.featureIcon}
                  />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.termsContainer}>
          <Text style={styles.termsText}>
            By purchasing, you agree to auto-renewal. You can cancel anytime in your device settings.
            Subscription automatically renews unless canceled at least 24 hours before the end of the current period.
          </Text>
          <View style={styles.termsLinks}>
            <Text
              style={[styles.termsText, styles.termsLink]}
              onPress={handleTermsPress}
            >
              Terms of Service
            </Text>
            <Text style={[styles.termsText, styles.linkSeparator]}>•</Text>
            <Text
              style={[styles.termsText, styles.termsLink]}
              onPress={handlePrivacyPress}
            >
              Privacy Policy
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            title={purchasing ? 'Processing...' : `Purchase ${plan.title}`}
            variant="primary"
            onPress={handlePurchase}
            disabled={purchasing}
            loading={purchasing}
            style={styles.purchaseButton}
            fullWidth
            leftIcon={purchasing ? undefined : 'card'}
          />

          <Button
            title="Cancel"
            variant="ghost"
            onPress={handleCancel}
            disabled={purchasing}
            style={styles.cancelButton}
          />
        </View>
      </ScrollView>
    </View>
  );
};

export default PurchaseConfirmationScreen;