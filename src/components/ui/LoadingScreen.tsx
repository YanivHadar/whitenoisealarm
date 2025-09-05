/**
 * Loading Screen Component
 * 
 * Full-screen loading indicator shown during
 * authentication initialization and app startup.
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = "Loading..." 
}) => {
  const { theme } = useTheme();

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* App Logo/Icon could go here */}
        <Text style={styles.appName}>Alarm & White Noise</Text>
        
        <View style={styles.loadingIndicator}>
          <ActivityIndicator 
            size="large" 
            color={theme.colors.primary} 
          />
          <Text style={styles.loadingText}>{message}</Text>
        </View>
      </View>
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing[8],
  },
  appName: {
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing[12],
    textAlign: 'center',
  },
  loadingIndicator: {
    alignItems: 'center',
    gap: theme.spacing[4],
  },
  loadingText: {
    fontSize: theme.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});

export default LoadingScreen;