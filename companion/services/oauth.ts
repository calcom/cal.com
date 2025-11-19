import { Platform, Linking as RNLinking } from 'react-native';
import * as ExpoLinking from 'expo-linking';

/**
 * Cal.com OAuth Configuration
 * Based on: https://cal.com/help/apps-and-integrations/oauth
 * 
 * Note: OAuth credentials must be obtained from Cal.com team
 * Fill out form: https://i.cal.com/forms/4052adda-bc79-4a8d-9f63-5bc3bead4cd3
 */

// TODO: Replace with actual OAuth credentials from Cal.com team
const getRedirectUri = () => {
  // IMPORTANT: This must match what Cal.com team registered for your OAuth client
  
  if (Platform.OS === 'web') {
    // For web, we need to use the SAME origin (localhost:8081 in dev)
    // This is because web browsers can't handle custom URL schemes like expo-wxt-app://
    if (typeof window !== 'undefined') {
      // Use current window location
      const origin = window.location.origin; // e.g., http://localhost:8081
      return `${origin}/oauth/callback`;
    }
    return 'http://localhost:8081/oauth/callback';
  }
  
  // For native (iOS/Android), use deep link scheme
  // This will only work if Cal.com team sets this as the redirect_uri for your OAuth client
  return 'expo-wxt-app://oauth/callback';
};

export const OAUTH_CONFIG = {
  clientId: process.env.EXPO_PUBLIC_CAL_CLIENT_ID || 'YOUR_CLIENT_ID',
  clientSecret: process.env.EXPO_PUBLIC_CAL_CLIENT_SECRET || 'YOUR_CLIENT_SECRET',
  authorizationEndpoint: 'https://app.cal.com/auth/oauth2/authorize',
  tokenEndpoint: 'https://app.cal.com/api/auth/oauth/token',
  refreshEndpoint: 'https://app.cal.com/api/auth/oauth/refreshToken',
  redirectUri: getRedirectUri(),
};

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token: string;
}

export interface OAuthRefreshResponse {
  access_token: string;
}

export class CalComOAuthService {
  /**
   * Generate a secure random state for CSRF protection
   */
  private static generateState(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Start the OAuth authorization flow
   * Opens Cal.com authorization page in browser
   */
  static async authorize(): Promise<{ state: string }> {
    try {
      const state = this.generateState();

      // Build authorization URL
      const authUrl = `${OAUTH_CONFIG.authorizationEndpoint}?` +
        `client_id=${encodeURIComponent(OAUTH_CONFIG.clientId)}&` +
        `state=${encodeURIComponent(state)}&` +
        `redirect_uri=${encodeURIComponent(OAUTH_CONFIG.redirectUri)}`;

      console.log('Starting OAuth flow...');
      console.log('Authorization URL:', authUrl);
      console.log('Redirect URI:', OAUTH_CONFIG.redirectUri);

      // Open URL in browser (works for web and native)
      const supported = await RNLinking.canOpenURL(authUrl);
      if (supported) {
        await RNLinking.openURL(authUrl);
      } else {
        throw new Error('Cannot open authorization URL');
      }

      // Return state for verification later
      return { state };
    } catch (error) {
      console.error('OAuth authorization error:', error);
      throw error;
    }
  }

  /**
   * Exchange authorization code for access and refresh tokens
   * POST https://app.cal.com/api/auth/oauth/token
   */
  static async exchangeCodeForTokens(code: string): Promise<OAuthTokenResponse> {
    try {
      // Cal.com expects application/x-www-form-urlencoded
      const params = new URLSearchParams({
        code,
        client_id: OAUTH_CONFIG.clientId,
        client_secret: OAUTH_CONFIG.clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: OAUTH_CONFIG.redirectUri,
      });

      console.log('Token exchange request:', {
        endpoint: OAUTH_CONFIG.tokenEndpoint,
        client_id: OAUTH_CONFIG.clientId,
        redirect_uri: OAUTH_CONFIG.redirectUri,
        code_length: code.length,
      });

      const response = await fetch(OAUTH_CONFIG.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const responseText = await response.text();
      console.log('Token exchange response status:', response.status);
      console.log('Token exchange response:', responseText);

      if (!response.ok) {
        console.error('Token exchange failed:', responseText);
        throw new Error(`Token exchange failed: ${response.status} - ${responseText}`);
      }

      const data = JSON.parse(responseText);
      
      if (!data.access_token || !data.refresh_token) {
        throw new Error('Invalid token response: missing tokens');
      }

      console.log('Token exchange successful!');
      return data;
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   * POST https://app.cal.com/api/auth/oauth/refreshToken
   */
  static async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      const response = await fetch(OAUTH_CONFIG.refreshEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshToken}`,
        },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          client_id: OAUTH_CONFIG.clientId,
          client_secret: OAUTH_CONFIG.clientSecret,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Token refresh failed:', errorText);
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const data: OAuthRefreshResponse = await response.json();
      
      if (!data.access_token) {
        throw new Error('Invalid refresh response: missing access_token');
      }

      return data.access_token;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw error;
    }
  }

  /**
   * Verify OAuth credentials by calling the /me endpoint
   * GET https://api.cal.com/v2/me
   */
  static async verifyToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.cal.com/v2/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Error verifying token:', error);
      return false;
    }
  }

  /**
   * Parse OAuth callback URL to extract code and state
   */
  static parseCallbackUrl(url: string): { code?: string; state?: string; error?: string } {
    try {
      const { queryParams } = ExpoLinking.parse(url);
      
      return {
        code: queryParams?.code as string | undefined,
        state: queryParams?.state as string | undefined,
        error: queryParams?.error as string | undefined,
      };
    } catch (error) {
      console.error('Error parsing callback URL:', error);
      return {};
    }
  }
}

