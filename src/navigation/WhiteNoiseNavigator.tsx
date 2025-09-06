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
import SoundLibraryScreen from '../screens/whitenoise/SoundLibraryScreen';
import NowPlayingScreen from '../screens/whitenoise/NowPlayingScreen';
import SessionHistoryScreen from '../screens/whitenoise/SessionHistoryScreen';
import { SessionMonitoringScreen } from '../screens/sessions/SessionMonitoringScreen';

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
      initialRouteName="WhiteNoiseHome"
    >
      <Stack.Screen
        name="WhiteNoiseHome"
        component={WhiteNoiseHomeScreen}
        options={{
          headerShown: false, // Custom header in component
        }}
      />

      <Stack.Screen
        name="SoundLibrary"
        component={SoundLibraryScreen}
        options={{
          title: 'Sound Library',
        }}
      />

      <Stack.Screen
        name="NowPlaying"
        component={NowPlayingScreen}
        options={{
          title: 'Now Playing',
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="SessionHistory"
        component={SessionHistoryScreen}
        options={{
          title: 'Session History',
        }}
      />

      <Stack.Screen
        name="SessionMonitoring"
        component={SessionMonitoringScreen}
        options={{
          title: 'Session Monitor',
          headerShown: false, // Screen has its own custom header
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
};

export default WhiteNoiseNavigator;