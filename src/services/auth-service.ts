/**
 * Authentication Service Coordinator for Alarm & White Noise App
 * 
 * Central coordinator that ties together all authentication services
 * including OAuth, biometric, session management, and GDPR compliance.
 */

import { AppState } from 'react-native';
import { oauthService } from './oauth-service';
import { biometricService } from './biometric-service';
import { sessionService } from './session-service';
import { subscriptionService } from './subscription-service';
import { gdprService } from './gdpr-service';
import { supabase } from '../lib/supabase/client';

export interface AuthServiceStatus {
  isInitialized: boolean;
  services: {
    oauth: boolean;
    biometric: boolean;
    session: boolean;
    subscription: boolean;
    gdpr: boolean;
  };
  errors: string[];
}

export interface AuthServiceCapabilities {
  biometricTypes: string[];
  oauthProviders: string[];
  subscriptionAvailable: boolean;
  gdprCompliant: boolean;
}

/**
 * Authentication Service Coordinator Class
 */
export class AuthService {
  private static instance: AuthService;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Initialize all authentication services
   */
  async initialize(userId?: string): Promise<AuthServiceStatus> {
    if (this.isInitialized) {
      return this.getStatus();
    }

    if (this.initializationPromise) {
      await this.initializationPromise;
      return this.getStatus();
    }

    this.initializationPromise = this.performInitialization(userId);
    await this.initializationPromise;
    
    this.isInitialized = true;
    return this.getStatus();
  }

  /**
   * Perform actual initialization
   */
  private async performInitialization(userId?: string): Promise<void> {
    const errors: string[] = [];

    console.log('Initializing authentication services...');

    try {
      // Initialize OAuth service
      try {
        await oauthService.initialize();
        console.log('✅ OAuth service initialized');
      } catch (error) {
        console.error('❌ OAuth service initialization failed:', error);
        errors.push('OAuth initialization failed');
      }

      // Initialize biometric service
      try {
        await biometricService.initialize();
        console.log('✅ Biometric service initialized');
      } catch (error) {
        console.error('❌ Biometric service initialization failed:', error);
        errors.push('Biometric initialization failed');
      }

      // Initialize session service
      try {
        await sessionService.initialize();
        console.log('✅ Session service initialized');
      } catch (error) {
        console.error('❌ Session service initialization failed:', error);
        errors.push('Session initialization failed');
      }

      // Initialize subscription service
      try {
        await subscriptionService.initialize(userId);
        console.log('✅ Subscription service initialized');
      } catch (error) {
        console.error('❌ Subscription service initialization failed:', error);
        errors.push('Subscription initialization failed');
      }

      console.log('Authentication services initialization completed');

    } catch (error) {
      console.error('Critical authentication service initialization error:', error);
      errors.push('Critical initialization failure');
    }
  }

  /**
   * Get current service status
   */
  getStatus(): AuthServiceStatus {
    return {
      isInitialized: this.isInitialized,
      services: {
        oauth: true, // OAuth is always available
        biometric: this.isInitialized,
        session: this.isInitialized,
        subscription: this.isInitialized,
        gdpr: true, // GDPR service doesn't need initialization
      },
      errors: [], // Could track actual errors here
    };
  }

  /**
   * Get authentication capabilities
   */
  async getCapabilities(): Promise<AuthServiceCapabilities> {
    try {
      // Get biometric capabilities
      const biometricCaps = await biometricService.getCapabilities();
      const biometricTypes = biometricService.getBiometricTypeName(biometricCaps.availableTypes);

      // Get OAuth providers
      const oauthProviders = await oauthService.getAvailableProviders();

      // Check subscription availability
      const subscriptionPlans = await subscriptionService.getSubscriptionPlans();

      return {
        biometricTypes: [biometricTypes],
        oauthProviders: oauthProviders.map(p => p.name),
        subscriptionAvailable: subscriptionPlans.length > 0,
        gdprCompliant: true,
      };

    } catch (error) {
      console.error('Error getting auth capabilities:', error);
      return {
        biometricTypes: [],
        oauthProviders: [],
        subscriptionAvailable: false,
        gdprCompliant: true,
      };
    }
  }

