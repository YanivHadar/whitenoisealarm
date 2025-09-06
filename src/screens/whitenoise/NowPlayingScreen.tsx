import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../components/providers/ThemeProvider';
import { WhiteNoiseStackScreenProps } from '../../types/navigation';

type NowPlayingScreenProps = WhiteNoiseStackScreenProps<'NowPlaying'>;

export default function NowPlayingScreen({ navigation, route }: NowPlayingScreenProps) {
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
      <Text style={styles.text}>Now Playing Screen - Coming Soon</Text>
    </View>
  );
}