/**
 * Jest Configuration for React Native + Expo Environment
 * Phase 2.3: Integration Testing & Cross-Platform Validation
 * 
 * Comprehensive Jest setup for alarm reliability testing with 99.9% target
 */

module.exports = {
  preset: 'react-native',
  
  // Test environment setup
  testEnvironment: 'node',
  
  // Setup files
  setupFilesAfterEnv: [
    './src/services/__tests__/reliability-setup.ts',
    '@testing-library/react-native/extend-expect'
  ],
  
  // Test files patterns
  testMatch: [
    '**/__tests__/**/*.test.(ts|tsx|js)',
    '**/?(*.)+(spec|test).(ts|tsx|js)'
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/android/',
    '/ios/',
    '/.expo/',
    '/build/',
    '/dist/',
    '/coverage/'
  ],
  
  // Module name mapping for React Native
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/src/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^react-native$': '<rootDir>/node_modules/react-native',
    '^@react-native-community/async-storage$': '<rootDir>/node_modules/@react-native-async-storage/async-storage'
  },
  
  // File extensions to consider
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx'
        }
      }
    ],
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  
  // Transform ignore patterns for React Native
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-community|@react-navigation|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-clone-referenced-element|@react-native-google-signin|react-native-reanimated|@supabase/supabase-js|react-native-purchases|react-native-url-polyfill|uuid)/)'
  ],
  
  // Coverage configuration for 90%+ target
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!src/types/**',
    '!**/node_modules/**'
  ],
  
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  
  // Coverage thresholds for critical paths
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    // Critical alarm scheduling paths require higher coverage
    'src/services/alarm-scheduler.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    'src/services/alarm-service.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    'src/services/white-noise-engine.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    'src/services/background-audio-processor.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // Test timeout for reliability testing (5 minutes)
  testTimeout: 300000,
  
  // Verbose output for debugging
  verbose: process.env.VERBOSE_TESTS === 'true',
  
  // Global test configuration
  globals: {
    __DEV__: true,
    __RELIABILITY_TEST_MODE__: true
  },
  
  
  // Auto mock configuration
  automock: false,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Cache configuration
  cacheDirectory: '<rootDir>/.jest/cache',
  
  // Test result processors
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './coverage/html-report',
        filename: 'test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'Alarm & White Noise App - Test Results'
      }
    ]
  ]
};