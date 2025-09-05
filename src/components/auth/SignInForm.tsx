/**
 * Sign In Form Component for Alarm & White Noise App
 * 
 * Email/password authentication form with validation,
 * biometric authentication option, and OAuth providers.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../providers/ThemeProvider';
import { SignInSchema, SignInForm as SignInFormData } from '../../types/auth';
import Input from '../ui/Input';
import Button from '../ui/Button';

export interface SignInFormProps {
  onSuccess?: () => void;
  onForgotPassword?: () => void;
}

export const SignInForm: React.FC<SignInFormProps> = ({
  onSuccess,
  onForgotPassword,
}) => {
  const { theme } = useTheme();
  const [formData, setFormData] = useState<SignInFormData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<SignInFormData>>({});
  const [showBiometric, setShowBiometric] = useState(false);

  const {
    signIn,
    signInWithGoogle,
    signInWithApple,
    authenticateWithBiometric,
    isLoading,
    error: authError,
    clearError,
    biometricSupported,
    biometricEnabled,
  } = useAuthStore();

  const styles = createStyles(theme);

  React.useEffect(() => {
    // Check if biometric authentication is available and enabled
    if (biometricSupported && biometricEnabled && formData.email) {
      setShowBiometric(true);
    } else {
      setShowBiometric(false);
    }
  }, [biometricSupported, biometricEnabled, formData.email]);

  React.useEffect(() => {
    // Clear auth error when component unmounts or form changes
    return () => clearError();
  }, [clearError]);

  const validateForm = (): boolean => {
    try {
      SignInSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error: any) {
      const formErrors: Partial<SignInFormData> = {};
      error.errors?.forEach((err: any) => {
        const path = err.path[0];
        if (path) {
          formErrors[path as keyof SignInFormData] = err.message;
        }
      });
      setErrors(formErrors);
      return false;
    }
  };

  const handleInputChange = (field: keyof SignInFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    // Clear auth error when user makes changes
    if (authError) {
      clearError();
    }
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;

    try {
      const result = await signIn(formData.email, formData.password);
      
      if (result.success) {
        onSuccess?.();
      } else if (result.error) {
        Alert.alert('Sign In Failed', result.error);
      }
    } catch (error: any) {
      Alert.alert('Sign In Error', error.message || 'An unexpected error occurred');
    }
  };

  const handleBiometricAuth = async () => {
    try {
      const result = await authenticateWithBiometric();
      
      if (result.success) {
        onSuccess?.();
      } else if (result.error) {
        Alert.alert('Biometric Authentication Failed', result.error);
      }
    } catch (error: any) {
      Alert.alert('Biometric Error', error.message || 'Biometric authentication failed');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithGoogle();
      
      if (result.success) {
        onSuccess?.();
      } else if (result.error) {
        Alert.alert('Google Sign In Failed', result.error);
      }
    } catch (error: any) {
      Alert.alert('Google Sign In Error', error.message || 'An unexpected error occurred');
    }
  };

  const handleAppleSignIn = async () => {
    try {
      const result = await signInWithApple();
      
      if (result.success) {
        onSuccess?.();
      } else if (result.error) {
        Alert.alert('Apple Sign In Failed', result.error);
      }
    } catch (error: any) {
      Alert.alert('Apple Sign In Error', error.message || 'An unexpected error occurred');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in to access your alarms and white noise
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Email Address"
              placeholder="Enter your email"
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              error={errors.email}
              leftIcon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              required
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              value={formData.password}
              onChangeText={(value) => handleInputChange('password', value)}
              error={errors.password}
              leftIcon="lock-closed-outline"
              secureTextEntry
              autoComplete="password"
              required
            />

            {/* Forgot Password */}
            <View style={styles.forgotPasswordContainer}>
              <Button
                title="Forgot Password?"
                variant="ghost"
                size="small"
                onPress={onForgotPassword}
                containerStyle={styles.forgotPasswordButton}
              />
            </View>

            {/* Sign In Button */}
            <Button
              title="Sign In"
              variant="primary"
              size="large"
              fullWidth
              loading={isLoading}
              onPress={handleSignIn}
              containerStyle={styles.signInButton}
            />

            {/* Biometric Authentication */}
            {showBiometric && (
              <Button
                title="Use Biometric Authentication"
                variant="outline"
                size="medium"
                fullWidth
                leftIcon={Platform.OS === 'ios' ? 'finger-print-outline' : 'finger-print-outline'}
                onPress={handleBiometricAuth}
                containerStyle={styles.biometricButton}
              />
            )}
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* OAuth Providers */}
          <View style={styles.oauthContainer}>
            <Button
              title="Continue with Google"
              variant="outline"
              size="medium"
              fullWidth
              leftIcon="logo-google"
              onPress={handleGoogleSignIn}
              containerStyle={styles.oauthButton}
            />

            {Platform.OS === 'ios' && (
              <Button
                title="Continue with Apple"
                variant="secondary"
                size="medium"
                fullWidth
                leftIcon="logo-apple"
                onPress={handleAppleSignIn}
                containerStyle={styles.oauthButton}
              />
            )}
          </View>

          {/* Sign Up Link - Removed for navigation integration */}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing[6],
    paddingTop: theme.spacing[5],
    paddingBottom: theme.spacing[10],
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing[8],
  },
  title: {
    fontSize: theme.fontSize['3xl'],
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing[2],
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: theme.lineHeight.relaxed * theme.fontSize.base,
  },
  form: {
    marginBottom: theme.spacing[8],
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: theme.spacing[6],
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
  },
  signInButton: {
    marginBottom: theme.spacing[4],
  },
  biometricButton: {
    marginBottom: theme.spacing[4],
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[6],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    marginHorizontal: theme.spacing[4],
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  oauthContainer: {
    marginBottom: theme.spacing[8],
  },
  oauthButton: {
    marginBottom: theme.spacing[3],
  },
});

export default SignInForm;