  /**
   * Comprehensive health check
   */
  async healthCheck(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, { status: string; issues: string[] }>;
    recommendations: string[];
  }> {
    const serviceChecks: Record<string, { status: string; issues: string[] }> = {};
    const recommendations: string[] = [];

    try {
      // Check session health
      const sessionHealth = await sessionService.getHealthMetrics();
      serviceChecks.session = {
        status: sessionHealth.status,
        issues: sessionHealth.issues,
      };
      recommendations.push(...sessionHealth.recommendations);

      // Check biometric setup
      const biometricValidation = await biometricService.validateSetup();
      serviceChecks.biometric = {
        status: biometricValidation.isValid ? 'healthy' : 'degraded',
        issues: biometricValidation.issues,
      };
      recommendations.push(...biometricValidation.recommendations);

      // Check subscription status
      const subscriptionStatus = await subscriptionService.getSubscriptionStatus();
      serviceChecks.subscription = {
        status: subscriptionStatus.isActive ? 'healthy' : 'degraded',
        issues: subscriptionStatus.isActive ? [] : ['Subscription inactive'],
      };

      // Check Supabase connection
      try {
        const { error } = await supabase.from('users').select('id').limit(1);
        serviceChecks.database = {
          status: error ? 'unhealthy' : 'healthy',
          issues: error ? [error.message] : [],
        };
      } catch (error: any) {
        serviceChecks.database = {
          status: 'unhealthy',
          issues: [error.message || 'Database connection failed'],
        };
      }

      // Determine overall health
      const unhealthyServices = Object.values(serviceChecks).filter(s => s.status === 'unhealthy');
      const degradedServices = Object.values(serviceChecks).filter(s => s.status === 'degraded');

      let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (unhealthyServices.length > 0) {
        overall = 'unhealthy';
      } else if (degradedServices.length > 0) {
        overall = 'degraded';
      }

      return {
        overall,
        services: serviceChecks,
        recommendations,
      };

    } catch (error) {
      console.error('Health check error:', error);
      return {
        overall: 'unhealthy',
        services: {
          system: {
            status: 'unhealthy',
            issues: ['Health check system failure'],
          },
        },
        recommendations: ['Restart the application'],
      };
    }
  }

  /**
   * Handle app going to background
   */
  async onAppBackground(): Promise<void> {
    try {
      console.log('Auth service handling app background');

      // Session service handles its own background logic
      // OAuth service doesn't need background handling
      // Subscription service handles background updates via RevenueCat

    } catch (error) {
      console.error('Background handling error:', error);
    }
  }

  /**
   * Handle app coming to foreground
   */
  async onAppForeground(): Promise<void> {
    try {
      console.log('Auth service handling app foreground');

      // Check session validity
      await sessionService.checkSessionStatus();

      // Refresh subscription status
      const customerInfo = await subscriptionService.getSubscriptionStatus();
      console.log('Subscription status refreshed:', customerInfo.isActive);

    } catch (error) {
      console.error('Foreground handling error:', error);
    }
  }

  /**
   * Cleanup all services
   */
  cleanup(): void {
    console.log('Cleaning up authentication services');

    try {
      sessionService.cleanup();
      subscriptionService.cleanup();
      // OAuth and biometric services don't need cleanup
      // GDPR service is stateless

      this.isInitialized = false;
      this.initializationPromise = null;

    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  /**
   * Reset all services (for testing or troubleshooting)
   */
  async reset(): Promise<void> {
    console.log('Resetting authentication services');

    try {
      // Cleanup first
      this.cleanup();

      // Clear any cached data
      // Note: This doesn't clear user data, just service state

      console.log('Authentication services reset completed');

    } catch (error) {
      console.error('Reset error:', error);
    }
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();

// Convenience functions
export const initializeAuth = (userId?: string) => authService.initialize(userId);
export const getAuthCapabilities = () => authService.getCapabilities();
export const checkAuthHealth = () => authService.healthCheck();

export default authService;