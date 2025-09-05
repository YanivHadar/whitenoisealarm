/**
 * Jest Configuration for Alarm Reliability Tests
 * 
 * Specialized Jest configuration for comprehensive reliability testing
 * with extended timeouts, custom reporters, and platform-specific settings.
 */

const baseConfig = require('./jest.config');

module.exports = {
  ...baseConfig,
  
  // Reliability test specific settings
  testMatch: [
    '<rootDir>/src/services/__tests__/alarm-reliability.test.ts',
    '<rootDir>/src/services/__tests__/notification-delivery.test.ts',
    '<rootDir>/src/services/__tests__/reliability-runner.ts'
  ],
  
  // Extended timeouts for comprehensive testing
  testTimeout: 300000, // 5 minutes for complete reliability suite
  
  // Custom reporters for detailed reliability reporting
  reporters: [
    'default',
    ['jest-html-reporter', {
      pageTitle: 'Alarm Reliability Test Report',
      outputPath: './reliability-report.html',
      includeFailureMsg: true,
      includeSuiteFailure: true,
      includeConsoleLog: true,
      theme: 'darkTheme'
    }],
    ['jest-junit', {
      outputDirectory: './test-results',
      outputName: 'reliability-results.xml',
      suiteName: 'Alarm Reliability Tests'
    }]
  ],
  
  // Coverage configuration for reliability metrics
  collectCoverage: true,
  coverageDirectory: './coverage/reliability',
  collectCoverageFrom: [
    'src/services/alarm-domain.ts',
    'src/services/alarm-scheduler.ts',
    'src/services/snooze-manager.ts',
    'src/services/alarm-audio.ts',
    'src/services/alarm-error-handler.ts',
    '!**/*.test.ts',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/services/alarm-domain.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/services/alarm-scheduler.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  
  // Reliability-specific environment variables
  setupFilesAfterEnv: [
    '<rootDir>/src/services/__tests__/reliability-setup.ts'
  ],
  
  // Platform detection and configuration
  testEnvironment: 'node',
  testEnvironmentOptions: {
    // Platform-specific test configurations
    platform: process.env.EXPO_PLATFORM || 'universal',
    reliabilityMode: true
  },
  
  // Module mapping for platform-specific modules
  moduleNameMapping: {
    ...baseConfig.moduleNameMapping,
    '^expo-notifications$': '<rootDir>/src/__mocks__/expo-notifications.ts',
    '^expo-av$': '<rootDir>/src/__mocks__/expo-av.ts',
    '^@react-native-async-storage/async-storage$': '<rootDir>/src/__mocks__/async-storage.ts'
  },
  
  // Global configuration for reliability tests
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true
      }
    },
    __RELIABILITY_TEST_MODE__: true,
    __ALARM_RELIABILITY_TARGET__: 99.9 // 99.9% reliability target
  },
  
  // Verbose output for comprehensive reporting
  verbose: true,
  
  // Reliability test specific settings
  maxWorkers: 1, // Sequential execution for reliability testing
  runInBand: true, // Prevent race conditions
  
  // Custom test sequencer for reliability tests
  testSequencer: '<rootDir>/src/services/__tests__/reliability-sequencer.js'
};