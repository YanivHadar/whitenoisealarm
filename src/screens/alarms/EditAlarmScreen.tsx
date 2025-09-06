/**
 * Edit Alarm Screen
 * 
 * Extends CreateAlarm functionality with pre-populated data
 * and specialized editing workflows for sleep optimization.
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ActivityIndicator,
  Alert 
} from 'react-native';
import { AlarmStackScreenProps } from '../../types/navigation';
import { useTheme } from '../../components/providers/ThemeProvider';
import { AlarmFormData } from '../../types/alarm';
// Import the main CreateAlarmScreen component to reuse logic
import { CreateAlarmScreen } from './CreateAlarmScreen';

type EditAlarmScreenProps = AlarmStackScreenProps<'EditAlarm'>;

export const EditAlarmScreen: React.FC<EditAlarmScreenProps> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { alarmId } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [alarmData, setAlarmData] = useState<AlarmFormData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const styles = createStyles(theme);

  useEffect(() => {
    loadAlarmData();
  }, [alarmId]);

  const loadAlarmData = async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Replace with actual alarm service call
      // const alarm = await AlarmService.getById(alarmId);
      
      // Mock data loading - in production this would come from the alarm service
      console.log('Loading alarm data for editing:', alarmId);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock alarm data - in production this would come from API
      const mockAlarmData: AlarmFormData = {
        name: 'Morning Alarm',
        time: '07:30',
        enabled: true,
        repeat_pattern: 'weekdays',
        repeat_days: [1, 2, 3, 4, 5], // Monday to Friday
        
        // Audio settings
        audio_file_url: 'https://example.com/gentle-wake.mp3',
        audio_output: 'auto',
        volume: 0.8,
        
        // Behavior settings
        vibration_enabled: true,
        snooze_enabled: true,
        snooze_duration: 10,
        snooze_count_limit: 3,
        
        // White noise integration
        white_noise_enabled: true,
        white_noise_file_url: 'https://example.com/rain.mp3',
        white_noise_category: 'nature',
        white_noise_volume: 0.6,
        white_noise_duration: 480, // 8 hours
        
        // Audio effects
        fade_in_duration: 5,
        fade_out_duration: 3,
      };

      setAlarmData(mockAlarmData);
      
    } catch (error) {
      console.error('Error loading alarm data:', error);
      setError('Failed to load alarm data. Please try again.');
      
      Alert.alert(
        'Loading Error',
        'Unable to load alarm data. Would you like to try again or go back?',
        [
          {
            text: 'Go Back',
            style: 'cancel',
            onPress: () => navigation.goBack()
          },
          {
            text: 'Retry',
            onPress: loadAlarmData
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading alarm settings...</Text>
          <Text style={styles.loadingSubtext}>
            Fetching your alarm configuration
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !alarmData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Unable to Load Alarm</Text>
          <Text style={styles.errorText}>
            {error || 'The alarm data could not be retrieved.'}
          </Text>
          <View style={styles.errorButtons}>
            <View style={styles.buttonContainer}>
              <Text 
                style={styles.retryButton}
                onPress={loadAlarmData}
              >
                Try Again
              </Text>
            </View>
            <View style={styles.buttonContainer}>
              <Text 
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                Go Back
              </Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Render the CreateAlarmScreen component with pre-populated data
  // This is a specialized approach that reuses the comprehensive form logic
  return (
    <EditAlarmWrapper
      navigation={navigation}
      route={route}
      initialData={alarmData}
      alarmId={alarmId}
    />
  );
};

// Wrapper component that handles the edit-specific logic while reusing CreateAlarmScreen
interface EditAlarmWrapperProps {
  navigation: any;
  route: any;
  initialData: AlarmFormData;
  alarmId: string;
}

const EditAlarmWrapper: React.FC<EditAlarmWrapperProps> = ({ 
  navigation, 
  route, 
  initialData, 
  alarmId 
}) => {
  // Override the route params to include the initial data
  const editRoute = {
    ...route,
    params: {
      ...route.params,
      alarmId,
      initialData // Pass the loaded data to CreateAlarmScreen
    }
  };

  // Use the CreateAlarmScreen component with edit-specific behavior
  return <CreateAlarmScreen navigation={navigation} route={editRoute} />;
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing[8],
  },
  loadingText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginTop: theme.spacing[4],
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: theme.fontSize.base,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing[2],
    textAlign: 'center',
    lineHeight: theme.lineHeight.relaxed * theme.fontSize.base,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing[8],
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: theme.spacing[4],
  },
  errorTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing[3],
    textAlign: 'center',
  },
  errorText: {
    fontSize: theme.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: theme.lineHeight.relaxed * theme.fontSize.base,
    marginBottom: theme.spacing[6],
  },
  errorButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 300,
  },
  buttonContainer: {
    flex: 1,
    marginHorizontal: theme.spacing[2],
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    color: '#FFFFFF',
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    textAlign: 'center',
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  backButton: {
    backgroundColor: theme.colors.card,
    color: theme.colors.text,
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    textAlign: 'center',
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
});

export default EditAlarmScreen;