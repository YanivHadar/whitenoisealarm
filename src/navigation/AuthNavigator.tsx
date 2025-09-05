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
      fontWeight: theme.fontWeight.semibold,
      fontSize: theme.fontSize.lg,
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
      onSignIn={() => navigation.navigate('SignIn')} 
    />
  );

  const ForgotPasswordScreen = ({ navigation }: any) => (
    <ForgotPasswordForm 
      onSuccess={() => navigation.navigate('SignIn')} 
      onBackToSignIn={() => navigation.navigate('SignIn')} 
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
    </Stack.Navigator>
  );
};

export default AuthNavigator;