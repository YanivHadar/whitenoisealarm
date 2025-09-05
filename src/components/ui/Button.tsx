/**
 * Button Component for Alarm & White Noise App
 * 
 * Reusable button component with multiple variants,
 * loading states, and accessibility features.
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  fullWidth?: boolean;
  containerStyle?: ViewStyle;
  textStyle?: TextStyle;
  loadingText?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  containerStyle,
  textStyle,
  loadingText,
  onPress,
  ...touchableOpacityProps
}) => {
  const isDisabled = disabled || loading;

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      ...styles.base,
      ...styles[size],
    };

    if (fullWidth) {
      baseStyle.width = '100%';
    }

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          ...styles.primary,
          ...(isDisabled && styles.primaryDisabled),
        };
      case 'secondary':
        return {
          ...baseStyle,
          ...styles.secondary,
          ...(isDisabled && styles.secondaryDisabled),
        };
      case 'outline':
        return {
          ...baseStyle,
          ...styles.outline,
          ...(isDisabled && styles.outlineDisabled),
        };
      case 'ghost':
        return {
          ...baseStyle,
          ...styles.ghost,
          ...(isDisabled && styles.ghostDisabled),
        };
      case 'danger':
        return {
          ...baseStyle,
          ...styles.danger,
          ...(isDisabled && styles.dangerDisabled),
        };
      default:
        return baseStyle;
    }
  };

  const getTextStyle = (): TextStyle => {
    const baseTextStyle: TextStyle = {
      ...styles.baseText,
      ...styles[`${size}Text`],
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseTextStyle,
          ...styles.primaryText,
          ...(isDisabled && styles.primaryTextDisabled),
        };
      case 'secondary':
        return {
          ...baseTextStyle,
          ...styles.secondaryText,
          ...(isDisabled && styles.secondaryTextDisabled),
        };
      case 'outline':
        return {
          ...baseTextStyle,
          ...styles.outlineText,
          ...(isDisabled && styles.outlineTextDisabled),
        };
      case 'ghost':
        return {
          ...baseTextStyle,
          ...styles.ghostText,
          ...(isDisabled && styles.ghostTextDisabled),
        };
      case 'danger':
        return {
          ...baseTextStyle,
          ...styles.dangerText,
          ...(isDisabled && styles.dangerTextDisabled),
        };
      default:
        return baseTextStyle;
    }
  };

  const getIconSize = (): number => {
    switch (size) {
      case 'small':
        return 16;
      case 'medium':
        return 18;
      case 'large':
        return 20;
      default:
        return 18;
    }
  };

  const getIconColor = (): string => {
    if (isDisabled) {
      return variant === 'outline' || variant === 'ghost' ? '#9CA3AF' : '#D1D5DB';
    }

    switch (variant) {
      case 'primary':
      case 'danger':
        return '#FFFFFF';
      case 'secondary':
        return '#374151';
      case 'outline':
      case 'ghost':
        return '#3B82F6';
      default:
        return '#FFFFFF';
    }
  };

  const handlePress = (event: any) => {
    if (isDisabled || !onPress) return;
    onPress(event);
  };

  return (
    <TouchableOpacity
      {...touchableOpacityProps}
      style={[getButtonStyle(), containerStyle]}
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={isDisabled ? 1 : 0.7}
      accessibilityRole="button"
      accessibilityState={{
        disabled: isDisabled,
        busy: loading,
      }}
      accessibilityLabel={title}
    >
      <View style={styles.content}>
        {/* Loading Indicator */}
        {loading && (
          <ActivityIndicator
            size="small"
            color={getIconColor()}
            style={styles.loadingIndicator}
          />
        )}

        {/* Left Icon */}
        {!loading && leftIcon && (
          <Ionicons
            name={leftIcon as any}
            size={getIconSize()}
            color={getIconColor()}
            style={styles.leftIcon}
          />
        )}

        {/* Button Text */}
        <Text style={[getTextStyle(), textStyle]}>
          {loading && loadingText ? loadingText : title}
        </Text>

        {/* Right Icon */}
        {!loading && rightIcon && (
          <Ionicons
            name={rightIcon as any}
            size={getIconSize()}
            color={getIconColor()}
            style={styles.rightIcon}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  
  // Size styles
  small: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
  },
  medium: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  large: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 56,
  },

  // Variant styles
  primary: {
    backgroundColor: '#3B82F6',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  primaryDisabled: {
    backgroundColor: '#D1D5DB',
    borderColor: '#D1D5DB',
  },

  secondary: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryDisabled: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },

  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  outlineDisabled: {
    borderColor: '#D1D5DB',
  },

  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  ghostDisabled: {
    backgroundColor: 'transparent',
  },

  danger: {
    backgroundColor: '#EF4444',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  dangerDisabled: {
    backgroundColor: '#FCA5A5',
    borderColor: '#FCA5A5',
  },

  // Text styles
  baseText: {
    fontWeight: '600',
    textAlign: 'center',
  },

  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },

  // Text variant styles
  primaryText: {
    color: '#FFFFFF',
  },
  primaryTextDisabled: {
    color: '#FFFFFF',
  },

  secondaryText: {
    color: '#374151',
  },
  secondaryTextDisabled: {
    color: '#9CA3AF',
  },

  outlineText: {
    color: '#3B82F6',
  },
  outlineTextDisabled: {
    color: '#9CA3AF',
  },

  ghostText: {
    color: '#3B82F6',
  },
  ghostTextDisabled: {
    color: '#9CA3AF',
  },

  dangerText: {
    color: '#FFFFFF',
  },
  dangerTextDisabled: {
    color: '#FFFFFF',
  },

  // Content layout
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingIndicator: {
    marginRight: 8,
  },

  leftIcon: {
    marginRight: 8,
  },

  rightIcon: {
    marginLeft: 8,
  },
});

export default Button;