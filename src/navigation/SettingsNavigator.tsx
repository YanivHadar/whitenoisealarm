/**
 * Settings Navigator
 * 
 * Stack navigator for settings and configuration screens
 * including account, preferences, and app settings.
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../components/providers/ThemeProvider';
import { SettingsStackParamList } from '../types/navigation';

// Import screens
import { SettingsHomeScreen } from '../screens/settings/SettingsHomeScreen';
import { SubscriptionScreen } from '../screens/settings/SubscriptionScreen';
import { PurchaseConfirmationScreen } from '../screens/settings/PurchaseConfirmationScreen';
import { SubscriptionSuccessScreen } from '../screens/settings/SubscriptionSuccessScreen';
import { SubscriptionSettingsScreen } from '../screens/settings/SubscriptionSettingsScreen';

const Stack = createStackNavigator<SettingsStackParamList>();

export const SettingsNavigator: React.FC = () => {
  const { theme } = useTheme();

  const screenOptions = {
    headerStyle: {
      backgroundColor: theme.colors.surface,
      shadowColor: theme.colors.border,
      elevation: 1,
    },
    headerTintColor: theme.colors.text,
    headerTitleStyle: {
      fontWeight: theme.typography.fontWeight.semibold,
      fontSize: theme.typography.sizes.lg,
    },
    headerBackTitleVisible: false,
    cardStyle: {
      backgroundColor: theme.colors.background,
    },
  };

  return (
    <Stack.Navigator
      screenOptions={screenOptions}
      initialRouteName="SettingsHome"
    >
      <Stack.Screen
        name="SettingsHome"
        component={SettingsHomeScreen}
        options={{
          headerShown: false, // Custom header in component
        }}
      />

      <Stack.Screen
        name="Subscription"
        component={SubscriptionScreen}
        options={{
          title: 'Premium Subscription',
          headerShown: true,
        }}
      />

      <Stack.Screen
        name="PurchaseConfirmation"
        component={PurchaseConfirmationScreen}
        options={{
          title: 'Confirm Purchase',
          headerShown: true,
        }}
      />

      <Stack.Screen
        name="SubscriptionSuccess"
        component={SubscriptionSuccessScreen}
        options={{
          title: 'Welcome to Premium',
          headerShown: false, // Custom header in component
        }}
      />

      <Stack.Screen
        name="SubscriptionSettings"
        component={SubscriptionSettingsScreen}
        options={{
          title: 'Manage Subscription',
          headerShown: true,
        }}
      />
    </Stack.Navigator>
  );
};

export default SettingsNavigator;