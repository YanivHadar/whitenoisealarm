/**
 * Forgot Password Form Component for Alarm & White Noise App
 * 
 * Password reset form with email validation and
 * clear instructions for users.
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
import { ResetPasswordSchema, ResetPasswordForm as ResetPasswordFormData } from '../../types/auth';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { Ionicons } from '@expo/vector-icons';

export interface ForgotPasswordFormProps {
  onBackPress?: () => void;
  onSuccess?: () => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onBackPress,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<ResetPasswordFormData>({
    email: '',
  });
  const [errors, setErrors] = useState<Partial<ResetPasswordFormData>>({});
  const [isEmailSent, setIsEmailSent] = useState(false);

  const {
    resetPassword,
    isLoading,
    error: authError,
    clearError,
  } = useAuthStore();

  React.useEffect(() => {
    // Clear auth error when component unmounts or form changes
    return () => clearError();
  }, [clearError]);

  const validateForm = (): boolean => {
    try {
      ResetPasswordSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error: any) {
      const formErrors: Partial<ResetPasswordFormData> = {};
      error.errors?.forEach((err: any) => {
        const path = err.path[0];
        if (path) {
          formErrors[path as keyof ResetPasswordFormData] = err.message;
        }
      });
      setErrors(formErrors);
      return false;
    }
  };

  const handleInputChange = (field: keyof ResetPasswordFormData, value: string) => {
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

  const handleResetPassword = async () => {
    if (!validateForm()) return;

    try {
      const result = await resetPassword(formData.email);
      
      if (result.success) {
        setIsEmailSent(true);
      } else if (result.error) {
        Alert.alert('Password Reset Failed', result.error);
      }
    } catch (error: any) {
      Alert.alert('Password Reset Error', error.message || 'An unexpected error occurred');
    }
  };

  const handleBackToSignIn = () => {
    setIsEmailSent(false);
    onBackPress?.();
  };

  const handleResendEmail = () => {
    setIsEmailSent(false);
    handleResetPassword();
  };

  if (isEmailSent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          {/* Success Icon */}
          <View style={styles.successIconContainer}>
            <Ionicons name="mail-outline" size={64} color="#10B981" />
          </View>

          {/* Success Content */}
          <Text style={styles.successTitle}>Check Your Email</Text>
          <Text style={styles.successMessage}>
            We've sent a password reset link to{'\n'}
            <Text style={styles.emailText}>{formData.email}</Text>
          </Text>

          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>What's next?</Text>
            <View style={styles.instructionsList}>
              <View style={styles.instructionItem}>
                <Ionicons name="mail-open-outline" size={20} color="#6B7280" />
                <Text style={styles.instructionText}>
                  Check your email inbox (and spam folder)
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <Ionicons name="link-outline" size={20} color="#6B7280" />
                <Text style={styles.instructionText}>
                  Click the password reset link
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <Ionicons name="key-outline" size={20} color="#6B7280" />
                <Text style={styles.instructionText}>
                  Create your new password
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.successActions}>
            <Button
              title="Resend Email"
              variant="outline"
              size="medium"
              fullWidth
              onPress={handleResendEmail}
              containerStyle={styles.resendButton}
            />

            <Button
              title="Back to Sign In"
              variant="primary"
              size="medium"
              fullWidth
              onPress={handleBackToSignIn}
              containerStyle={styles.backButton}
            />
          </View>

          {/* Email Tip */}
          <View style={styles.tipContainer}>
            <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
            <Text style={styles.tipText}>
              Didn't receive the email? Check your spam folder or try resending.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

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
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              No worries! Enter your email address and we'll send you a link to reset your password.
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
              helpText="We'll send a password reset link to this email"
            />

            <Button
              title="Send Reset Link"
              variant="primary"
              size="large"
              fullWidth
              loading={isLoading}
              onPress={handleResetPassword}
              containerStyle={styles.resetButton}
            />
          </View>

          {/* Security Note */}
          <View style={styles.securityNote}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#10B981" />
            <Text style={styles.securityNoteText}>
              For your security, password reset links expire after 1 hour.
            </Text>
          </View>

          {/* Back to Sign In */}
          <View style={styles.backContainer}>
            <Button
              title="Back to Sign In"
              variant="ghost"
              size="medium"
              leftIcon="arrow-back-outline"
              onPress={handleBackToSignIn}
              containerStyle={styles.backToSignInButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    marginBottom: 32,
  },
  resetButton: {
    marginTop: 8,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 32,
  },
  securityNoteText: {
    fontSize: 14,
    color: '#065F46',
    marginLeft: 8,
    flex: 1,
  },
  backContainer: {
    alignItems: 'center',
  },
  backToSignInButton: {
    alignSelf: 'center',
  },

  // Success state styles
  successContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  successIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emailText: {
    fontWeight: '600',
    color: '#111827',
  },
  instructionsContainer: {
    width: '100%',
    marginBottom: 32,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  instructionsList: {
    gap: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 12,
    flex: 1,
  },
  successActions: {
    width: '100%',
    marginBottom: 24,
  },
  resendButton: {
    marginBottom: 12,
  },
  backButton: {
    marginBottom: 0,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    width: '100%',
  },
  tipText: {
    fontSize: 12,
    color: '#1E40AF',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
});

export default ForgotPasswordForm;