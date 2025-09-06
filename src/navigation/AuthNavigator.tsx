/**
 * Authentication Navigator
 * 
 * Stack navigator for authentication flow including
 * welcome, sign-in, sign-up, and onboarding screens.
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../components/providers/ThemeProvider';
import { AuthStackParamList } from '../types/navigation';

// Import screens
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { SignInForm } from '../components/auth/SignInForm';
import { SignUpForm } from '../components/auth/SignUpForm';
import { ForgotPasswordForm } from '../components/auth/ForgotPasswordForm';
import { BiometricSetupScreen } from '../screens/auth/BiometricSetupScreen';
import { OnboardingCompleteScreen } from '../screens/auth/OnboardingCompleteScreen';
import SleepPreferencesScreen from '../screens/auth/SleepPreferencesScreen';

const Stack = createStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  const { theme } = useTheme();

  const screenOptions = {
    headerStyle: {
      backgroundColor: theme.colors.background,
      shadowColor: 'transparent',
      elevation: 0,
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

  // Create wrapper components for auth forms
  const SignInScreen = ({ navigation }: any) => (
    <SignInForm 
      onSuccess={() => {}} 
      onForgotPassword={() => navigation.navigate('ForgotPassword')} 
    />
  );

  const SignUpScreen = ({ navigation }: any) => (
    <SignUpForm 
      onSuccess={() => {}} 
      onSignInPress={() => navigation.navigate('SignIn')} 
    />
  );

  const ForgotPasswordScreen = ({ navigation }: any) => (
    <ForgotPasswordForm 
      onSuccess={() => navigation.navigate('SignIn')} 
      onBackPress={() => navigation.navigate('SignIn')} 
    />
  );

  return (
    <Stack.Navigator
      screenOptions={screenOptions}
      initialRouteName="Welcome"
    >
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{
          headerShown: false,
        }}
      />
      
      <Stack.Screen
        name="SignIn"
        component={SignInScreen}
        options={{
          title: 'Sign In',
        }}
      />
      
      <Stack.Screen
        name="SignUp"
        component={SignUpScreen}
        options={{
          title: 'Create Account',
        }}
      />
      
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{
          title: 'Reset Password',
        }}
      />
      
      <Stack.Screen
        name="BiometricSetup"
        component={BiometricSetupScreen}
        options={{
          title: 'Security Setup',
          headerShown: false,
        }}
      />
      
      <Stack.Screen
        name="OnboardingComplete"
        component={OnboardingCompleteScreen}
        options={{
          title: 'Welcome!',
          headerShown: false,
          gestureEnabled: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;