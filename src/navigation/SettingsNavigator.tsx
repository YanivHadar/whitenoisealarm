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
      fontWeight: theme.fontWeight.semibold,
      fontSize: theme.fontSize.lg,
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
    </Stack.Navigator>
  );
};

export default SettingsNavigator;