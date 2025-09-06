/**
 * Sign Up Form Component for Alarm & White Noise App
 * 
 * User registration form with email validation, password strength
 * requirements, terms acceptance, and OAuth options.
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
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/auth-store';
import { SignUpSchema, SignUpForm as SignUpFormData, validatePassword } from '../../types/auth';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { Ionicons } from '@expo/vector-icons';

export interface SignUpFormProps {
  onSignInPress?: () => void;
  onSuccess?: () => void;
}

export const SignUpForm: React.FC<SignUpFormProps> = ({
  onSignInPress,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<SignUpFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    agreeToTerms: false,
  });
  const [errors, setErrors] = useState<Partial<SignUpFormData>>({});
  const [passwordStrength, setPasswordStrength] = useState<{
    isValid: boolean;
    errors: string[];
  }>({ isValid: false, errors: [] });

  const {
    signUp,
    signInWithGoogle,
    signInWithApple,
    isLoading,
    error: authError,
    clearError,
  } = useAuthStore();

  React.useEffect(() => {
    // Clear auth error when component unmounts or form changes
    return () => clearError();
  }, [clearError]);

  React.useEffect(() => {
    // Update password strength when password changes
    if (formData.password) {
      const strength = validatePassword(formData.password);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength({ isValid: false, errors: [] });
    }
  }, [formData.password]);

  const validateForm = (): boolean => {
    try {
      SignUpSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error: any) {
      const formErrors: Partial<SignUpFormData> = {};
      error.errors?.forEach((err: any) => {
        const path = err.path[0];
        if (path) {
          formErrors[path as keyof SignUpFormData] = err.message;
        }
      });
      setErrors(formErrors);
      return false;
    }
  };

  const handleInputChange = (field: keyof SignUpFormData, value: string | boolean) => {
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

  const handleSignUp = async () => {
    if (!validateForm()) return;

    try {
      const result = await signUp(formData.email, formData.password, formData.fullName);
      
      if (result.success) {
        if (result.error?.includes('email')) {
          // Email confirmation required
          Alert.alert(
            'Check Your Email',
            result.error,
            [{ text: 'OK', onPress: onSuccess }]
          );
        } else {
          onSuccess?.();
        }
      } else if (result.error) {
        Alert.alert('Sign Up Failed', result.error);
      }
    } catch (error: any) {
      Alert.alert('Sign Up Error', error.message || 'An unexpected error occurred');
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      const result = await signInWithGoogle();
      
      if (result.success) {
        onSuccess?.();
      } else if (result.error) {
        Alert.alert('Google Sign Up Failed', result.error);
      }
    } catch (error: any) {
      Alert.alert('Google Sign Up Error', error.message || 'An unexpected error occurred');
    }
  };

  const handleAppleSignUp = async () => {
    try {
      const result = await signInWithApple();
      
      if (result.success) {
        onSuccess?.();
      } else if (result.error) {
        Alert.alert('Apple Sign Up Failed', result.error);
      }
    } catch (error: any) {
      Alert.alert('Apple Sign Up Error', error.message || 'An unexpected error occurred');
    }
  };

  const getPasswordStrengthColor = (): string => {
    if (!formData.password) return '#D1D5DB';
    if (passwordStrength.isValid) return '#10B981';
    if (formData.password.length >= 8) return '#F59E0B';
    return '#EF4444';
  };

  const renderPasswordRequirements = () => {
    if (!formData.password) return null;

    const requirements = [
      { text: 'At least 8 characters', met: formData.password.length >= 8 },
      { text: 'One lowercase letter', met: /[a-z]/.test(formData.password) },
      { text: 'One uppercase letter', met: /[A-Z]/.test(formData.password) },
      { text: 'One number', met: /\d/.test(formData.password) },
    ];

    return (
      <View style={styles.passwordRequirements}>
        <Text style={styles.passwordRequirementsTitle}>Password requirements:</Text>
        {requirements.map((req, index) => (
          <View key={index} style={styles.passwordRequirement}>
            <Ionicons
              name={req.met ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={req.met ? '#10B981' : '#9CA3AF'}
            />
            <Text style={[
              styles.passwordRequirementText,
              { color: req.met ? '#10B981' : '#6B7280' }
            ]}>
              {req.text}
            </Text>
          </View>
        ))}
      </View>
    );
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
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Join us to personalize your sleep routine
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Full Name (Optional)"
              placeholder="Enter your full name"
              value={formData.fullName}
              onChangeText={(value) => handleInputChange('fullName', value)}
              error={errors.fullName}
              leftIcon="person-outline"
              autoCapitalize="words"
              autoComplete="name"
            />

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

            <View style={styles.passwordContainer}>
              <Input
                label="Password"
                placeholder="Create a password"
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                error={errors.password}
                leftIcon="lock-closed-outline"
                secureTextEntry
                autoComplete="password-new"
                required
              />
              
              {/* Password Strength Indicator */}
              {formData.password && (
                <View style={styles.passwordStrengthContainer}>
                  <View style={styles.passwordStrengthBar}>
                    <View
                      style={[
                        styles.passwordStrengthFill,
                        {
                          width: passwordStrength.isValid ? '100%' : 
                                 formData.password.length >= 8 ? '66%' : '33%',
                          backgroundColor: getPasswordStrengthColor(),
                        }
                      ]}
                    />
                  </View>
                  <Text style={[styles.passwordStrengthText, { color: getPasswordStrengthColor() }]}>
                    {passwordStrength.isValid ? 'Strong' : 
                     formData.password.length >= 8 ? 'Fair' : 'Weak'}
                  </Text>
                </View>
              )}

              {renderPasswordRequirements()}
            </View>

            <Input
              label="Confirm Password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChangeText={(value) => handleInputChange('confirmPassword', value)}
              error={errors.confirmPassword}
              leftIcon="lock-closed-outline"
              secureTextEntry
              autoComplete="password-new"
              required
            />

            {/* Terms and Conditions */}
            <TouchableOpacity
              style={styles.termsContainer}
              onPress={() => handleInputChange('agreeToTerms', !formData.agreeToTerms)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: formData.agreeToTerms }}
            >
              <Ionicons
                name={formData.agreeToTerms ? 'checkbox' : 'square-outline'}
                size={20}
                color={formData.agreeToTerms ? '#3B82F6' : '#9CA3AF'}
              />
              <View style={styles.termsTextContainer}>
                <Text style={styles.termsText}>
                  I agree to the{' '}
                  <Text style={styles.termsLink}>Terms of Service</Text>
                  {' '}and{' '}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
                {errors.agreeToTerms && (
                  <Text style={styles.termsError}>{errors.agreeToTerms}</Text>
                )}
              </View>
            </TouchableOpacity>

            {/* Sign Up Button */}
            <Button
              title="Create Account"
              variant="primary"
              size="large"
              fullWidth
              loading={isLoading}
              onPress={handleSignUp}
              containerStyle={styles.signUpButton}
            />
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
              onPress={handleGoogleSignUp}
              containerStyle={styles.oauthButton}
            />

            {Platform.OS === 'ios' && (
              <Button
                title="Continue with Apple"
                variant="secondary"
                size="medium"
                fullWidth
                leftIcon="logo-apple"
                onPress={handleAppleSignUp}
                containerStyle={styles.oauthButton}
              />
            )}
          </View>

          {/* Sign In Link */}
          <View style={styles.signInContainer}>
            <Text style={styles.signInText}>Already have an account? </Text>
            <Button
              title="Sign In"
              variant="ghost"
              size="small"
              onPress={onSignInPress}
              containerStyle={styles.signInButton}
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
    marginBottom: 8,
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
  passwordContainer: {
    marginBottom: 16,
  },
  passwordStrengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  passwordStrengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginRight: 8,
  },
  passwordStrengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  passwordStrengthText: {
    fontSize: 12,
    fontWeight: '500',
  },
  passwordRequirements: {
    marginTop: 8,
    marginBottom: 8,
  },
  passwordRequirementsTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  passwordRequirement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  passwordRequirementText: {
    fontSize: 12,
    marginLeft: 6,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  termsTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  termsText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  termsLink: {
    color: '#3B82F6',
    fontWeight: '500',
  },
  termsError: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  signUpButton: {
    marginBottom: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#6B7280',
  },
  oauthContainer: {
    marginBottom: 32,
  },
  oauthButton: {
    marginBottom: 12,
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: {
    fontSize: 14,
    color: '#6B7280',
  },
  signInButton: {
    alignSelf: 'center',
  },
});

export default SignUpForm;