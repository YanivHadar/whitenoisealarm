/**
 * Root Navigator
 * 
 * Main navigation container that manages authentication
 * flow and app navigation state.
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { useTheme } from '../components/providers/ThemeProvider';
import { useAuthStore } from '../store/auth-store';
import { RootStackParamList } from '../types/navigation';

// Import navigators
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';

// Import components
import { LoadingScreen } from '../components/ui/LoadingScreen';

const Stack = createStackNavigator<RootStackParamList>();

const RootStackNavigator: React.FC = () => {
  const { isAuthenticated, isInitializing } = useAuthStore();
  const { theme } = useTheme();

  // Show loading screen while auth is initializing
  if (isInitializing) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: theme.colors.background },
        animationEnabled: true,
        gestureEnabled: true,
      }}
    >
      {isAuthenticated ? (
        <Stack.Screen
          name="Main"
          component={MainTabNavigator}
          options={{
            animationTypeForReplace: 'push',
          }}
        />
      ) : (
        <Stack.Screen
          name="Auth"
          component={AuthNavigator}
          options={{
            animationTypeForReplace: 'pop',
          }}
        />
      )}
    </Stack.Navigator>
  );
};

export const RootNavigator: React.FC = () => {
  const { theme } = useTheme();

  const navigationTheme = {
    dark: theme.colors.background === '#0A0D14', // Detect if dark theme
    colors: {
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.primary,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <RootStackNavigator />
    </NavigationContainer>
  );
};

export default RootNavigator;