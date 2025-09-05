/**
 * Subscription Service for Alarm & White Noise App
 * 
 * RevenueCat integration for subscription management,
 * purchase flows, and premium feature gating.
 */

import Purchases, {
  PurchasesStoreProduct,
  PurchasesPackage,
  PurchasesOffering,
  CustomerInfo,
  MakePurchaseResult,
  LogLevel,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase/client';
import { SubscriptionStorage } from '../lib/secure-storage';

export interface SubscriptionPlan {
  id: string;
  title: string;
  description: string;
  price: string;
  period: string;
  isPopular?: boolean;
  features: string[];
}

export interface SubscriptionStatus {
  isActive: boolean;
  isPremium: boolean;
  planId?: string;
  expiresAt?: Date;
  willRenew: boolean;
  isInTrial: boolean;
  trialExpiresAt?: Date;
  isInGracePeriod: boolean;
  gracePeriodExpiresAt?: Date;
}

export interface PurchaseResult {
  success: boolean;
  error?: string;
  customerInfo?: CustomerInfo;
  productIdentifier?: string;
}

/**
 * Subscription Service Class
 */
export class SubscriptionService {
  private static instance: SubscriptionService;
  private isInitialized = false;
  private currentOffering: PurchasesOffering | null = null;

  private constructor() {}

  static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  /**
   * Initialize RevenueCat SDK
   */
  async initialize(userId?: string): Promise<void> {
    try {
      if (this.isInitialized) return;

      // Configure RevenueCat
      const apiKey = Platform.OS === 'ios' 
        ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
        : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

      if (!apiKey) {
        throw new Error('RevenueCat API key not configured');
      }

      await Purchases.configure({
        apiKey,
        appUserID: userId,
        observerMode: false,
        userDefaultsSuiteName: 'group.alarmwhitenoiseapp',
        useAmazon: false,
        shouldShowInAppMessagesAutomatically: true,
        entitlementVerificationMode: 'informational',
      });

      // Set debug level for development
      if (__DEV__) {
        await Purchases.setLogLevel(LogLevel.Debug);
      }

      // Set up customer info update listener
      Purchases.addCustomerInfoUpdateListener(this.handleCustomerInfoUpdate);

      this.isInitialized = true;
      console.log('RevenueCat initialized successfully');

      // Load current offerings
      await this.loadOfferings();

    } catch (error) {
      console.error('RevenueCat initialization failed:', error);
      throw error;
    }
  }

  /**
   * Handle customer info updates
   */
  private handleCustomerInfoUpdate = async (customerInfo: CustomerInfo) => {
    try {
      console.log('Customer info updated:', customerInfo);
      
      // Store updated subscription status
      const status = this.parseCustomerInfo(customerInfo);
      await SubscriptionStorage.storeSubscriptionStatus(status);

      // Update user subscription status in Supabase
      await this.syncSubscriptionStatus(customerInfo);

    } catch (error) {
      console.error('Error handling customer info update:', error);
    }
  };

  /**
   * Load available subscription offerings
   */
  async loadOfferings(): Promise<PurchasesOffering | null> {
    try {
      const offerings = await Purchases.getOfferings();
      this.currentOffering = offerings.current;
      
      console.log('Loaded offerings:', this.currentOffering);
      return this.currentOffering;

    } catch (error) {
      console.error('Error loading offerings:', error);
      return null;
    }
  }

  /**
   * Get available subscription plans
   */
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      const offering = this.currentOffering || await this.loadOfferings();
      
      if (!offering || !offering.availablePackages.length) {
        return [];
      }

      const plans: SubscriptionPlan[] = offering.availablePackages.map((pkg) => {
        const product = pkg.storeProduct;
        
        return {
          id: pkg.identifier,
          title: product.title,
          description: product.description || this.getDefaultDescription(pkg.identifier),
          price: product.priceString,
          period: this.getPeriodString(product),
          isPopular: pkg.identifier.includes('monthly') || pkg.identifier.includes('premium'),
          features: this.getFeaturesList(pkg.identifier),
        };
      });

      return plans;

    } catch (error) {
      console.error('Error getting subscription plans:', error);
      return [];
    }
  }

  /**
   * Get current subscription status
   */
  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return this.parseCustomerInfo(customerInfo);

    } catch (error) {
      console.error('Error getting subscription status:', error);
      return {
        isActive: false,
        isPremium: false,
        willRenew: false,
        isInTrial: false,
        isInGracePeriod: false,
      };
    }
  }

  /**
   * Purchase a subscription
   */
  async purchaseSubscription(packageIdentifier: string): Promise<PurchaseResult> {
    try {
      const offering = this.currentOffering || await this.loadOfferings();
      
      if (!offering) {
        return {
          success: false,
          error: 'No subscription offerings available',
        };
      }

      const packageToPurchase = offering.availablePackages.find(
        pkg => pkg.identifier === packageIdentifier
      );

      if (!packageToPurchase) {
        return {
          success: false,
          error: 'Subscription package not found',
        };
      }

      const purchaseResult: MakePurchaseResult = await Purchases.purchasePackage(packageToPurchase);

      // Store purchase information
      await this.handlePurchaseSuccess(purchaseResult);

      return {
        success: true,
        customerInfo: purchaseResult.customerInfo,
        productIdentifier: purchaseResult.productIdentifier,
      };

    } catch (error: any) {
      console.error('Purchase error:', error);

      // Handle specific purchase errors
      if (error.userCancelled) {
        return {
          success: false,
          error: 'Purchase was cancelled',
        };
      } else if (error.domain === 'SKErrorDomain') {
        return {
          success: false,
          error: this.mapStoreKitError(error.code),
        };
      } else if (error.domain === 'RevenueCat.ErrorDomain') {
        return {
          success: false,
          error: this.mapRevenueCatError(error.code),
        };
      }

      return {
        success: false,
        error: error.message || 'Purchase failed',
      };
    }
  }

  /**
   * Restore purchases
   */
  async restorePurchases(): Promise<PurchaseResult> {
    try {
      const customerInfo = await Purchases.restorePurchases();

      // Update subscription status
      await this.syncSubscriptionStatus(customerInfo);

      return {
        success: true,
        customerInfo,
      };

    } catch (error: any) {
      console.error('Restore purchases error:', error);
      return {
        success: false,
        error: error.message || 'Failed to restore purchases',
      };
    }
  }

  /**
   * Check if user has premium access
   */
  async hasPremiumAccess(): Promise<boolean> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      
      // Check for active premium entitlements
      const premiumEntitlement = customerInfo.entitlements.active['premium'];
      return !!premiumEntitlement;

    } catch (error) {
      console.error('Error checking premium access:', error);
      return false;
    }
  }

  /**
   * Cancel subscription (redirect to platform settings)
   */
  async cancelSubscription(): Promise<{ success: boolean; error?: string }> {
    try {
      // For iOS and Android, users need to cancel through platform settings
      if (Platform.OS === 'ios') {
        return {
          success: true,
          error: 'Please cancel your subscription in iOS Settings > Apple ID > Subscriptions',
        };
      } else {
        return {
          success: true,
          error: 'Please cancel your subscription in Google Play Store > Subscriptions',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unable to cancel subscription',
      };
    }
  }

  /**
   * Get promotional offers (if any)
   */
  async getPromotionalOffers(): Promise<any[]> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      // Check for promotional offers or discounts
      return []; // Implement based on your promotional strategy
    } catch (error) {
      console.error('Error getting promotional offers:', error);
      return [];
    }
  }

  /**
   * Parse customer info into subscription status
   */
  private parseCustomerInfo(customerInfo: CustomerInfo): SubscriptionStatus {
    const premiumEntitlement = customerInfo.entitlements.active['premium'];
    
    if (!premiumEntitlement) {
      return {
        isActive: false,
        isPremium: false,
        willRenew: false,
        isInTrial: false,
        isInGracePeriod: false,
      };
    }

    return {
      isActive: true,
      isPremium: true,
      planId: premiumEntitlement.productIdentifier,
      expiresAt: new Date(premiumEntitlement.expirationDate || 0),
      willRenew: premiumEntitlement.willRenew,
      isInTrial: premiumEntitlement.periodType === 'trial',
      trialExpiresAt: premiumEntitlement.periodType === 'trial' 
        ? new Date(premiumEntitlement.expirationDate || 0) 
        : undefined,
      isInGracePeriod: false, // RevenueCat doesn't provide this directly
    };
  }

  /**
   * Sync subscription status with Supabase
   */
  private async syncSubscriptionStatus(customerInfo: CustomerInfo): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const status = this.parseCustomerInfo(customerInfo);
      
      await supabase
        .from('users')
        .update({
          is_premium: status.isPremium,
          subscription_status: status.isActive ? 'premium' : 'free',
          subscription_expires_at: status.expiresAt?.toISOString() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

    } catch (error) {
      console.error('Error syncing subscription status:', error);
    }
  }

  /**
   * Handle successful purchase
   */
  private async handlePurchaseSuccess(purchaseResult: MakePurchaseResult): Promise<void> {
    try {
      // Store purchase tokens for verification
      await SubscriptionStorage.storePurchaseTokens({
        customerInfo: purchaseResult.customerInfo,
        productIdentifier: purchaseResult.productIdentifier,
        purchaseDate: new Date().toISOString(),
      });

      // Sync with backend
      await this.syncSubscriptionStatus(purchaseResult.customerInfo);

    } catch (error) {
      console.error('Error handling purchase success:', error);
    }
  }

  /**
   * Get default description for subscription packages
   */
  private getDefaultDescription(packageId: string): string {
    if (packageId.includes('weekly')) return 'Weekly premium access';
    if (packageId.includes('monthly')) return 'Monthly premium access';
    if (packageId.includes('yearly')) return 'Yearly premium access - Best Value!';
    return 'Premium access to all features';
  }

  /**
   * Get period string for display
   */
  private getPeriodString(product: PurchasesStoreProduct): string {
    const period = product.subscriptionPeriod;
    if (!period) return 'One-time';

    switch (period.unit) {
      case 'day':
        return period.numberOfUnits === 1 ? 'Daily' : `${period.numberOfUnits} days`;
      case 'week':
        return period.numberOfUnits === 1 ? 'Weekly' : `${period.numberOfUnits} weeks`;
      case 'month':
        return period.numberOfUnits === 1 ? 'Monthly' : `${period.numberOfUnits} months`;
      case 'year':
        return period.numberOfUnits === 1 ? 'Yearly' : `${period.numberOfUnits} years`;
      default:
        return 'Subscription';
    }
  }

  /**
   * Get features list for subscription packages
   */
  private getFeaturesList(packageId: string): string[] {
    const baseFeatures = [
      'Unlimited alarms',
      'Premium white noise library',
      'Advanced scheduling',
      'Custom audio uploads',
      'Cloud sync across devices',
      'Priority support',
    ];

    if (packageId.includes('yearly')) {
      return [...baseFeatures, 'Best value - save 50%!'];
    }

    return baseFeatures;
  }

  /**
   * Map StoreKit error codes to user-friendly messages
   */
  private mapStoreKitError(errorCode: number): string {
    switch (errorCode) {
      case 0: return 'Unknown error occurred';
      case 1: return 'Invalid product identifier';
      case 2: return 'Payment cancelled';
      case 3: return 'Payment invalid';
      case 4: return 'Payment not allowed';
      case 5: return 'Store product not available';
      case 6: return 'Cloud service permission denied';
      case 7: return 'Cloud service network connection failed';
      case 8: return 'Cloud service revoked';
      default: return 'Purchase failed';
    }
  }

  /**
   * Map RevenueCat error codes to user-friendly messages
   */
  private mapRevenueCatError(errorCode: number): string {
    switch (errorCode) {
      case 0: return 'Unknown error occurred';
      case 1: return 'Purchase cancelled by user';
      case 2: return 'Store problem encountered';
      case 3: return 'Purchase not allowed';
      case 4: return 'Purchase not allowed';
      case 5: return 'Product not available for purchase';
      case 6: return 'Product already owned';
      case 7: return 'Unknown product';
      case 8: return 'Missing receipt file';
      case 9: return 'Network error';
      default: return 'Purchase failed';
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.isInitialized) {
      Purchases.removeCustomerInfoUpdateListener(this.handleCustomerInfoUpdate);
    }
  }
}

// Export singleton instance
export const subscriptionService = SubscriptionService.getInstance();

// Convenience functions
export const initializeSubscriptions = (userId?: string) => subscriptionService.initialize(userId);
export const getSubscriptionPlans = () => subscriptionService.getSubscriptionPlans();
export const purchaseSubscription = (packageId: string) => subscriptionService.purchaseSubscription(packageId);
export const restorePurchases = () => subscriptionService.restorePurchases();
export const hasPremiumAccess = () => subscriptionService.hasPremiumAccess();
export const getSubscriptionStatus = () => subscriptionService.getSubscriptionStatus();

export default subscriptionService;