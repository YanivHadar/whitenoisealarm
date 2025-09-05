/**
 * Jest Configuration for Detox E2E Tests
 * Phase 2.3: Integration Testing & Cross-Platform Validation
 */

module.exports = {
  preset: 'detox/jest-preset',
  
  // Test environment
  testEnvironment: './e2e/environment.js',
  
  // Test files pattern
  testMatch: ['<rootDir>/e2e/tests/**/*.e2e.js', '<rootDir>/e2e/tests/**/*.e2e.ts'],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/e2e/setup.js'],
  
  // Test timeout for E2E tests (10 minutes)
  testTimeout: 600000,
  
  // Verbose output for debugging
  verbose: true,
  
  // Retry failed tests
  retry: 2,
  
  // Force exit after tests complete
  forceExit: true,
  
  // Don't cache test results for E2E
  cache: false,
  
  // Transform configuration
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'js', 'json'],
  
  // Coverage configuration (disabled for E2E)
  collectCoverage: false,
  
  // Global configuration
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx'
      }
    }
  },
  
  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './e2e/artifacts/html-report',
        filename: 'e2e-test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'Alarm & White Noise - E2E Test Results'
      }
    ]
  ],
  
  // Max workers (E2E tests should run sequentially)
  maxWorkers: 1,
  
  // Run tests in sequence
  runInBand: true
};