/**
 * Theme Provider
 * 
 * Provides theme context throughout the app with automatic
 * dark mode switching and user preferences.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance, StatusBar } from 'react-native';
import { lightTheme, darkTheme, Theme } from '../../constants/theme';
import { useAuthStore } from '../../store/auth-store';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { userProfile, updateProfile } = useAuthStore();
  const [mode, setModeState] = useState<ThemeMode>('dark'); // Default to dark for sleep optimization
  const [systemColorScheme, setSystemColorScheme] = useState(Appearance.getColorScheme());

  // Determine if dark mode should be active
  const isDark = mode === 'dark' || (mode === 'system' && systemColorScheme === 'dark');
  const theme = isDark ? darkTheme : lightTheme;

  // Listen to system appearance changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme);
    });

    return () => subscription?.remove();
  }, []);

  // Initialize theme from user preferences
  useEffect(() => {
    if (userProfile?.preferences?.theme) {
      setModeState(userProfile.preferences.theme);
    }
  }, [userProfile?.preferences?.theme]);

  // Update status bar style based on theme
  useEffect(() => {
    StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content', true);
  }, [isDark]);

  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);

    // Update user preferences in the database
    if (userProfile) {
      await updateProfile({
        preferences: {
          ...userProfile.preferences,
          theme: newMode,
        },
      });
    }
  };

  const contextValue: ThemeContextType = {
    theme,
    mode,
    isDark,
    setMode,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeProvider;