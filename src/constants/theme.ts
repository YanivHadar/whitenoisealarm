/**
 * Design System & Theme Configuration
 * 
 * Comprehensive theme system optimized for sleep applications
 * with dark mode defaults and accessibility compliance.
 */

export const colors = {
  // Sleep-optimized primary palette (warm, low blue-light)
  primary: {
    50: '#FFF7ED',
    100: '#FFEDD5', 
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316', // Main primary color - warm orange
    600: '#EA580C',
    700: '#C2410C',
    800: '#9A3412',
    900: '#7C2D12',
  },

  // Neutral grays for dark theme
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6', 
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
    950: '#0D1117', // Extra dark for sleep mode
  },

  // Status colors
  success: {
    50: '#ECFDF5',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
  },

  warning: {
    50: '#FFFBEB',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
  },

  error: {
    50: '#FEF2F2',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
  },

  // Sleep-specific colors
  sleep: {
    background: '#0A0D14', // Deep blue-black for sleep mode
    surface: '#141B26',     // Slightly lighter surface
    card: '#1A2332',       // Card background
    text: '#E2E8F0',       // Soft white text
    textSecondary: '#94A3B8', // Muted text
    accent: '#F97316',     // Warm orange accent
    border: '#2A3441',     // Subtle borders
  }
};

export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },

  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },

  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
};

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
};

export const borderRadius = {
  none: 0,
  sm: 2,
  default: 4,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  '3xl': 24,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  default: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
};

// Light theme configuration
export const lightTheme = {
  colors: {
    background: colors.gray[50],
    surface: '#FFFFFF',
    card: '#FFFFFF',
    text: colors.gray[900],
    textSecondary: colors.gray[600],
    primary: colors.primary[500],
    primaryVariant: colors.primary[600],
    secondary: colors.gray[500],
    accent: colors.primary[500],
    border: colors.gray[200],
    success: colors.success[500],
    warning: colors.warning[500],
    error: colors.error[500],
    disabled: colors.gray[300],
  },
  ...typography,
  spacing,
  borderRadius,
  shadows,
};

// Dark theme configuration (optimized for sleep)
export const darkTheme = {
  colors: {
    background: colors.sleep.background,
    surface: colors.sleep.surface,
    card: colors.sleep.card,
    text: colors.sleep.text,
    textSecondary: colors.sleep.textSecondary,
    primary: colors.sleep.accent,
    primaryVariant: colors.primary[600],
    secondary: colors.gray[400],
    accent: colors.sleep.accent,
    border: colors.sleep.border,
    success: colors.success[500],
    warning: colors.warning[500],
    error: colors.error[500],
    disabled: colors.gray[600],
  },
  ...typography,
  spacing,
  borderRadius,
  shadows: {
    ...shadows,
    // Darker shadows for dark theme
    sm: {
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.25,
      shadowRadius: 2,
      shadowColor: '#000000',
      elevation: 1,
    },
    default: {
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
      shadowColor: '#000000',
      elevation: 2,
    },
  },
};

export type Theme = typeof lightTheme;

// Accessibility constants
export const accessibility = {
  minTouchTarget: 44, // Minimum 44x44pt touch target
  contrast: {
    normal: 4.5,      // WCAG AA normal text
    large: 3,         // WCAG AA large text
    enhanced: 7,      // WCAG AAA
  },
  fontSize: {
    min: 12,          // Minimum readable font size
    comfortable: 16,   // Comfortable reading size
    large: 20,        // Large text setting
  },
};

// Animation constants optimized for sleep UX
export const animations = {
  duration: {
    fast: 200,        // Quick feedback
    normal: 300,      // Standard transitions  
    slow: 500,        // Gentle, sleep-friendly
  },
  easing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

export default {
  light: lightTheme,
  dark: darkTheme,
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  accessibility,
  animations,
};