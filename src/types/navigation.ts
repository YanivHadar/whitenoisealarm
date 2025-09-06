/**
 * Navigation Types
 * 
 * TypeScript definitions for React Navigation
 * with complete type safety for all screens.
 */

import { NavigatorScreenParams } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { AlarmFormData } from './alarm';
import { SubscriptionPlan } from '../services/subscription-service';

// Auth Stack Navigation
export type AuthStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  BiometricSetup: undefined;
  OnboardingComplete: undefined;
};

// Main Tab Navigation
export type MainTabParamList = {
  Alarms: NavigatorScreenParams<AlarmStackParamList> | undefined;
  WhiteNoise: NavigatorScreenParams<WhiteNoiseStackParamList> | undefined;
  Settings: NavigatorScreenParams<SettingsStackParamList> | undefined;
};

// Alarm Stack Navigation
export type AlarmStackParamList = {
  AlarmList: undefined;
  CreateAlarm: { alarmId?: string; initialData?: AlarmFormData } | undefined;
  EditAlarm: { alarmId: string };
  AlarmDetails: { alarmId: string };
  SessionMonitoring: { sessionId: string };
};

// White Noise Stack Navigation
export type WhiteNoiseStackParamList = {
  WhiteNoiseHome: undefined;
  SoundLibrary: undefined;
  NowPlaying: { sessionId?: string } | undefined;
  SessionHistory: undefined;
  SessionMonitoring: { sessionId: string };
};

// Settings Stack Navigation
export type SettingsStackParamList = {
  SettingsHome: undefined;
  Account: undefined;
  Notifications: undefined;
  Audio: undefined;
  Privacy: undefined;
  Subscription: undefined;
  PurchaseConfirmation: { planId: string; plan: SubscriptionPlan };
  SubscriptionSuccess: { planId: string; plan: SubscriptionPlan };
  SubscriptionSettings: undefined;
  Help: undefined;
  About: undefined;
};

// Root Navigation (combines all stacks)
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList> | undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
};

// Screen Props Types
export type AuthStackScreenProps<T extends keyof AuthStackParamList> = StackScreenProps<
  AuthStackParamList,
  T
>;

export type AlarmStackScreenProps<T extends keyof AlarmStackParamList> = StackScreenProps<
  AlarmStackParamList,
  T
>;

export type WhiteNoiseStackScreenProps<T extends keyof WhiteNoiseStackParamList> = StackScreenProps<
  WhiteNoiseStackParamList,
  T
>;

export type SettingsStackScreenProps<T extends keyof SettingsStackParamList> = StackScreenProps<
  SettingsStackParamList,
  T
>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = BottomTabScreenProps<
  MainTabParamList,
  T
>;

export type RootStackScreenProps<T extends keyof RootStackParamList> = StackScreenProps<
  RootStackParamList,
  T
>;

// Navigation prop types for hooks
export type NavigationProp<T extends keyof RootStackParamList> = RootStackScreenProps<T>['navigation'];

// Route prop types for hooks
export type RouteProp<T extends keyof RootStackParamList> = RootStackScreenProps<T>['route'];

// Specific screen navigation props for common usage
export type AlarmListScreenProps = AlarmStackScreenProps<'AlarmList'>;
export type CreateAlarmScreenProps = AlarmStackScreenProps<'CreateAlarm'>;
export type EditAlarmScreenProps = AlarmStackScreenProps<'EditAlarm'>;
export type AlarmSessionMonitoringScreenProps = AlarmStackScreenProps<'SessionMonitoring'>;
export type WhiteNoiseHomeScreenProps = WhiteNoiseStackScreenProps<'WhiteNoiseHome'>;
export type WhiteNoiseSessionMonitoringScreenProps = WhiteNoiseStackScreenProps<'SessionMonitoring'>;
export type SettingsHomeScreenProps = SettingsStackScreenProps<'SettingsHome'>;

// Global navigation state interface
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

export default {};