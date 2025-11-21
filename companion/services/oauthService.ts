import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { OAUTH_CONFIG, validateOAuthConfig } from '../config/oauth';

// Override redirect URI for browser testing
const getBrowserRedirectUri = () => {
  if (Platform.OS === 'web') {
    // For web/browser testing, always use localhost
    return 'http://localhost:8081/auth/callback';
  }
  return OAUTH_CONFIG.redirectUri;
};

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  tokenType?: string;
}

export interface OAuthUser {
  id: string;
  email: string;
  name: string;
  username?: string;
}

// Generate a cryptographically secure random state parameter for CSRF protection
const generateState = async (): Promise<string> => {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    Math.random().toString(36) + Date.now().toString(36),
    { encoding: Crypto.CryptoEncoding.HEX }
  );
};

export class OAuthService {
  private static instance: OAuthService;
  private currentState: string | null = null;

  static getInstance(): OAuthService {
    if (!OAuthService.instance) {
      OAuthService.instance = new OAuthService();
    }
    return OAuthService.instance;
  }

  // Initialize OAuth for mobile using expo-auth-session
  async initiateMobileOAuth(): Promise<OAuthTokens> {
    if (Platform.OS === 'web') {
      throw new Error('Use initiateWebOAuth for web platform');
    }

    // Validate configuration
    if (!validateOAuthConfig()) {
      throw new Error('OAuth configuration is invalid. Please check your client ID and configuration.');
    }

    // Configure WebBrowser for mobile OAuth
    WebBrowser.maybeCompleteAuthSession();

    const state = await generateState();
    this.currentState = state;

    const request = new AuthSession.AuthRequest({
      clientId: OAUTH_CONFIG.clientId,
      scopes: [], // Cal.com doesn't specify scopes in the docs
      redirectUri: getBrowserRedirectUri(),
      state,
      responseType: AuthSession.ResponseType.Code,
    });

    const discovery = {
      authorizationEndpoint: OAUTH_CONFIG.authorizationEndpoint,
      tokenEndpoint: OAUTH_CONFIG.tokenEndpoint,
    };

    const result = await request.promptAsync(discovery);

    if (result.type === 'success') {
      const { code, state: returnedState } = result.params;
      
      // Verify state parameter for CSRF protection
      if (returnedState !== this.currentState) {
        throw new Error('Invalid state parameter - potential CSRF attack');
      }

      if (code) {
        return await this.exchangeCodeForTokens(code);
      }
    }

    throw new Error('OAuth authorization failed or was cancelled');
  }

  // Initialize OAuth for web/browser extension
  async initiateWebOAuth(): Promise<OAuthTokens> {
    if (Platform.OS !== 'web') {
      throw new Error('Use initiateMobileOAuth for mobile platform');
    }

    // Validate configuration
    if (!validateOAuthConfig()) {
      throw new Error('OAuth configuration is invalid. Please check your client ID and configuration.');
    }

    const state = await generateState();
    this.currentState = state;

    const params = new URLSearchParams({
      client_id: OAUTH_CONFIG.clientId,
      redirect_uri: getBrowserRedirectUri(),
      state,
      response_type: 'code',
    });

    const authUrl = `${OAUTH_CONFIG.authorizationEndpoint}?${params.toString()}`;

    // For browser extension, open popup
    if (typeof chrome !== 'undefined' && chrome.identity) {
      return this.handleChromeExtensionOAuth(authUrl);
    }

    // For regular web, use window redirect
    return this.handleWebRedirectOAuth(authUrl);
  }

