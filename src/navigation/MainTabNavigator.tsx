/**
 * Main Tab Navigator
 * 
 * Bottom tab navigator for the main app functionality
 * with sleep-optimized design and accessibility.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/providers/ThemeProvider';
import { MainTabParamList } from '../types/navigation';

// Import navigators
import { AlarmNavigator } from './AlarmNavigator';
import { WhiteNoiseNavigator } from './WhiteNoiseNavigator';
import { SettingsNavigator } from './SettingsNavigator';

// Import components
import { FloatingSessionMonitor } from '../components/FloatingSessionMonitor';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator: React.FC = () => {
  const { theme } = useTheme();

  const tabBarOptions = {
    tabBarStyle: {
      backgroundColor: theme.colors.surface,
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      height: 88, // Increased for better touch targets
      paddingTop: 8,
      paddingBottom: 28, // Account for home indicator
    },
    tabBarActiveTintColor: theme.colors.primary,
    tabBarInactiveTintColor: theme.colors.textSecondary,
    tabBarLabelStyle: {
      fontSize: 12,
      fontWeight: theme.typography.fontWeight.medium,
      marginTop: 4,
    },
    headerShown: false,
  };

  const getTabBarIcon = (route: string, focused: boolean, color: string, size: number) => {
    let iconName: string;

    switch (route) {
      case 'Alarms':
        iconName = focused ? 'alarm' : 'alarm-outline';
        break;
      case 'WhiteNoise':
        iconName = focused ? 'musical-notes' : 'musical-notes-outline';
        break;
      case 'Settings':
        iconName = focused ? 'settings' : 'settings-outline';
        break;
      default:
        iconName = 'circle-outline';
    }

    return <Ionicons name={iconName as any} size={size} color={color} />;
  };

  return (
    <View style={styles.container}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          ...tabBarOptions,
          tabBarIcon: ({ focused, color, size }) =>
            getTabBarIcon(route.name, focused, color, size),
          // Accessibility
          tabBarAccessibilityLabel: `${route.name} tab`,
          tabBarTestID: `tab-${route.name.toLowerCase()}`,
        })}
      >
        <Tab.Screen
          name="Alarms"
          component={AlarmNavigator}
          options={{
            tabBarLabel: 'Alarms',
            tabBarBadge: undefined, // Can be used for active alarm count
          }}
        />

        <Tab.Screen
          name="WhiteNoise"
          component={WhiteNoiseNavigator}
          options={{
            tabBarLabel: 'White Noise',
          }}
        />

        <Tab.Screen
          name="Settings"
          component={SettingsNavigator}
          options={{
            tabBarLabel: 'Settings',
          }}
        />
      </Tab.Navigator>

      {/* Floating Session Monitor - appears across all tabs */}
      <FloatingSessionMonitor />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default MainTabNavigator;