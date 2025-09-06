/**
 * Alarm Navigator  
 * 
 * Stack navigator for alarm management screens including
 * alarm list, creation, editing, and details.
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../components/providers/ThemeProvider';
import { AlarmStackParamList } from '../types/navigation';

// Import screens
import { AlarmListScreen } from '../screens/alarms/AlarmListScreen';
import { CreateAlarmScreen } from '../screens/alarms/CreateAlarmScreen';
import { EditAlarmScreen } from '../screens/alarms/EditAlarmScreen';
import { SessionMonitoringScreen } from '../screens/sessions/SessionMonitoringScreen';

const Stack = createStackNavigator<AlarmStackParamList>();

export const AlarmNavigator: React.FC = () => {
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
      initialRouteName="AlarmList"
    >
      <Stack.Screen
        name="AlarmList"
        component={AlarmListScreen}
        options={{
          headerShown: false, // Alarm list has its own header
        }}
      />
      
      <Stack.Screen
        name="CreateAlarm"
        component={CreateAlarmScreen}
        options={{
          title: 'Create Alarm',
          presentation: 'modal',
        }}
      />

      <Stack.Screen
        name="EditAlarm"
        component={EditAlarmScreen}
        options={{
          title: 'Edit Alarm',
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

export default AlarmNavigator;