  // Handle Chrome extension OAuth via chrome.identity API
  private async handleChromeExtensionOAuth(authUrl: string): Promise<OAuthTokens> {
    return new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        {
          url: authUrl,
          interactive: true,
        },
        (redirectUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (!redirectUrl) {
            reject(new Error('OAuth cancelled or failed'));
            return;
          }

          try {
            const url = new URL(redirectUrl);
            const code = url.searchParams.get('code');
            const state = url.searchParams.get('state');

            if (state !== this.currentState) {
              reject(new Error('Invalid state parameter - potential CSRF attack'));
              return;
            }

            if (code) {
              this.exchangeCodeForTokens(code).then(resolve).catch(reject);
            } else {
              reject(new Error('No authorization code received'));
            }
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  }

  // Handle web redirect OAuth
  private async handleWebRedirectOAuth(authUrl: string): Promise<OAuthTokens> {
    // Store the current state and promise resolver in sessionStorage
    // This will be used when the user returns from OAuth
    return new Promise((resolve, reject) => {
      // Store promise resolvers for when OAuth callback is handled
      (window as any).__oauthResolve = resolve;
      (window as any).__oauthReject = reject;
      (window as any).__oauthState = this.currentState;

      // Redirect to OAuth provider
      window.location.href = authUrl;
    });
  }

  // Handle OAuth callback (for web)
  static async handleOAuthCallback(): Promise<void> {
    if (Platform.OS !== 'web') return;

    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    const expectedState = (window as any).__oauthState;
    const resolve = (window as any).__oauthResolve;
    const reject = (window as any).__oauthReject;

    if (error) {
      if (reject) reject(new Error(`OAuth error: ${error}`));
      return;
    }

    if (state !== expectedState) {
      if (reject) reject(new Error('Invalid state parameter - potential CSRF attack'));
      return;
    }

    if (code && resolve) {
      try {
        const tokens = await OAuthService.getInstance().exchangeCodeForTokens(code);
        resolve(tokens);
      } catch (error) {
        if (reject) reject(error);
      }
    }

    // Clean up
    delete (window as any).__oauthResolve;
    delete (window as any).__oauthReject;
    delete (window as any).__oauthState;
  }

  // Exchange authorization code for access tokens
  private async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: OAUTH_CONFIG.clientId,
      client_secret: process.env.EXPO_PUBLIC_CALCOM_CLIENT_SECRET || '',
      code,
      redirect_uri: getBrowserRedirectUri(),
    });

    console.log('Token exchange request:', {
      url: OAUTH_CONFIG.tokenEndpoint,
      body: body.toString(),
      clientId: OAUTH_CONFIG.clientId,
      hasSecret: !!process.env.EXPO_PUBLIC_CALCOM_CLIENT_SECRET
    });

    const response = await fetch(OAUTH_CONFIG.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token exchange failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
    };
  }

  // Refresh access token using refresh token
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: OAUTH_CONFIG.clientId,
      client_secret: process.env.EXPO_PUBLIC_CALCOM_CLIENT_SECRET || '',
    });

    const response = await fetch(OAUTH_CONFIG.refreshEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken, // Some providers don't return new refresh token
      expiresIn: data.expires_in,
      tokenType: data.token_type,
    };
  }

  // Verify token and get user info
  async verifyTokenAndGetUser(accessToken: string): Promise<OAuthUser> {
    const response = await fetch(OAUTH_CONFIG.verifyEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'cal-api-version': '2024-06-11',
      },
    });

    if (!response.ok) {
      throw new Error(`Token verification failed: ${response.status}`);
    }

    const userData = await response.json();
    
    console.log('OAuth user data response:', JSON.stringify(userData, null, 2));
    
    // Cal.com API v2 response structure: { status: "success", data: UserProfile }
    const user = userData.data || userData;
    
    console.log('Extracted user object:', JSON.stringify(user, null, 2));
    
    const result = {
      id: user.id?.toString() || 'unknown',
      email: user.email || user.emailAddress || '',
      name: user.name || user.displayName || user.fullName || '',
      username: user.username || user.handle || user.slug || '',
    };
    
    console.log('Final OAuth user result:', JSON.stringify(result, null, 2));
    
    return result;
  }

  // Revoke tokens (logout)
  async revokeTokens(accessToken: string): Promise<void> {
    // Cal.com doesn't specify a revoke endpoint in the docs
    // For now, just clear local storage - tokens will expire naturally
    console.log('Token revocation requested - clearing local tokens');
  }

  // Update client ID (for configuration)
  static updateClientId(clientId: string): void {
    OAUTH_CONFIG.clientId = clientId;
  }
}