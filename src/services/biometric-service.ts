/**
 * Biometric Authentication Service for Alarm & White Noise App
 * 
 * Handles biometric authentication using expo-local-authentication
 * with support for Face ID, Touch ID, and Android biometrics.
 */

import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import { BiometricStorage } from '../lib/secure-storage';

export interface BiometricCapabilities {
  isSupported: boolean;
  isEnrolled: boolean;
  availableTypes: LocalAuthentication.AuthenticationType[];
  securityLevel: LocalAuthentication.SecurityLevel;
  hasHardware: boolean;
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  biometricType?: string;
  warning?: string;
}

export interface BiometricSettings {
  enabled: boolean;
  promptTitle?: string;
  promptSubtitle?: string;
  promptDescription?: string;
  fallbackLabel?: string;
  cancelLabel?: string;
  disableDeviceFallback?: boolean;
  requireConfirmation?: boolean;
}

/**
 * Biometric Authentication Service Class
 */
export class BiometricService {
  private static instance: BiometricService;
  private capabilities: BiometricCapabilities | null = null;

  private constructor() {}

  static getInstance(): BiometricService {
    if (!BiometricService.instance) {
      BiometricService.instance = new BiometricService();
    }
    return BiometricService.instance;
  }

  /**
   * Initialize biometric service and check capabilities
   */
  async initialize(): Promise<BiometricCapabilities> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const availableTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();

      this.capabilities = {
        isSupported: hasHardware,
        isEnrolled,
        availableTypes,
        securityLevel,
        hasHardware,
      };

