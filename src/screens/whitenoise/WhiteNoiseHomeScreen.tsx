/**
 * White Noise Home Screen
 * 
 * Main white noise interface with sound selection,
 * session management, and playback controls.
 */

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { WhiteNoiseStackScreenProps } from '../../types/navigation';
import { useTheme } from '../../components/providers/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';

type WhiteNoiseHomeScreenProps = WhiteNoiseStackScreenProps<'WhiteNoiseHome'>;

export const WhiteNoiseHomeScreen: React.FC<WhiteNoiseHomeScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();

  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="musical-notes" size={64} color={theme.colors.primary} />
        <Text style={styles.title}>White Noise</Text>
        <Text style={styles.subtitle}>
          Soothing sounds for better sleep and relaxation
        </Text>
        <Text style={styles.comingSoon}>
          Full white noise functionality coming in Phase 5
        </Text>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing[8],
  },
  title: {
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[2],
  },
  subtitle: {
    fontSize: theme.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing[4],
  },
  comingSoon: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default WhiteNoiseHomeScreen;