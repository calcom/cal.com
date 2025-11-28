import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
import { fromByteArray } from "base64-js";

// Complete warm up for WebBrowser on mobile
WebBrowser.maybeCompleteAuthSession();

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt?: number;
  scope?: string;
}

export interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  calcomBaseUrl: string;
}

export class CalComOAuthService {
  private config: OAuthConfig;
  private codeVerifier: string | null = null;
  private state: string | null = null;

  constructor(config: OAuthConfig) {
    this.config = config;
  }

  /**
   * Generate PKCE parameters
   */
  private async generatePKCEParams(): Promise<{
    codeVerifier: string;
    codeChallenge: string;
    state: string;
  }> {
    // Generate code verifier (43-128 characters, URL-safe)
    const codeVerifier = this.generateRandomBase64Url();

    // Generate code challenge using SHA256
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    // Generate state parameter for CSRF protection
    const state = this.generateRandomBase64Url();

    this.codeVerifier = codeVerifier;
    this.state = state;

    return { codeVerifier, codeChallenge, state };
  }

  /**
   * Generate code challenge from code verifier using SHA256 and base64url encoding
   */
  private async generateCodeChallenge(codeVerifier: string): Promise<string> {
    try {
      const base64Hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        codeVerifier,
        { encoding: Crypto.CryptoEncoding.BASE64 }
      );

      // Convert base64 to base64url (RFC 4648 § 5)
      return base64Hash.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    } catch (error) {
      console.error("Failed to generate code challenge:", error);
      throw new Error("Failed to generate OAuth code challenge");
    }
  }

  /**
   * Generate a cryptographically secure random base64url-encoded string
   * Used for code verifier and state parameter
   */
  private generateRandomBase64Url(): string {
    const bytes = new Uint8Array(Crypto.getRandomBytes(32));

    // Convert to base64, then to base64url
    const base64 =
      typeof btoa !== "undefined" ? btoa(String.fromCharCode(...bytes)) : fromByteArray(bytes);

    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }

  /**
   * Build authorization URL with PKCE parameters
   */
  private buildAuthorizationUrl(codeChallenge: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: "code",
      redirect_uri: this.config.redirectUri,
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    return `${this.config.calcomBaseUrl}/auth/oauth2/authorize?${params.toString()}`;
  }

  /**
   * Start OAuth authorization flow
   */
  async startAuthorizationFlow(): Promise<OAuthTokens> {
    try {
      // Generate PKCE params
      const { codeChallenge, state } = await this.generatePKCEParams();

      // Check for stored callback (web only)
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const storedCode = window.localStorage.getItem("oauth_callback_code");
        const storedState = window.localStorage.getItem("oauth_callback_state");

        if (storedCode && storedState) {
          window.localStorage.removeItem("oauth_callback_code");
          window.localStorage.removeItem("oauth_callback_state");

          if (storedState !== state) {
            throw new Error("Invalid state parameter - possible CSRF attack");
          }

          return await this.exchangeCodeForTokens(storedCode);
        }
      }

      // Get authorization result
      const authResult = await this.getAuthorizationResult(codeChallenge, state);

      // Handle result
      if (authResult.type === "success") {
        const code = authResult.params?.code || authResult.params?.authorizationCode;
        const returnedState = authResult.params?.state;

        if (returnedState !== state) {
          throw new Error("Invalid state parameter - possible CSRF attack");
        }

        if (!code) {
          throw new Error("No authorization code received");
        }

        return await this.exchangeCodeForTokens(code);
      }

      // Handle errors
      if (authResult.type === "error") {
        const errorDescription =
          authResult.params?.error_description ||
          ("error" in authResult ? authResult.error?.message : undefined) ||
          "Unknown error";
        throw new Error(`OAuth error: ${errorDescription}`);
      }

      if (authResult.type === "cancel") {
        throw new Error("OAuth flow was cancelled by user");
      }

      throw new Error("OAuth flow failed or was dismissed");
    } catch (error) {
      console.error("OAuth authorization error:", error);
      throw error;
    }
  }

  /**
   * Get authorization result (web or mobile)
   */
  private async getAuthorizationResult(
    codeChallenge: string,
    state: string
  ): Promise<AuthSession.AuthSessionResult | { type: string; params: Record<string, string> }> {
    const discovery = await this.getDiscoveryEndpoints();

    if (Platform.OS === "web") {
      const request = new AuthSession.AuthRequest({
        clientId: this.config.clientId,
        redirectUri: this.config.redirectUri,
        responseType: AuthSession.ResponseType.Code,
        state: state,
        codeChallenge: codeChallenge,
        codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
      });

      return await request.promptAsync(discovery);
    } else {
      // Mobile: build URL manually and use WebBrowser
      const authUrl = this.buildAuthorizationUrl(codeChallenge, state);
      const result = await WebBrowser.openAuthSessionAsync(authUrl, this.config.redirectUri);

      if (result.type === "success") {
        const params = this.parseCallbackUrl(result.url);
        return { type: "success" as const, params };
      }

      return { type: result.type, params: {} } as { type: string; params: Record<string, string> };
    }
  }

  /**
   * Get discovery endpoints with fallback
   */
  private async getDiscoveryEndpoints(): Promise<AuthSession.DiscoveryDocument> {
    try {
      const discovery = await AuthSession.fetchDiscoveryAsync(
        `${this.config.calcomBaseUrl}/.well-known/openid_configuration`
      );
      return discovery;
    } catch {
      return {
        authorizationEndpoint: `${this.config.calcomBaseUrl}/auth/oauth2/authorize`,
        tokenEndpoint: `${this.config.calcomBaseUrl}/api/auth/oauth/token`,
      } as AuthSession.DiscoveryDocument;
    }
  }

  /**
   * Parse callback URL to extract parameters
   */
  private parseCallbackUrl(url: string): Record<string, string> {
    const urlObj = new URL(url);
    const params: Record<string, string> = {};

    // Try search params first
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    // Fallback to hash fragment
    if (Object.keys(params).length === 0 && urlObj.hash) {
      const hashParams = new URLSearchParams(urlObj.hash.substring(1));
      hashParams.forEach((value, key) => {
        params[key] = value;
      });
    }

    return params;
  }

  /**
   * Exchange authorization code for access/refresh tokens
   */
  private async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    if (!this.codeVerifier) {
      throw new Error("No code verifier available");
    }

    const tokenEndpoint = `${this.config.calcomBaseUrl}/api/auth/oauth/token`;

    // Use URLSearchParams.append() for more reliable encoding
    const body = new URLSearchParams();
    body.append("grant_type", "authorization_code");
    body.append("client_id", this.config.clientId);
    body.append("code", code);
    body.append("redirect_uri", this.config.redirectUri);
    body.append("code_verifier", this.codeVerifier);

    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Token exchange error response:", errorData);

      // Try to parse error details
      try {
        const errorJson = JSON.parse(errorData);
        console.error("Parsed error:", errorJson);
      } catch (parseError) {
        console.error("Could not parse error response as JSON");
      }

      throw new Error(`Token exchange failed: ${response.status} ${errorData}`);
    }

    const tokenData = await response.json();

    const tokens: OAuthTokens = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenType: tokenData.token_type || "Bearer",
      expiresAt: tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : undefined,
      scope: tokenData.scope,
    };

    return tokens;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const tokenEndpoint = `${this.config.calcomBaseUrl}/api/auth/oauth/refreshToken`;

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: this.config.clientId,
      refresh_token: refreshToken,
    });

    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Token refresh failed: ${response.status} ${errorData}`);
    }

    const tokenData = await response.json();

    const tokens: OAuthTokens = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || refreshToken, // Keep old refresh token if new one not provided
      tokenType: tokenData.token_type || "Bearer",
      expiresAt: tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : undefined,
      scope: tokenData.scope,
    };

    return tokens;
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(tokens: OAuthTokens): boolean {
    if (!tokens.expiresAt) {
      return false; // No expiry info, assume it's still valid
    }

    // Add 5-minute buffer before expiry
    return Date.now() >= tokens.expiresAt - 5 * 60 * 1000;
  }
  /**
   * Clear stored PKCE parameters
   */
  clearPKCEParams(): void {
    this.codeVerifier = null;
    this.state = null;
  }
}

/**
 * Create OAuth service instance with default configuration
 */
export function createCalComOAuthService(overrides: Partial<OAuthConfig> = {}): CalComOAuthService {
  // Determine the appropriate redirect URI based on platform
  let defaultRedirectUri: string;

  if (Platform.OS === "web") {
    // For web, use the current origin with /oauth/callback
    defaultRedirectUri = `${window.location.origin}/oauth/callback`;
  } else {
    // For mobile, use the custom URL scheme
    defaultRedirectUri = "expo-wxt-app://oauth/callback";
  }

  const defaultConfig: OAuthConfig = {
    clientId: process.env.EXPO_PUBLIC_CALCOM_OAUTH_CLIENT_ID || "",
    redirectUri: defaultRedirectUri,
    calcomBaseUrl: "https://app.cal.com",
    ...overrides,
  };

  if (!defaultConfig.clientId) {
    throw new Error(
      "OAuth client ID is required. Set EXPO_PUBLIC_CALCOM_OAUTH_CLIENT_ID environment variable."
    );
  }

  return new CalComOAuthService(defaultConfig);
}
