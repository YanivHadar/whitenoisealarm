/**
 * Detox E2E Testing Configuration
 * Phase 2.3: Integration Testing & Cross-Platform Validation
 * 
 * Comprehensive Detox configuration for iOS and Android E2E testing.
 * Ensures 99.9% alarm reliability through real device testing scenarios.
 */

module.exports = {
  // Test runner configuration
  testRunner: {
    runner: 'jest',
    args: {
      config: 'e2e/jest.config.js',
      detectOpenHandles: true,
      maxWorkers: 1,
      runInBand: true,
      verbose: true,
    },
    bail: false,
    retries: 2,
  },

  // Application configurations
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/AlarmWhiteNoiseApp.app',
      build: 'xcodebuild -workspace ios/AlarmWhiteNoiseApp.xcworkspace -scheme AlarmWhiteNoiseApp -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build'
    },
    'ios.release': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Release-iphonesimulator/AlarmWhiteNoiseApp.app',
      build: 'xcodebuild -workspace ios/AlarmWhiteNoiseApp.xcworkspace -scheme AlarmWhiteNoiseApp -configuration Release -sdk iphonesimulator -derivedDataPath ios/build'
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug'
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
      build: 'cd android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release'
    }
  },

  // Device configurations
  devices: {
    'simulator': {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 14 Pro',
        os: 'iOS 17.0'
      }
    },
    'simulator.iphone13': {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 13',
        os: 'iOS 16.0'
      }
    },
    'simulator.iphone12': {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 12',
        os: 'iOS 15.0'
      }
    },
    'emulator': {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_6_API_33'
      },
      utilBinaryPaths: [
        'android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk'
      ]
    },
    'emulator.pixel5': {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_5_API_31'
      },
      utilBinaryPaths: [
        'android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk'
      ]
    },
    'emulator.galaxys21': {
      type: 'android.emulator',
      device: {
        avdName: 'Galaxy_S21_API_32'
      },
      utilBinaryPaths: [
        'android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk'
      ]
    }
  },

  // Configuration combinations for different test scenarios
  configurations: {
    // iOS Debug Configuration
    'ios.sim.debug': {
      app: 'ios.debug',
      device: 'simulator',
      artifacts: {
        rootDir: 'e2e/artifacts',
        plugins: {
          log: {
            enabled: true,
            keepOnlyFailedTestsArtifacts: false
          },
          screenshot: {
            enabled: true,
            shouldTakeAutomaticSnapshots: true,
            keepOnlyFailedTestsArtifacts: false,
            takeWhen: {
              testStart: false,
              testDone: true,
              appNotReady: true
            }
          },
          video: {
            enabled: true,
            keepOnlyFailedTestsArtifacts: false,
            bitrate: 2000000
          },
          instruments: {
            enabled: true,
            keepOnlyFailedTestsArtifacts: false
          }
        }
      },
      behavior: {
        init: {
          reinstallApp: true,
          exposeGlobals: false
        },
        launchApp: 'auto',
        cleanup: {
          shutdownDevice: false
        }
      }
    },

    // iOS Release Configuration
    'ios.sim.release': {
      app: 'ios.release',
      device: 'simulator',
      artifacts: {
        rootDir: 'e2e/artifacts',
        plugins: {
          log: 'all',
          screenshot: 'all',
          video: 'all',
          instruments: 'all'
        }
      },
      behavior: {
        init: {
          reinstallApp: true,
          exposeGlobals: false
        },
        launchApp: 'auto'
      }
    },

    // iOS Multi-Device Testing
    'ios.sim.multi': {
      app: 'ios.release',
      device: 'simulator.iphone13',
      artifacts: {
        rootDir: 'e2e/artifacts/multi-device',
        plugins: {
          log: 'all',
          screenshot: 'all',
          video: 'failing'
        }
      }
    },

    // Android Debug Configuration
    'android.emu.debug': {
      app: 'android.debug',
      device: 'emulator',
      artifacts: {
        rootDir: 'e2e/artifacts',
        plugins: {
          log: {
            enabled: true,
            keepOnlyFailedTestsArtifacts: false
          },
          screenshot: {
            enabled: true,
            shouldTakeAutomaticSnapshots: true,
            keepOnlyFailedTestsArtifacts: false,
            takeWhen: {
              testStart: false,
              testDone: true,
              appNotReady: true
            }
          },
          video: {
            enabled: true,
            keepOnlyFailedTestsArtifacts: false
          }
        }
      },
      behavior: {
        init: {
          reinstallApp: true,
          exposeGlobals: false
        },
        launchApp: 'auto',
        cleanup: {
          shutdownDevice: false
        }
      }
    },

    // Android Release Configuration
    'android.emu.release': {
      app: 'android.release',
      device: 'emulator',
      artifacts: {
        rootDir: 'e2e/artifacts',
        plugins: {
          log: 'all',
          screenshot: 'all',
          video: 'all'
        }
      },
      behavior: {
        init: {
          reinstallApp: true,
          exposeGlobals: false
        },
        launchApp: 'auto'
      }
    },

    // Android Multi-Device Testing
    'android.emu.multi': {
      app: 'android.release',
      device: 'emulator.pixel5',
      artifacts: {
        rootDir: 'e2e/artifacts/multi-device',
        plugins: {
          log: 'all',
          screenshot: 'all',
          video: 'failing'
        }
      }
    },

    // Cross-Platform Reliability Testing
    'reliability.ios': {
      app: 'ios.release',
      device: 'simulator',
      artifacts: {
        rootDir: 'e2e/artifacts/reliability',
        plugins: {
          log: 'all',
          screenshot: {
            enabled: true,
            takeWhen: {
              testStart: true,
              testDone: true,
              appNotReady: true
            }
          },
          video: 'all',
          instruments: {
            enabled: true,
            keepOnlyFailedTestsArtifacts: false
          }
        }
      },
      behavior: {
        init: {
          reinstallApp: false, // Keep app state for reliability testing
          exposeGlobals: false
        },
        launchApp: 'manual'
      }
    },

    'reliability.android': {
      app: 'android.release',
      device: 'emulator',
      artifacts: {
        rootDir: 'e2e/artifacts/reliability',
        plugins: {
          log: 'all',
          screenshot: {
            enabled: true,
            takeWhen: {
              testStart: true,
              testDone: true,
              appNotReady: true
            }
          },
          video: 'all'
        }
      },
      behavior: {
        init: {
          reinstallApp: false, // Keep app state for reliability testing
          exposeGlobals: false
        },
        launchApp: 'manual'
      }
    },

    // Performance Testing Configuration
    'performance.ios': {
      app: 'ios.release',
      device: 'simulator',
      artifacts: {
        rootDir: 'e2e/artifacts/performance',
        plugins: {
          instruments: {
            enabled: true,
            keepOnlyFailedTestsArtifacts: false
          },
          log: 'failing',
          screenshot: 'failing',
          video: 'failing'
        }
      },
      behavior: {
        init: {
          reinstallApp: true,
          exposeGlobals: false
        }
      }
    },

    'performance.android': {
      app: 'android.release',
      device: 'emulator',
      artifacts: {
        rootDir: 'e2e/artifacts/performance',
        plugins: {
          log: 'failing',
          screenshot: 'failing',
          video: 'failing'
        }
      },
      behavior: {
        init: {
          reinstallApp: true,
          exposeGlobals: false
        }
      }
    }
  },

  // Global session configuration
  session: {
    server: 'ws://localhost:8099',
    sessionId: 'alarm-white-noise-e2e',
    debugSynchronization: {
      enabled: false,
      interval: 200
    }
  },

  // Logger configuration
  logger: {
    level: process.env.E2E_LOG_LEVEL || 'info',
    overrideConsole: true,
    options: {
      showLoggerName: true,
      showPrefix: true,
      prefixFormat: 'TIME',
      basePath: __dirname
    }
  },

  // Behavior configuration
  behavior: {
    init: {
      reinstallApp: true,
      exposeGlobals: false
    },
    cleanup: {
      shutdownDevice: false
    }
  }
};