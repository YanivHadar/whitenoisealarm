/**
 * Input Component for Alarm & White Noise App
 * 
 * Reusable form input component with validation support,
 * accessibility features, and consistent styling.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  labelStyle?: TextStyle;
  inputStyle?: TextStyle;
  errorStyle?: TextStyle;
  required?: boolean;
  helpText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  labelStyle,
  inputStyle,
  errorStyle,
  required = false,
  helpText,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isSecureTextVisible, setIsSecureTextVisible] = useState(false);

  const hasError = !!error;
  const isPasswordField = textInputProps.secureTextEntry;

  const handleFocus = (e: any) => {
    setIsFocused(true);
    textInputProps.onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    textInputProps.onBlur?.(e);
  };

  const toggleSecureTextVisibility = () => {
    setIsSecureTextVisible(!isSecureTextVisible);
  };

  const getInputBorderColor = () => {
    if (hasError) return '#EF4444';
    if (isFocused) return '#3B82F6';
    return '#D1D5DB';
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Label */}
      {label && (
        <Text style={[styles.label, labelStyle, hasError && styles.labelError]}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      {/* Input Container */}
      <View
        style={[
          styles.inputContainer,
          {
            borderColor: getInputBorderColor(),
            backgroundColor: isFocused ? '#F9FAFB' : '#FFFFFF',
          },
          hasError && styles.inputContainerError,
        ]}
      >
        {/* Left Icon */}
        {leftIcon && (
          <View style={styles.leftIconContainer}>
            <Ionicons
              name={leftIcon as any}
              size={20}
              color={hasError ? '#EF4444' : isFocused ? '#3B82F6' : '#6B7280'}
            />
          </View>
        )}

        {/* Text Input */}
        <TextInput
          {...textInputProps}
          style={[
            styles.input,
            inputStyle,
            leftIcon && styles.inputWithLeftIcon,
            (rightIcon || isPasswordField) && styles.inputWithRightIcon,
          ]}
          secureTextEntry={isPasswordField && !isSecureTextVisible}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor="#9CA3AF"
          accessibilityLabel={label}
          accessibilityHint={helpText}
          accessibilityRequired={required}
          accessibilityInvalid={hasError}
        />

        {/* Right Icon */}
        {(rightIcon || isPasswordField) && (
          <TouchableOpacity
            style={styles.rightIconContainer}
            onPress={isPasswordField ? toggleSecureTextVisibility : onRightIconPress}
            accessibilityRole="button"
            accessibilityLabel={
              isPasswordField
                ? isSecureTextVisible
                  ? 'Hide password'
                  : 'Show password'
                : 'Action button'
            }
          >
            <Ionicons
              name={
                isPasswordField
                  ? isSecureTextVisible
                    ? 'eye-off-outline'
                    : 'eye-outline'
                  : (rightIcon as any)
              }
              size={20}
              color={hasError ? '#EF4444' : isFocused ? '#3B82F6' : '#6B7280'}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Help Text */}
      {helpText && !error && (
        <Text style={styles.helpText}>{helpText}</Text>
      )}

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
          <Text style={[styles.errorText, errorStyle]}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  labelError: {
    color: '#EF4444',
  },
  required: {
    color: '#EF4444',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    minHeight: 48,
  },
  inputContainerError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  inputWithLeftIcon: {
    paddingLeft: 8,
  },
  inputWithRightIcon: {
    paddingRight: 8,
  },
  leftIconContainer: {
    paddingLeft: 12,
    paddingRight: 4,
  },
  rightIconContainer: {
    paddingLeft: 4,
    paddingRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginLeft: 4,
    flex: 1,
  },
});

export default Input;