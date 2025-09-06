import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../components/providers/ThemeProvider';
import { WhiteNoiseStackScreenProps } from '../../types/navigation';

type SoundLibraryScreenProps = WhiteNoiseStackScreenProps<'SoundLibrary'>;

export default function SoundLibraryScreen({ navigation, route }: SoundLibraryScreenProps) {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    text: {
      color: theme.text,
      fontSize: 16,
      textAlign: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Sound Library Screen - Coming Soon</Text>
    </View>
  );
}