      console.log('Biometric capabilities:', this.capabilities);
      return this.capabilities;

    } catch (error) {
      console.error('Biometric initialization error:', error);
      this.capabilities = {
        isSupported: false,
        isEnrolled: false,
        availableTypes: [],
        securityLevel: LocalAuthentication.SecurityLevel.NONE,
        hasHardware: false,
      };
      return this.capabilities;
    }
  }

  /**
   * Get current biometric capabilities
   */
  async getCapabilities(): Promise<BiometricCapabilities> {
    if (!this.capabilities) {
      return await this.initialize();
    }
    return this.capabilities;
  }

  /**
   * Check if biometric authentication is available and enabled
   */
  async isAvailable(): Promise<boolean> {
    try {
      const capabilities = await this.getCapabilities();
      const isEnabled = await BiometricStorage.isBiometricEnabled();
      
      return capabilities.isSupported && capabilities.isEnrolled && isEnabled;
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return false;
    }
  }

  /**
   * Authenticate using biometrics
   */
  async authenticate(settings?: Partial<BiometricSettings>): Promise<BiometricAuthResult> {
    try {
      const capabilities = await this.getCapabilities();

      if (!capabilities.isSupported) {
        return {
          success: false,
          error: 'Biometric authentication is not supported on this device',
        };
      }

      if (!capabilities.isEnrolled) {
        return {
          success: false,
          error: 'No biometric credentials are enrolled on this device',
        };
      }

      const isEnabled = await BiometricStorage.isBiometricEnabled();
      if (!isEnabled) {
        return {
          success: false,
          error: 'Biometric authentication is disabled in app settings',
        };
      }

      // Determine the primary biometric type
      const biometricType = this.getPrimaryBiometricType(capabilities.availableTypes);

      // Configure authentication options
      const options: LocalAuthentication.LocalAuthenticationOptions = {
        promptMessage: settings?.promptTitle || this.getDefaultPromptMessage(biometricType),
        cancelLabel: settings?.cancelLabel || 'Cancel',
        fallbackLabel: settings?.fallbackLabel || 'Use Passcode',
        disableDeviceFallback: settings?.disableDeviceFallback || false,
        requireConfirmation: settings?.requireConfirmation,
      };

      // Perform authentication
      const result = await LocalAuthentication.authenticateAsync(options);

      if (result.success) {
        return {
          success: true,
          biometricType,
        };
      } else {
        return {
          success: false,
          error: result.error || 'Biometric authentication failed',
          warning: result.warning,
        };
      }

    } catch (error: any) {
      console.error('Biometric authentication error:', error);
      return {
        success: false,
        error: error.message || 'Biometric authentication failed',
      };
    }
  }

  /**
   * Enable biometric authentication
   */
  async enableBiometric(settings?: Partial<BiometricSettings>): Promise<BiometricAuthResult> {
    try {
      const capabilities = await this.getCapabilities();

      if (!capabilities.isSupported) {
        return {
          success: false,
          error: 'Biometric authentication is not supported on this device',
        };
      }

      if (!capabilities.isEnrolled) {
        return {
          success: false,
          error: 'Please set up biometric authentication in your device settings first',
        };
      }

      // Test biometric authentication
      const authResult = await this.authenticate({
        promptTitle: 'Enable Biometric Authentication',
        promptDescription: 'Verify your identity to enable quick access to your alarms',
        ...settings,
      });

      if (authResult.success) {
        await BiometricStorage.setBiometricEnabled(true);
        return {
          success: true,
          biometricType: authResult.biometricType,
        };
      } else {
        return authResult;
      }

    } catch (error: any) {
      console.error('Enable biometric error:', error);
      return {
        success: false,
        error: error.message || 'Failed to enable biometric authentication',
      };
    }
  }

  /**
   * Disable biometric authentication
   */
  async disableBiometric(): Promise<void> {
    try {
      await BiometricStorage.setBiometricEnabled(false);
      console.log('Biometric authentication disabled');
    } catch (error) {
      console.error('Disable biometric error:', error);
      throw error;
    }
  }

  /**
   * Check if biometric authentication is enabled
   */
  async isEnabled(): Promise<boolean> {
    try {
      return await BiometricStorage.isBiometricEnabled();
    } catch (error) {
      console.error('Error checking biometric enabled status:', error);
      return false;
    }
  }

  /**
   * Get biometric type display name
   */
  getBiometricTypeName(types: LocalAuthentication.AuthenticationType[]): string {
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris Recognition';
    }
    return 'Biometric Authentication';
  }

  /**
   * Get security level display name
   */
  getSecurityLevelName(level: LocalAuthentication.SecurityLevel): string {
    switch (level) {
      case LocalAuthentication.SecurityLevel.NONE:
        return 'None';
      case LocalAuthentication.SecurityLevel.SECRET:
        return 'Device Passcode';
      case LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK:
        return 'Biometric (Weak)';
      case LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG:
        return 'Biometric (Strong)';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get recommended settings based on capabilities
   */
  getRecommendedSettings(): BiometricSettings {
    const capabilities = this.capabilities;
    
    if (!capabilities) {
      return {
        enabled: false,
      };
    }

    const biometricType = this.getPrimaryBiometricType(capabilities.availableTypes);
    
    return {
      enabled: capabilities.isSupported && capabilities.isEnrolled,
      promptTitle: `Use ${this.getBiometricTypeName(capabilities.availableTypes)}`,
      promptDescription: 'Authenticate to access your alarms and settings',
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use Passcode',
      disableDeviceFallback: false,
      requireConfirmation: Platform.OS === 'android',
    };
  }

  /**
   * Validate biometric setup and provide guidance
   */
  async validateSetup(): Promise<{
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      const capabilities = await this.getCapabilities();

      if (!capabilities.hasHardware) {
        issues.push('Biometric hardware not available on this device');
      } else {
        if (!capabilities.isEnrolled) {
          issues.push('No biometric credentials enrolled');
          recommendations.push('Set up biometric authentication in device settings');
        }

        if (capabilities.securityLevel === LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK) {
          recommendations.push('Consider using stronger biometric authentication if available');
        }

        if (capabilities.availableTypes.length === 0) {
          issues.push('No biometric authentication methods available');
        }
      }

      return {
        isValid: issues.length === 0,
        issues,
        recommendations,
      };

    } catch (error) {
      console.error('Biometric setup validation error:', error);
      return {
        isValid: false,
        issues: ['Unable to validate biometric setup'],
        recommendations: ['Check device biometric settings'],
      };
    }
  }

  /**
   * Get primary biometric type
   */
  private getPrimaryBiometricType(types: LocalAuthentication.AuthenticationType[]): string {
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'face';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'fingerprint';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'iris';
    }
    return 'biometric';
  }

  /**
   * Get default prompt message based on biometric type
   */
  private getDefaultPromptMessage(biometricType: string): string {
    switch (biometricType) {
      case 'face':
        return Platform.OS === 'ios' ? 'Use Face ID to authenticate' : 'Use face recognition to authenticate';
      case 'fingerprint':
        return Platform.OS === 'ios' ? 'Use Touch ID to authenticate' : 'Use fingerprint to authenticate';
      case 'iris':
        return 'Use iris recognition to authenticate';
      default:
        return 'Use biometric authentication';
    }
  }
}

// Export singleton instance
export const biometricService = BiometricService.getInstance();

// Convenience functions
export const initializeBiometric = () => biometricService.initialize();
export const authenticateWithBiometric = (settings?: Partial<BiometricSettings>) => 
  biometricService.authenticate(settings);
export const enableBiometric = (settings?: Partial<BiometricSettings>) => 
  biometricService.enableBiometric(settings);
export const disableBiometric = () => biometricService.disableBiometric();
export const isBiometricAvailable = () => biometricService.isAvailable();
export const isBiometricEnabled = () => biometricService.isEnabled();
export const getBiometricCapabilities = () => biometricService.getCapabilities();

export default biometricService;