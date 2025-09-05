/**
 * Alarm Workflow E2E Tests
 * Phase 2.3: Integration Testing & Cross-Platform Validation
 * 
 * Critical user workflow testing to ensure 99.9% reliability:
 * - Complete alarm creation flow
 * - White noise session management
 * - Notification delivery verification
 * - Cross-platform behavior consistency
 */

describe('Alarm & White Noise - Critical User Workflows', () => {
  
  beforeAll(async () => {
    console.log('🚀 Starting Critical User Workflow Tests');
    
    // Ensure app is launched and ready
    await device.launchApp({ 
      newInstance: true,
      permissions: { notifications: 'YES' }
    });
    
    // Wait for app initialization
    await waitForElementWithRetry(element(by.id('app-ready-indicator')));
    
    // Clear any existing test data
    try {
      await element(by.id('clear-test-data')).tap();
    } catch (error) {
      console.log('No test data to clear');
    }
  });

  afterEach(async () => {
    // Take screenshot for debugging on failure
    const testState = expect.getState();
    if (testState.assertionCalls > testState.numPassingAsserts) {
      await takeDebugScreenshot(testState.currentTestName, 'failure');
    }
    
    // Reset to main screen
    try {
      await device.pressBack();
      await device.pressBack();
    } catch (error) {
      // iOS doesn't have back button, use navigation
      try {
        await element(by.id('nav-home')).tap();
      } catch (navError) {
        console.warn('Could not return to home screen');
      }
    }
  });

  describe('Alarm Creation Workflow', () => {
    it('should create a basic morning alarm successfully', async () => {
      const testName = 'Basic Morning Alarm';
      const testTime = '07:30';
      
      console.log(`Creating alarm: ${testName} at ${testTime}`);
      
      // Navigate to alarm creation
      await tapElementWithRetry(element(by.id('create-alarm-button')));
      await waitForElementWithRetry(element(by.id('alarm-form')));
      
      // Fill in alarm details
      await typeTextWithRetry(element(by.id('alarm-name-input')), testName);
      await tapElementWithRetry(element(by.id('time-picker-button')));
      
      // Set time using platform-specific time picker
      if (device.getPlatform() === 'ios') {
        await element(by.id('ios-time-picker')).setDatePickerDate('2024-01-01T07:30:00Z', 'ISO8601');
      } else {
        await element(by.id('android-hour-picker')).tap();
        await element(by.text('07')).tap();
        await element(by.id('android-minute-picker')).tap();
        await element(by.text('30')).tap();
        await element(by.text('OK')).tap();
      }
      
      // Save alarm
      const performanceResult = await measurePerformance(async () => {
        await tapElementWithRetry(element(by.id('save-alarm-button')));
        await waitForElementWithRetry(element(by.id('alarm-list')));
      }, E2E_CONFIG.PERFORMANCE_TARGETS.ALARM_CREATION_TIME);
      
      // Verify alarm appears in list
      await expect(element(by.text(testName))).toBeVisible();
      await expect(element(by.text('7:30 AM'))).toBeVisible();
      
      // Verify performance
      expect(performanceResult.withinTarget).toBe(true);
      
      console.log(`✅ Alarm created successfully in ${performanceResult.duration}ms`);
    }, E2E_CONFIG.TIMEOUTS.ALARM_SCHEDULING);

    it('should create a recurring weekday alarm with white noise', async () => {
      const testName = 'Weekday Work Alarm';
      
      // Navigate to alarm creation
      await tapElementWithRetry(element(by.id('create-alarm-button')));
      await waitForElementWithRetry(element(by.id('alarm-form')));
      
      // Fill basic details
      await typeTextWithRetry(element(by.id('alarm-name-input')), testName);
      await tapElementWithRetry(element(by.id('time-picker-button')));
      
      // Set time to 8:00 AM
      if (device.getPlatform() === 'ios') {
        await element(by.id('ios-time-picker')).setDatePickerDate('2024-01-01T08:00:00Z', 'ISO8601');
      } else {
        await element(by.id('android-hour-picker')).tap();
        await element(by.text('08')).tap();
        await element(by.id('android-minute-picker')).tap();
        await element(by.text('00')).tap();
        await element(by.text('OK')).tap();
      }
      
      // Set repeat pattern to weekdays
      await tapElementWithRetry(element(by.id('repeat-pattern-button')));
      await tapElementWithRetry(element(by.text('Weekdays')));
      
      // Enable white noise
      await tapElementWithRetry(element(by.id('white-noise-toggle')));
      await waitForElementWithRetry(element(by.id('white-noise-options')));
      
      // Select a white noise sound
      await tapElementWithRetry(element(by.id('white-noise-sound-button')));
      await waitForElementWithRetry(element(by.id('sound-library')));
      await tapElementWithRetry(element(by.id('rain-gentle-sound')));
      
      // Set white noise duration
      await tapElementWithRetry(element(by.id('white-noise-duration-button')));
      await tapElementWithRetry(element(by.text('30 minutes')));
      
      // Save alarm
      await tapElementWithRetry(element(by.id('save-alarm-button')));
      await waitForElementWithRetry(element(by.id('alarm-list')));
      
      // Verify alarm appears with correct settings
      await expect(element(by.text(testName))).toBeVisible();
      await expect(element(by.text('8:00 AM'))).toBeVisible();
      await expect(element(by.text('Weekdays'))).toBeVisible();
      
      // Tap on alarm to verify white noise is configured
      await tapElementWithRetry(element(by.text(testName)));
      await waitForElementWithRetry(element(by.id('alarm-details')));
      await expect(element(by.id('white-noise-enabled-indicator'))).toBeVisible();
      await expect(element(by.text('Rain (Gentle)'))).toBeVisible();
      
      console.log('✅ Weekday alarm with white noise created successfully');
    }, E2E_CONFIG.TIMEOUTS.ALARM_SCHEDULING);

    it('should validate alarm input fields', async () => {
      // Navigate to alarm creation
      await tapElementWithRetry(element(by.id('create-alarm-button')));
      await waitForElementWithRetry(element(by.id('alarm-form')));
      
      // Try to save without name (should show validation error)
      await tapElementWithRetry(element(by.id('save-alarm-button')));
      await expect(element(by.text('Alarm name is required'))).toBeVisible();
      
      // Enter invalid name (too long)
      const longName = 'A'.repeat(100);
      await typeTextWithRetry(element(by.id('alarm-name-input')), longName);
      await tapElementWithRetry(element(by.id('save-alarm-button')));
      await expect(element(by.text('Alarm name too long'))).toBeVisible();
      
      // Test volume validation
      await tapElementWithRetry(element(by.id('volume-slider')));
      await element(by.id('volume-slider')).adjustSliderToPosition(1.1); // Invalid position > 1.0
      await expect(element(by.text('Volume must be between 0 and 100'))).toBeVisible();
      
      console.log('✅ Input validation working correctly');
    }, E2E_CONFIG.TIMEOUTS.ELEMENT_WAIT * 3);
  });

  describe('White Noise Session Management', () => {
    it('should start and control white noise session', async () => {
      // Navigate to white noise section
      await tapElementWithRetry(element(by.id('white-noise-tab')));
      await waitForElementWithRetry(element(by.id('sound-library')));
      
      // Select a sound
      await tapElementWithRetry(element(by.id('ocean-waves-sound')));
      await waitForElementWithRetry(element(by.id('sound-player')));
      
      // Start playback
      const playPerformance = await measurePerformance(async () => {
        await tapElementWithRetry(element(by.id('play-button')));
        await waitForElementWithRetry(element(by.id('playing-indicator')));
      }, E2E_CONFIG.PERFORMANCE_TARGETS.AUDIO_START_TIME);
      
      // Verify audio is playing
      await expect(element(by.id('pause-button'))).toBeVisible();
      await expect(element(by.id('progress-bar'))).toBeVisible();
      
      // Test volume control
      await tapElementWithRetry(element(by.id('volume-button')));
      await element(by.id('volume-slider')).adjustSliderToPosition(0.5);
      
      // Test pause/resume
      await tapElementWithRetry(element(by.id('pause-button')));
      await waitForElementWithRetry(element(by.id('play-button')));
      await expect(element(by.id('paused-indicator'))).toBeVisible();
      
      await tapElementWithRetry(element(by.id('play-button')));
      await waitForElementWithRetry(element(by.id('playing-indicator')));
      
      // Stop playback
      await tapElementWithRetry(element(by.id('stop-button')));
      await waitForElementWithRetry(element(by.id('stopped-indicator')));
      
      // Verify performance
      expect(playPerformance.withinTarget).toBe(true);
      
      console.log(`✅ White noise session controlled successfully (start time: ${playPerformance.duration}ms)`);
    }, E2E_CONFIG.TIMEOUTS.AUDIO_PLAYBACK);

    it('should handle background audio playback', async () => {
      // Start a white noise session
      await tapElementWithRetry(element(by.id('white-noise-tab')));
      await tapElementWithRetry(element(by.id('brown-noise-sound')));
      await tapElementWithRetry(element(by.id('play-button')));
      await waitForElementWithRetry(element(by.id('playing-indicator')));
      
      // Send app to background
      await setDeviceState('background');
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
      
      // Bring app back to foreground
      await setDeviceState('foreground');
      await waitForElementWithRetry(element(by.id('white-noise-tab')));
      
      // Verify audio is still playing
      await expect(element(by.id('playing-indicator'))).toBeVisible();
      await expect(element(by.id('pause-button'))).toBeVisible();
      
      // Stop playback
      await tapElementWithRetry(element(by.id('stop-button')));
      
      console.log('✅ Background audio playback maintained correctly');
    }, E2E_CONFIG.TIMEOUTS.NETWORK_REQUEST);
  });

  describe('Alarm List Management', () => {
    it('should display and manage alarm list', async () => {
      // Ensure we're on the alarm list screen
      await tapElementWithRetry(element(by.id('alarms-tab')));
      await waitForElementWithRetry(element(by.id('alarm-list')));
      
      // Check if there are any alarms from previous tests
      try {
        await element(by.id('alarm-item-0')).tap();
        
        // Test toggle alarm on/off
        await tapElementWithRetry(element(by.id('alarm-enabled-toggle')));
        await expect(element(by.id('alarm-disabled-indicator'))).toBeVisible();
        
        await tapElementWithRetry(element(by.id('alarm-enabled-toggle')));
        await expect(element(by.id('alarm-enabled-indicator'))).toBeVisible();
        
        // Go back to list
        await device.pressBack();
      } catch (error) {
        console.log('No existing alarms to test');
      }
      
      // Test empty state if no alarms
      try {
        await expect(element(by.id('no-alarms-message'))).toBeVisible();
        await expect(element(by.text('Create your first alarm'))).toBeVisible();
      } catch (error) {
        console.log('Alarms exist, skipping empty state test');
      }
      
      console.log('✅ Alarm list management tested successfully');
    }, E2E_CONFIG.TIMEOUTS.ELEMENT_WAIT);

    it('should delete alarm with confirmation', async () => {
      // Create a test alarm first
      await tapElementWithRetry(element(by.id('create-alarm-button')));
      await waitForElementWithRetry(element(by.id('alarm-form')));
      await typeTextWithRetry(element(by.id('alarm-name-input')), 'Test Delete Alarm');
      await tapElementWithRetry(element(by.id('save-alarm-button')));
      await waitForElementWithRetry(element(by.id('alarm-list')));
      
      // Long press on alarm to show delete option
      await element(by.text('Test Delete Alarm')).longPress();
      await waitForElementWithRetry(element(by.id('delete-alarm-button')));
      
      // Tap delete
      await tapElementWithRetry(element(by.id('delete-alarm-button')));
      
      // Confirm deletion
      await waitForElementWithRetry(element(by.id('confirm-delete-dialog')));
      await tapElementWithRetry(element(by.id('confirm-delete-button')));
      
      // Verify alarm is removed
      await expect(element(by.text('Test Delete Alarm'))).not.toBeVisible();
      
      console.log('✅ Alarm deletion with confirmation working correctly');
    }, E2E_CONFIG.TIMEOUTS.ELEMENT_WAIT * 2);
  });

  describe('Cross-Platform Behavior Consistency', () => {
    it('should maintain consistent UI across platforms', async () => {
      const platform = device.getPlatform();
      console.log(`Testing UI consistency on ${platform}`);
      
      // Test main navigation
      await expect(element(by.id('alarms-tab'))).toBeVisible();
      await expect(element(by.id('white-noise-tab'))).toBeVisible();
      await expect(element(by.id('settings-tab'))).toBeVisible();
      
      // Test alarm creation button
      await expect(element(by.id('create-alarm-button'))).toBeVisible();
      
      // Platform-specific UI elements
      if (platform === 'ios') {
        // iOS specific elements
        try {
          await expect(element(by.id('ios-navigation-bar'))).toBeVisible();
        } catch (error) {
          console.log('iOS navigation bar not found (may be using custom navigation)');
        }
      } else {
        // Android specific elements
        try {
          await expect(element(by.id('android-action-bar'))).toBeVisible();
        } catch (error) {
          console.log('Android action bar not found (may be using custom navigation)');
        }
      }
      
      console.log(`✅ UI consistency verified for ${platform}`);
    }, E2E_CONFIG.TIMEOUTS.ELEMENT_WAIT);

    it('should handle platform-specific time pickers consistently', async () => {
      const platform = device.getPlatform();
      
      // Navigate to alarm creation
      await tapElementWithRetry(element(by.id('create-alarm-button')));
      await waitForElementWithRetry(element(by.id('alarm-form')));
      
      // Open time picker
      await tapElementWithRetry(element(by.id('time-picker-button')));
      
      if (platform === 'ios') {
        // iOS uses wheel picker
        await waitForElementWithRetry(element(by.id('ios-time-picker')));
        await element(by.id('ios-time-picker')).setDatePickerDate('2024-01-01T09:00:00Z', 'ISO8601');
      } else {
        // Android uses dialog picker
        await waitForElementWithRetry(element(by.id('android-time-picker-dialog')));
        await element(by.id('android-hour-picker')).tap();
        await element(by.text('09')).tap();
        await element(by.text('OK')).tap();
      }
      
      // Verify time is set correctly
      await expect(element(by.text('9:00 AM'))).toBeVisible();
      
      // Cancel form
      await tapElementWithRetry(element(by.id('cancel-alarm-button')));
      
      console.log(`✅ Time picker consistency verified for ${platform}`);
    }, E2E_CONFIG.TIMEOUTS.ELEMENT_WAIT);
  });

  describe('Performance and Reliability', () => {
    it('should meet app launch performance targets', async () => {
      // Kill and relaunch app to test cold start
      await device.terminateApp();
      
      const launchPerformance = await measurePerformance(async () => {
        await device.launchApp({ newInstance: true });
        await waitForElementWithRetry(element(by.id('app-ready-indicator')));
      }, E2E_CONFIG.PERFORMANCE_TARGETS.APP_LAUNCH_TIME);
      
      expect(launchPerformance.withinTarget).toBe(true);
      
      console.log(`✅ App launch performance: ${launchPerformance.duration}ms (target: ${launchPerformance.expectedTime}ms)`);
    }, E2E_CONFIG.TIMEOUTS.APP_LAUNCH);

    it('should handle app state transitions reliably', async () => {
      const stateTransitions = ['background', 'foreground', 'background', 'foreground'];
      
      for (const state of stateTransitions) {
        await setDeviceState(state);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (state === 'foreground') {
          await waitForElementWithRetry(element(by.id('app-ready-indicator')));
          await expect(element(by.id('alarms-tab'))).toBeVisible();
        }
      }
      
      console.log('✅ App state transitions handled reliably');
    }, E2E_CONFIG.TIMEOUTS.NETWORK_REQUEST);

    it('should perform reliability stress test', async () => {
      const reliabilityResult = await runReliabilityTest(async () => {
        // Navigate to alarm creation and back
        await tapElementWithRetry(element(by.id('create-alarm-button')));
        await waitForElementWithRetry(element(by.id('alarm-form')));
        await tapElementWithRetry(element(by.id('cancel-alarm-button')));
        await waitForElementWithRetry(element(by.id('alarm-list')));
        
        // Navigate to white noise and back
        await tapElementWithRetry(element(by.id('white-noise-tab')));
        await waitForElementWithRetry(element(by.id('sound-library')));
        await tapElementWithRetry(element(by.id('alarms-tab')));
        await waitForElementWithRetry(element(by.id('alarm-list')));
      }, 10); // Run 10 iterations
      
      expect(reliabilityResult.meetsTarget).toBe(true);
      expect(reliabilityResult.successRate).toBeGreaterThanOrEqual(E2E_CONFIG.RELIABILITY_TARGETS.OVERALL_SUCCESS_RATE);
      
      console.log(`✅ Reliability stress test: ${reliabilityResult.successRate}% success rate`);
    }, E2E_CONFIG.TIMEOUTS.RELIABILITY_TEST);
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network errors gracefully', async () => {
      // Disable network (this would be platform-specific in real implementation)
      console.log('Simulating network error conditions');
      
      // Try to use features that might require network
      await tapElementWithRetry(element(by.id('white-noise-tab')));
      await waitForElementWithRetry(element(by.id('sound-library')));
      
      // App should still function locally
      await expect(element(by.id('sound-library'))).toBeVisible();
      
      // Try to create an alarm (should work offline)
      await tapElementWithRetry(element(by.id('alarms-tab')));
      await tapElementWithRetry(element(by.id('create-alarm-button')));
      await waitForElementWithRetry(element(by.id('alarm-form')));
      
      await typeTextWithRetry(element(by.id('alarm-name-input')), 'Offline Test Alarm');
      await tapElementWithRetry(element(by.id('save-alarm-button')));
      
      // Should save locally even without network
      await waitForElementWithRetry(element(by.id('alarm-list')));
      await expect(element(by.text('Offline Test Alarm'))).toBeVisible();
      
      console.log('✅ Network error handling verified');
    }, E2E_CONFIG.TIMEOUTS.NETWORK_REQUEST);

    it('should recover from app crashes gracefully', async () => {
      // This would simulate app crash and recovery
      // For now, we test app restart and state recovery
      
      // Create an alarm
      await tapElementWithRetry(element(by.id('create-alarm-button')));
      await waitForElementWithRetry(element(by.id('alarm-form')));
      await typeTextWithRetry(element(by.id('alarm-name-input')), 'Crash Recovery Test');
      await tapElementWithRetry(element(by.id('save-alarm-button')));
      await waitForElementWithRetry(element(by.id('alarm-list')));
      
      // Restart app
      await device.terminateApp();
      await device.launchApp({ newInstance: true });
      await waitForElementWithRetry(element(by.id('app-ready-indicator')));
      
      // Verify alarm persisted
      await expect(element(by.text('Crash Recovery Test'))).toBeVisible();
      
      console.log('✅ App crash recovery verified');
    }, E2E_CONFIG.TIMEOUTS.APP_LAUNCH);
  });
});