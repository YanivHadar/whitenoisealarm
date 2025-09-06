/**
 * Subscription Settings Screen
 * 
 * Comprehensive subscription management interface with current status,
 * plan details, upgrade/downgrade options, and cancellation flow.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../components/providers/ThemeProvider';
import { Button } from '../../components/ui/Button';
import { subscriptionService, SubscriptionStatus, SubscriptionPlan } from '../../services/subscription-service';
import { SettingsStackScreenProps } from '../../types/navigation';

interface InfoRowProps {
  icon: string;
  label: string;
  value: string;
  onPress?: () => void;
}

const InfoRow: React.FC<InfoRowProps> = ({ icon, label, value, onPress }) => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing[3],
      paddingHorizontal: theme.spacing[4],
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    icon: {
      marginRight: theme.spacing[3],
    },
    content: {
      flex: 1,
    },
    label: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      marginBottom: 2,
    },
    value: {
      fontSize: theme.typography.sizes.md,
      color: theme.colors.textPrimary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    arrow: {
      marginLeft: theme.spacing[2],
    },
  });

  const Wrapper = onPress ? 
    ({ children }: any) => (
      <TouchableOpacity onPress={onPress} style={styles.container}>
        {children}
      </TouchableOpacity>
    ) : 
    ({ children }: any) => (
      <View style={styles.container}>
        {children}
      </View>
    );

  return (
    <Wrapper>
      <Ionicons
        name={icon as any}
        size={20}
        color={theme.colors.textSecondary}
        style={styles.icon}
      />
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      {onPress && (
        <Ionicons
          name="chevron-forward"
          size={16}
          color={theme.colors.textSecondary}
          style={styles.arrow}
        />
      )}
    </Wrapper>
  );
};

type SubscriptionSettingsScreenProps = SettingsStackScreenProps<'SubscriptionSettings'>;

export const SubscriptionSettingsScreen: React.FC<SubscriptionSettingsScreenProps> = ({ 
  navigation 
}) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      
      const [subscriptionStatus, plans] = await Promise.all([
        subscriptionService.getSubscriptionStatus(),
        subscriptionService.getSubscriptionPlans(),
      ]);

      setStatus(subscriptionStatus);
      setAvailablePlans(plans);
    } catch (error) {
      console.error('Error loading subscription data:', error);
      Alert.alert('Error', 'Failed to load subscription information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSubscriptionData();
    setRefreshing(false);
  };

  const handleManageSubscription = async () => {
    const platformMessage = Platform.OS === 'ios' 
      ? 'You can manage your subscription in iOS Settings > Apple ID > Subscriptions'
      : 'You can manage your subscription in Google Play Store > Subscriptions';

    Alert.alert(
      'Manage Subscription',
      platformMessage,
      [
        {
          text: 'Open Settings',
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('App-prefs:APPLE_ID');
            } else {
              Linking.openURL('https://play.google.com/store/account/subscriptions');
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handleRestorePurchases = async () => {
    try {
      setRefreshing(true);
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
      setRefreshing(false);
    }
  };

  const handleUpgrade = () => {
    navigation.navigate('Subscription');
  };

  const handleCancelSubscription = async () => {
    const result = await subscriptionService.cancelSubscription();
    
    Alert.alert(
      'Cancel Subscription',
      result.error || 'To cancel your subscription, please follow the instructions for your platform:',
      [
        {
          text: 'Open Settings',
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('App-prefs:APPLE_ID');
            } else {
              Linking.openURL('https://play.google.com/store/account/subscriptions');
            }
          },
        },
        {
          text: 'Not Now',
          style: 'cancel',
        },
      ]
    );
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getCurrentPlan = () => {
    if (!status?.planId) return null;
    return availablePlans.find(plan => plan.id === status.planId);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading subscription details...
        </Text>
      </View>
    );
  }

  const currentPlan = getCurrentPlan();

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
      paddingBottom: theme.spacing[8],
    },
    section: {
      backgroundColor: theme.colors.surface,
      marginBottom: theme.spacing[4],
    },
    sectionHeader: {
      paddingHorizontal: theme.spacing[4],
      paddingVertical: theme.spacing[3],
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    sectionTitle: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    statusCard: {
      backgroundColor: theme.colors.surface,
      margin: theme.spacing[4],
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing[4],
      alignItems: 'center',
      borderWidth: 1,
      borderColor: status?.isPremium ? theme.colors.success + '30' : theme.colors.border,
    },
    statusIcon: {
      backgroundColor: status?.isPremium ? theme.colors.success + '20' : theme.colors.surfaceVariant,
      borderRadius: theme.borderRadius.full,
      width: 60,
      height: 60,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing[3],
    },
    statusTitle: {
      fontSize: theme.typography.sizes.xl,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing[1],
    },
    statusSubtitle: {
      fontSize: theme.typography.sizes.md,
      color: status?.isPremium ? theme.colors.success : theme.colors.textSecondary,
      textAlign: 'center',
    },
    actionButtons: {
      padding: theme.spacing[4],
      gap: theme.spacing[3],
    },
    upgradeButton: {
      marginBottom: theme.spacing[2],
    },
    freeUserContainer: {
      padding: theme.spacing[4],
    },
    freeUserTitle: {
      fontSize: theme.typography.sizes.xl,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      textAlign: 'center',
      marginBottom: theme.spacing[2],
    },
    freeUserSubtitle: {
      fontSize: theme.typography.sizes.md,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing[6],
    },
  });

  if (!status?.isPremium) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.freeUserContainer}>
            <Text style={styles.freeUserTitle}>Free Plan</Text>
            <Text style={styles.freeUserSubtitle}>
              You're currently using the free version of Alarm & White Noise
            </Text>

            <Button
              title="Upgrade to Premium"
              variant="primary"
              onPress={handleUpgrade}
              style={styles.upgradeButton}
              fullWidth
              leftIcon="rocket"
            />

            <Button
              title="Restore Purchases"
              variant="outline"
              onPress={handleRestorePurchases}
              loading={refreshing}
              fullWidth
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.statusCard}>
          <View style={styles.statusIcon}>
            <Ionicons 
              name="checkmark-circle" 
              size={24} 
              color={theme.colors.success} 
            />
          </View>
          <Text style={styles.statusTitle}>Premium Active</Text>
          <Text style={styles.statusSubtitle}>
            {currentPlan?.title || 'Premium Plan'}
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Subscription Details</Text>
          </View>

          <InfoRow
            icon="card"
            label="Plan"
            value={currentPlan?.title || 'Premium'}
          />

          {currentPlan && (
            <InfoRow
              icon="pricetag"
              label="Price"
              value={`${currentPlan.price}/${currentPlan.period}`}
            />
          )}

          {status.isInTrial && status.trialExpiresAt && (
            <InfoRow
              icon="time"
              label="Free Trial Ends"
              value={formatDate(status.trialExpiresAt)}
            />
          )}

          {status.expiresAt && (
            <InfoRow
              icon={status.willRenew ? "refresh" : "calendar"}
              label={status.willRenew ? "Next Billing" : "Expires"}
              value={formatDate(status.expiresAt)}
            />
          )}

          <InfoRow
            icon="sync"
            label="Auto-Renewal"
            value={status.willRenew ? "Enabled" : "Disabled"}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Manage Subscription</Text>
          </View>

          <InfoRow
            icon="settings"
            label="Platform Settings"
            value={Platform.OS === 'ios' ? "App Store" : "Google Play"}
            onPress={handleManageSubscription}
          />

          <InfoRow
            icon="download"
            label="Restore Purchases"
            value="Sync across devices"
            onPress={handleRestorePurchases}
          />
        </View>

        <View style={styles.actionButtons}>
          <Button
            title="Upgrade Plan"
            variant="primary"
            onPress={handleUpgrade}
            fullWidth
            leftIcon="arrow-up"
          />

          <Button
            title="Refresh Status"
            variant="outline"
            onPress={handleRefresh}
            loading={refreshing}
            fullWidth
            leftIcon="refresh"
          />

          <Button
            title="Cancel Subscription"
            variant="danger"
            onPress={handleCancelSubscription}
            fullWidth
            leftIcon="close-circle"
          />
        </View>
      </ScrollView>
    </View>
  );
};

export default SubscriptionSettingsScreen;