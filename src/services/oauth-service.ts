/**
 * OAuth Service for Alarm & White Noise App
 * 
 * Handles Google and Apple Sign-In authentication
 * with proper configuration and error handling.
 */

import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '../lib/supabase/client';

// WebBrowser configuration for OAuth
WebBrowser.maybeCompleteAuthSession();

export interface OAuthResult {
  success: boolean;
  error?: string;
  user?: any;
  session?: any;
}

export interface OAuthProvider {
  name: 'google' | 'apple';
  displayName: string;
  isAvailable: boolean;
}

/**
 * OAuth Service Class
 */
export class OAuthService {
  private static instance: OAuthService;
  
  private constructor() {}

  static getInstance(): OAuthService {
    if (!OAuthService.instance) {
      OAuthService.instance = new OAuthService();
    }
    return OAuthService.instance;
  }

  /**
   * Initialize OAuth providers
   */
  async initialize(): Promise<void> {
    try {
      await this.initializeGoogleSignIn();
      console.log('OAuth Service initialized successfully');
    } catch (error) {
      console.error('OAuth Service initialization failed:', error);
    }
  }

  /**
   * Initialize Google Sign-In
   */
  private async initializeGoogleSignIn(): Promise<void> {
    try {
      await GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
        androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
        scopes: ['profile', 'email'],
        offlineAccess: true,
        hostedDomain: '',
        forceCodeForRefreshToken: true,
        accountName: '',
        googleServicePlistPath: '',
        openIdRealm: '',
        profileImageSize: 120,
      });
    } catch (error) {
      console.error('Google Sign-In configuration failed:', error);
      throw error;
    }
  }

  /**
   * Get available OAuth providers
   */
  async getAvailableProviders(): Promise<OAuthProvider[]> {
    const providers: OAuthProvider[] = [
      {
        name: 'google',
        displayName: 'Google',
        isAvailable: true,
      },
    ];

    // Apple Sign-In is only available on iOS 13+
    if (Platform.OS === 'ios') {
      try {
        const isAvailable = await AppleAuthentication.isAvailableAsync();
        providers.push({
          name: 'apple',
          displayName: 'Apple',
          isAvailable,
        });
      } catch (error) {
        console.error('Apple Sign-In availability check failed:', error);
        providers.push({
          name: 'apple',
          displayName: 'Apple',
          isAvailable: false,
        });
      }
    }

    return providers;
  }

  /**
   * Sign in with Google
   */
  async signInWithGoogle(): Promise<OAuthResult> {
    try {
      // Check if device supports Google Play Services
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Sign out any existing user first
      await GoogleSignin.signOut();

      // Perform sign in
      const userInfo = await GoogleSignin.signIn();

      if (!userInfo.data?.idToken) {
        return {
          success: false,
          error: 'Google sign in failed: No ID token received',
        };
      }

      // Sign in to Supabase with the Google ID token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: userInfo.data.idToken,
        access_token: userInfo.data.serverAuthCode,
      });

      if (error) {
        console.error('Supabase Google auth error:', error);
        return {
          success: false,
          error: error.message || 'Google authentication failed',
        };
      }

      return {
        success: true,
        user: data.user,
        session: data.session,
      };

    } catch (error: any) {
      console.error('Google Sign-In error:', error);

      // Handle specific Google Sign-In errors
      if (error.code === 'SIGN_IN_CANCELLED') {
        return {
          success: false,
          error: 'Sign in was cancelled',
        };
      } else if (error.code === 'IN_PROGRESS') {
        return {
          success: false,
          error: 'Sign in is already in progress',
        };
      } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        return {
          success: false,
          error: 'Google Play Services not available',
        };
      }

      return {
        success: false,
        error: error.message || 'Google sign in failed',
      };
    }
  }

  /**
   * Sign in with Apple (iOS only)
   */
  async signInWithApple(): Promise<OAuthResult> {
    try {
      if (Platform.OS !== 'ios') {
        return {
          success: false,
          error: 'Apple Sign-In is only available on iOS',
        };
      }

      // Check if Apple Sign-In is available
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        return {
          success: false,
          error: 'Apple Sign-In is not available on this device',
        };
      }

      // Perform Apple Sign-In
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        return {
          success: false,
          error: 'Apple Sign-In failed: No identity token received',
        };
      }

      // Sign in to Supabase with the Apple identity token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) {
        console.error('Supabase Apple auth error:', error);
        return {
          success: false,
          error: error.message || 'Apple authentication failed',
        };
      }

      return {
        success: true,
        user: data.user,
        session: data.session,
      };

    } catch (error: any) {
      console.error('Apple Sign-In error:', error);

      // Handle Apple Sign-In specific errors
      if (error.code === 'ERR_REQUEST_CANCELED') {
        return {
          success: false,
          error: 'Sign in was cancelled',
        };
      } else if (error.code === 'ERR_REQUEST_NOT_HANDLED') {
        return {
          success: false,
          error: 'Apple Sign-In request not handled',
        };
      } else if (error.code === 'ERR_REQUEST_NOT_INTERACTIVE') {
        return {
          success: false,
          error: 'Apple Sign-In requires user interaction',
        };
      }

      return {
        success: false,
        error: error.message || 'Apple sign in failed',
      };
    }
  }

  /**
   * Sign out from OAuth providers
   */
  async signOut(): Promise<void> {
    try {
      // Sign out from Google
      try {
        const isSignedIn = await GoogleSignin.isSignedIn();
        if (isSignedIn) {
          await GoogleSignin.signOut();
        }
      } catch (error) {
        console.error('Google sign out error:', error);
      }

      // Note: Apple doesn't require explicit sign out
      // The user needs to revoke access from their Apple ID settings

    } catch (error) {
      console.error('OAuth sign out error:', error);
    }
  }

  /**
   * Check current OAuth sign-in status
   */
  async getCurrentUser(): Promise<any> {
    try {
      const isSignedIn = await GoogleSignin.isSignedIn();
      if (isSignedIn) {
        return await GoogleSignin.getCurrentUser();
      }
      return null;
    } catch (error) {
      console.error('Get current OAuth user error:', error);
      return null;
    }
  }

  /**
   * Handle deep link callbacks for OAuth
   */
  async handleDeepLink(url: string): Promise<void> {
    try {
      // Parse the deep link URL
      const parsedUrl = new URL(url);
      
      if (parsedUrl.pathname === '/auth/callback') {
        // Handle OAuth callback
        const code = parsedUrl.searchParams.get('code');
        const error = parsedUrl.searchParams.get('error');

        if (error) {
          console.error('OAuth callback error:', error);
          throw new Error(error);
        }

        if (code) {
          console.log('OAuth callback successful');
        }
      }
    } catch (error) {
      console.error('Deep link handling error:', error);
      throw error;
    }
  }

  /**
   * Refresh OAuth tokens if needed
   */
  async refreshTokens(): Promise<void> {
    try {
      // Google tokens are automatically refreshed by the Google Sign-In library
      // Apple tokens are managed by Apple and don't need manual refresh
      console.log('OAuth tokens refreshed');
    } catch (error) {
      console.error('Token refresh error:', error);
    }
  }
}

// Export singleton instance
export const oauthService = OAuthService.getInstance();

// Convenience functions
export const signInWithGoogle = () => oauthService.signInWithGoogle();
export const signInWithApple = () => oauthService.signInWithApple();
export const getAvailableProviders = () => oauthService.getAvailableProviders();
export const initializeOAuth = () => oauthService.initialize();

export default oauthService;