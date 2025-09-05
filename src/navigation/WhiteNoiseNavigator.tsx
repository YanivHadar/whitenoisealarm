/**
 * White Noise Navigator
 * 
 * Stack navigator for white noise features including
 * sound library, playback controls, and session management.
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../components/providers/ThemeProvider';
import { WhiteNoiseStackParamList } from '../types/navigation';

// Import screens
import { WhiteNoiseHomeScreen } from '../screens/whitenoise/WhiteNoiseHomeScreen';

const Stack = createStackNavigator<WhiteNoiseStackParamList>();

export const WhiteNoiseNavigator: React.FC = () => {
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
      initialRouteName="WhiteNoiseHome"
    >
      <Stack.Screen
        name="WhiteNoiseHome"
        component={WhiteNoiseHomeScreen}
        options={{
          headerShown: false, // Custom header in component
        }}
      />
    </Stack.Navigator>
  );
};

export default WhiteNoiseNavigator;