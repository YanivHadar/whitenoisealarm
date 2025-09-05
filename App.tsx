/**
 * Alarm & White Noise App
 * 
 * Main application component with complete navigation,
 * authentication, and theme management.
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-gesture-handler';

// Import providers
import { ThemeProvider } from './src/components/providers/ThemeProvider';

// Import navigation
import { RootNavigator } from './src/navigation/RootNavigator';

// Import auth initialization
import { initializeAuth } from './src/store/auth-store';

export default function App() {
  useEffect(() => {
    // Initialize authentication on app start
    initializeAuth();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StatusBar style="auto" />
        <RootNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
