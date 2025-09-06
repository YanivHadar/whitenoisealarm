/**
 * Subscription Screen
 * 
 * Main subscription selection interface with pricing tiers,
 * 7-day free trial, and purchase flow integration.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../components/providers/ThemeProvider';
import { Button } from '../../components/ui/Button';
import { subscriptionService, SubscriptionPlan, SubscriptionStatus } from '../../services/subscription-service';
import { SettingsStackScreenProps } from '../../types/navigation';

interface PlanCardProps {
  plan: SubscriptionPlan;
  isSelected: boolean;
  onSelect: () => void;
  isLoading: boolean;
}

const PlanCard: React.FC<PlanCardProps> = ({ plan, isSelected, onSelect, isLoading }) => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    card: {
      backgroundColor: isSelected ? theme.colors.primary : theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 2,
      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
      marginBottom: theme.spacing[4],
      overflow: 'hidden',
    },
    popularBadge: {
      position: 'absolute',
      top: 0,
      right: 0,
      backgroundColor: theme.colors.accent,
      paddingHorizontal: theme.spacing[2],
      paddingVertical: theme.spacing[1],
      borderBottomLeftRadius: theme.borderRadius.md,
    },
    popularText: {
      color: '#FFFFFF',
      fontSize: theme.typography.sizes.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    cardContent: {
      padding: theme.spacing[4],
    },
    planTitle: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: isSelected ? '#FFFFFF' : theme.colors.textPrimary,
      marginBottom: theme.spacing[1],
    },
    planDescription: {
      fontSize: theme.typography.sizes.sm,
      color: isSelected ? 'rgba(255, 255, 255, 0.8)' : theme.colors.textSecondary,
      marginBottom: theme.spacing[3],
    },
    priceContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: theme.spacing[3],
    },
    price: {
      fontSize: theme.typography.sizes['2xl'],
      fontWeight: theme.typography.fontWeight.bold,
      color: isSelected ? '#FFFFFF' : theme.colors.textPrimary,
    },
    period: {
      fontSize: theme.typography.sizes.sm,
      color: isSelected ? 'rgba(255, 255, 255, 0.8)' : theme.colors.textSecondary,
      marginLeft: theme.spacing[1],
    },
    trialText: {
      fontSize: theme.typography.sizes.xs,
      color: isSelected ? 'rgba(255, 255, 255, 0.9)' : theme.colors.textSecondary,
      fontStyle: 'italic',
      marginBottom: theme.spacing[3],
    },
    featuresList: {
      marginBottom: theme.spacing[4],
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing[1],
    },
    featureIcon: {
      marginRight: theme.spacing[2],
    },
    featureText: {
      fontSize: theme.typography.sizes.sm,
      color: isSelected ? 'rgba(255, 255, 255, 0.9)' : theme.colors.textSecondary,
      flex: 1,
    },
  });

  return (
    <View style={styles.card}>
      {plan.isPopular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularText}>MOST POPULAR</Text>
        </View>
      )}
      
      <View style={styles.cardContent}>
        <Text style={styles.planTitle}>{plan.title}</Text>
        <Text style={styles.planDescription}>{plan.description}</Text>
        
        <View style={styles.priceContainer}>
          <Text style={styles.price}>{plan.price}</Text>
          <Text style={styles.period}>/{plan.period}</Text>
        </View>

        {plan.id.includes('monthly') && (
          <Text style={styles.trialText}>7-day free trial included</Text>
        )}

        <View style={styles.featuresList}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={isSelected ? '#FFFFFF' : theme.colors.success}
                style={styles.featureIcon}
              />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <Button
          title={isSelected ? 'Selected' : 'Select Plan'}
          variant={isSelected ? 'secondary' : 'primary'}
          onPress={onSelect}
          disabled={isLoading}
          fullWidth
        />
      </View>
    </View>
  );
};

type SubscriptionScreenProps = SettingsStackScreenProps<'Subscription'>;

export const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<SubscriptionStatus | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      
      // Load available plans and current status
      const [availablePlans, status] = await Promise.all([
        subscriptionService.getSubscriptionPlans(),
        subscriptionService.getSubscriptionStatus(),
      ]);

      setPlans(availablePlans);
      setCurrentStatus(status);

      // Pre-select popular plan or current plan
      if (status.isPremium && status.planId) {
        setSelectedPlan(status.planId);
      } else {
        const popularPlan = availablePlans.find(p => p.isPopular);
        if (popularPlan) {
          setSelectedPlan(popularPlan.id);
        }
      }
    } catch (error) {
      console.error('Error loading subscription data:', error);
      Alert.alert('Error', 'Failed to load subscription plans. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleContinue = () => {
    if (!selectedPlan) {
      Alert.alert('Select Plan', 'Please select a subscription plan to continue.');
      return;
    }

    const plan = plans.find(p => p.id === selectedPlan);
    if (!plan) return;

    navigation.navigate('PurchaseConfirmation', { 
      planId: selectedPlan,
      plan: plan,
    });
  };

  const handleRestorePurchases = async () => {
    try {
      setPurchasing(true);
      const result = await subscriptionService.restorePurchases();
      
      if (result.success) {
        Alert.alert('Success', 'Your purchases have been restored.');
        await loadSubscriptionData();
      } else {
        Alert.alert('No Purchases Found', result.error || 'No previous purchases found to restore.');
      }
    } catch (error) {
      console.error('Error restoring purchases:', error);
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading subscription plans...
        </Text>
      </View>
    );
  }

  if (currentStatus?.isPremium) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <View style={styles.premiumStatus}>
            <Ionicons name="checkmark-circle" size={64} color={theme.colors.success} />
            <Text style={[styles.premiumTitle, { color: theme.colors.textPrimary }]}>
              Premium Active
            </Text>
            <Text style={[styles.premiumDescription, { color: theme.colors.textSecondary }]}>
              You have access to all premium features
            </Text>
            
            {currentStatus.expiresAt && (
              <Text style={[styles.expirationText, { color: theme.colors.textSecondary }]}>
                {currentStatus.willRenew ? 'Renews' : 'Expires'} on{' '}
                {new Date(currentStatus.expiresAt).toLocaleDateString()}
              </Text>
            )}

            <Button
              title="Manage Subscription"
              variant="primary"
              onPress={() => navigation.navigate('SubscriptionSettings')}
              style={styles.manageButton}
              fullWidth
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: theme.spacing[3],
      fontSize: theme.typography.sizes.md,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      padding: theme.spacing[4],
      paddingBottom: theme.spacing[8],
    },
    header: {
      alignItems: 'center',
      marginBottom: theme.spacing[6],
    },
    title: {
      fontSize: theme.typography.sizes['3xl'],
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
    plansContainer: {
      marginBottom: theme.spacing[6],
    },
    footer: {
      marginTop: theme.spacing[4],
    },
    continueButton: {
      marginBottom: theme.spacing[3],
    },
    restoreButton: {
      alignSelf: 'center',
    },
    premiumStatus: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing[8],
    },
    premiumTitle: {
      fontSize: theme.typography.sizes['2xl'],
      fontWeight: theme.typography.fontWeight.bold,
      marginTop: theme.spacing[4],
      marginBottom: theme.spacing[2],
    },
    premiumDescription: {
      fontSize: theme.typography.sizes.md,
      textAlign: 'center',
      marginBottom: theme.spacing[4],
    },
    expirationText: {
      fontSize: theme.typography.sizes.sm,
      marginBottom: theme.spacing[6],
    },
    manageButton: {
      minWidth: 200,
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Unlock Premium</Text>
          <Text style={styles.subtitle}>
            Get unlimited alarms, premium sounds, and advanced features to optimize your sleep routine
          </Text>
        </View>

        <View style={styles.plansContainer}>
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isSelected={selectedPlan === plan.id}
              onSelect={() => handlePlanSelect(plan.id)}
              isLoading={purchasing}
            />
          ))}
        </View>

        <View style={styles.footer}>
          <Button
            title="Continue"
            variant="primary"
            onPress={handleContinue}
            disabled={!selectedPlan || purchasing}
            loading={purchasing}
            style={styles.continueButton}
            fullWidth
          />

          <Button
            title="Restore Purchases"
            variant="ghost"
            onPress={handleRestorePurchases}
            disabled={purchasing}
            style={styles.restoreButton}
          />
        </View>
      </ScrollView>
    </View>
  );
};

export default SubscriptionScreen;