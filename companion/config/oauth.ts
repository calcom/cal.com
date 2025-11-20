import { Platform } from 'react-native';

export interface OAuthConfig {
  clientId: string;
  clientSecret?: string; // Only needed for server-side flows
  authorizationEndpoint: string;
  tokenEndpoint: string;
  refreshEndpoint: string;
  verifyEndpoint: string;
  redirectUri: string;
  scopes?: string[];
}

// Default OAuth configuration
export const OAUTH_CONFIG: OAuthConfig = {
  // This should be replaced with your actual Cal.com OAuth client ID
  clientId: process.env.EXPO_PUBLIC_CALCOM_CLIENT_ID || 'your-cal-client-id',

  // Cal.com OAuth endpoints
  authorizationEndpoint: 'https://app.cal.com/auth/oauth2/authorize',
  tokenEndpoint: 'https://app.cal.com/api/auth/oauth/token',
  refreshEndpoint: 'https://app.cal.com/api/auth/oauth/refreshToken',
  verifyEndpoint: 'https://api.cal.com/v2/me',

  // Platform-specific redirect URIs
  redirectUri: Platform.OS === 'web'
    ? (process.env.EXPO_PUBLIC_WEB_REDIRECT_URI || 'http://localhost:8081/auth/callback')
    : (process.env.EXPO_PUBLIC_MOBILE_REDIRECT_URI || 'expo-wxt-app://auth/callback'),

  // Cal.com doesn't specify required scopes in their documentation
  scopes: [],
};

// Update OAuth configuration at runtime
export const updateOAuthConfig = (updates: Partial<OAuthConfig>) => {
  Object.assign(OAUTH_CONFIG, updates);
};

// Validate OAuth configuration
export const validateOAuthConfig = (): boolean => {
  if (!OAUTH_CONFIG.clientId || OAUTH_CONFIG.clientId === 'your-cal-client-id') {
    console.error('OAuth client ID not configured. Please set EXPO_PUBLIC_CALCOM_CLIENT_ID or update the config.');
    return false;
  }

  return true;
};
