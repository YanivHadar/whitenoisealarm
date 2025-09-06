/**
 * Reliability Test Setup
 * 
 * Global setup and configuration for alarm reliability testing.
 * Configures test environment, mocks, and reliability monitoring.
 */

import 'react-native-get-random-values';
// Note: react-native-reanimated mock setup temporarily disabled
// due to worklets migration. Will be restored once migration is complete.

// Global test configuration
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Reliability test environment setup
beforeAll(async () => {
  console.log('🚀 Setting up Alarm Reliability Test Environment');
  
  // Configure notification permissions for testing
  const mockPermissions = {
    status: 'granted' as const,
    granted: true,
    canAskAgain: false,
    expires: 'never' as const
  };

  // Mock Expo Notifications for testing
  jest.doMock('expo-notifications', () => ({
    getPermissionsAsync: jest.fn().mockResolvedValue(mockPermissions),
    requestPermissionsAsync: jest.fn().mockResolvedValue(mockPermissions),
    scheduleNotificationAsync: jest.fn().mockResolvedValue('mock-notification-id'),
    cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
    cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
    getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
    setNotificationHandler: jest.fn(),
    setNotificationCategoryAsync: jest.fn().mockResolvedValue(undefined),
    addNotificationReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
    addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
    AndroidNotificationPriority: {
      MIN: 'min',
      LOW: 'low',
      DEFAULT: 'default',
      HIGH: 'high',
      MAX: 'max'
    },
    PermissionStatus: {
      GRANTED: 'granted',
      DENIED: 'denied',
      UNDETERMINED: 'undetermined'
    }
  }));

  // Mock Expo AV for audio testing
  jest.doMock('expo-av', () => ({
    Audio: {
      setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
      Sound: {
        createAsync: jest.fn().mockResolvedValue({
          sound: {
            playAsync: jest.fn().mockResolvedValue({ status: 'ok' }),
            stopAsync: jest.fn().mockResolvedValue({ status: 'ok' }),
            unloadAsync: jest.fn().mockResolvedValue(undefined),
            setVolumeAsync: jest.fn().mockResolvedValue(undefined),
            setPositionAsync: jest.fn().mockResolvedValue(undefined),
            getStatusAsync: jest.fn().mockResolvedValue({
              isLoaded: true,
              isPlaying: false,
              durationMillis: 30000,
              positionMillis: 0
            })
          },
          status: {
            isLoaded: true,
            isPlaying: false,
            durationMillis: 30000,
            positionMillis: 0
          }
        })
      }
    },
    InterruptionModeIOS: {
      MixWithOthers: 0,
      DoNotMix: 1,
      DuckOthers: 2
    },
    InterruptionModeAndroid: {
      DoNotMix: 1,
      DuckOthers: 2
    }
  }));

  // Mock AsyncStorage for persistence testing
  jest.doMock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
    getAllKeys: jest.fn().mockResolvedValue([]),
    multiGet: jest.fn().mockResolvedValue([]),
    multiSet: jest.fn().mockResolvedValue(undefined),
    multiRemove: jest.fn().mockResolvedValue(undefined)
  }));

  // Mock Expo Device for platform detection
  jest.doMock('expo-device', () => ({
    osName: process.env.EXPO_PLATFORM === 'ios' ? 'iOS' : 'Android',
    osVersion: '15.0',
    deviceType: 2, // Phone
    isDevice: true
  }));

  // Configure global test timeouts for reliability testing
  jest.setTimeout(300000); // 5 minutes

  console.log('✅ Reliability Test Environment Ready');
});

afterAll(async () => {
  console.log('🧹 Cleaning up Reliability Test Environment');
  
  // Clean up any test data or connections
  jest.clearAllMocks();
  jest.resetAllMocks();
  
  console.log('✅ Reliability Test Cleanup Complete');
});

beforeEach(() => {
  // Reset mocks before each test to ensure clean state
  jest.clearAllMocks();
});

afterEach(async () => {
  // Optional: Add any test cleanup logic here
});

// Global reliability test utilities
(global as any).reliabilityTestUtils = {
  // Test timeouts
  TIMEOUTS: {
    SHORT: 5000,
    MEDIUM: 30000,
    LONG: 120000,
    RELIABILITY_SUITE: 300000
  },
  
  // Reliability targets
  TARGETS: {
    OVERALL_RELIABILITY: 99.9,
    NOTIFICATION_DELIVERY: 99.5,
    BACKGROUND_PROCESSING: 99.0,
    PERFORMANCE: 95.0,
    EDGE_CASE_COVERAGE: 90.0
  },
  
  // Test data generators
  createMockAlarmData: (overrides = {}) => ({
    name: 'Test Alarm',
    time: '08:00',
    enabled: true,
    repeat_pattern: 'once',
    repeat_days: null,
    timezone: 'America/New_York',
    alarm_sound: 'default',
    volume: 0.8,
    fade_in_duration: 30,
    vibration_enabled: true,
    vibration_pattern: 'default',
    snooze_enabled: true,
    snooze_duration: 9,
    snooze_count_limit: 3,
    auto_dismiss_duration: 300,
    audio_output: 'auto',
    gradual_volume_increase: false,
    ...overrides
  }),
  
  // Test environment checks
  isReliabilityTestMode: () => process.env.NODE_ENV === 'test' && (global as any).__RELIABILITY_TEST_MODE__,
  
  // Performance measurement utilities
  measurePerformance: async (name: string, fn: () => Promise<any>) => {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    
    console.log(`⏱️  Performance: ${name} completed in ${duration.toFixed(2)}ms`);
    
    return {
      result,
      duration,
      performance: {
        name,
        duration,
        timestamp: new Date().toISOString()
      }
    };
  },
  
  // Reliability calculation utilities
  calculateReliabilityScore: (passed: number, total: number) => {
    return total > 0 ? (passed / total) * 100 : 0;
  },
  
  // Wait utilities for async testing
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Random test data generators
  randomTime: () => {
    const hours = Math.floor(Math.random() * 24);
    const minutes = Math.floor(Math.random() * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  },
  
  randomAlarmName: () => {
    const adjectives = ['Morning', 'Evening', 'Important', 'Daily', 'Weekly'];
    const nouns = ['Alarm', 'Reminder', 'Wake-up', 'Alert', 'Notification'];
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
  }
};

// Enhanced console logging for reliability tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: (...args) => {
    if (process.env.VERBOSE_TESTS === 'true') {
      originalConsole.log(`[${new Date().toISOString()}]`, ...args);
    }
  },
  error: (...args) => {
    originalConsole.error(`[${new Date().toISOString()}] ERROR:`, ...args);
  },
  warn: (...args) => {
    if (process.env.VERBOSE_TESTS === 'true') {
      originalConsole.warn(`[${new Date().toISOString()}] WARN:`, ...args);
    }
  }
};

// Export setup utilities for use in tests
export const reliabilityTestConfig = {
  TIMEOUT_SHORT: 5000,
  TIMEOUT_MEDIUM: 30000,
  TIMEOUT_LONG: 120000,
  TIMEOUT_RELIABILITY_SUITE: 300000,
  RELIABILITY_TARGET: 99.9,
  PERFORMANCE_TARGET_CREATE: 1000,
  PERFORMANCE_TARGET_SCHEDULE: 500,
  PERFORMANCE_TARGET_UPDATE: 300,
  PERFORMANCE_TARGET_DELETE: 200
};

export default reliabilityTestConfig;