/// <reference types="chrome" />

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
   * Check if running in a browser extension environment
   */
  private isBrowserExtension(): boolean {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      return false;
    }

    // Check if we have chrome extension APIs available
    if (typeof chrome !== "undefined") {
      // Check for various chrome extension indicators
      if (chrome.runtime && chrome.runtime.id) {
        return true;
      }
      if (chrome.extension) {
        return true;
      }
    }

    // Check if we're in an extension context by looking at the URL
    if (window.location.protocol === "chrome-extension:") {
      return true;
    }

    // For localhost iframe in extension context, check for specific indicators
    if (window.parent !== window) {
      try {
        // Try to access parent chrome APIs
        if (window.parent.chrome) {
          return true;
        }
      } catch (e) {
        // Cross-origin iframe access blocked
      }

      // Check if we're localhost in an iframe (likely extension)
      if (window.location.hostname === "localhost" && window.location.port === "8081") {
        // Additional check: see if parent has different origin (extension content script)
        try {
          const parentOrigin = window.parent.location.origin;
          if (parentOrigin !== window.location.origin) {
            return true;
          }
        } catch (e) {
          // Cross-origin access blocked, likely extension
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Launch Chrome extension auth flow via postMessage to parent window
   */
  private async launchExtensionAuthFlow(authUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Check if we can directly access chrome APIs
      if (typeof chrome !== "undefined" && chrome.identity) {
        chrome.identity.launchWebAuthFlow(
          {
            url: authUrl,
            interactive: true,
          },
          (responseUrl) => {
            if (chrome.runtime.lastError) {
              reject(new Error(`OAuth flow failed: ${chrome.runtime.lastError.message}`));
            } else if (responseUrl) {
              resolve(responseUrl);
            } else {
              reject(new Error("OAuth flow cancelled or failed"));
            }
          }
        );
        return;
      }

      // If we're in an iframe, communicate with the parent window
      if (window.parent !== window) {
        console.log("Setting up OAuth communication with parent window");

        const messageHandler = (event: MessageEvent) => {
          console.log("Received message from parent:", event.data);

          if (event.data.type === "cal-extension-oauth-result") {
            window.removeEventListener("message", messageHandler);

            if (event.data.success) {
              console.log("OAuth flow successful, received URL:", event.data.responseUrl);
              resolve(event.data.responseUrl);
            } else {
              console.error("OAuth flow failed:", event.data.error);
              reject(new Error(event.data.error || "OAuth flow failed"));
            }
          }
        };

        window.addEventListener("message", messageHandler);

        // Send request to parent window to start OAuth flow
        console.log("Sending OAuth request to parent window:", authUrl);
        window.parent.postMessage(
          {
            type: "cal-extension-oauth-request",
            authUrl: authUrl,
          },
          "*"
        );

        // Set a timeout in case the parent doesn't respond
        setTimeout(() => {
          console.error("OAuth flow timeout - no response from extension");
          window.removeEventListener("message", messageHandler);
          reject(new Error("OAuth flow timeout - no response from extension"));
        }, 30000);
      } else {
        reject(new Error("Chrome extension context not detected"));
      }
    });
  }

  /**
   * Get authorization result (web, extension, or mobile)
   */
  private async getAuthorizationResult(
    codeChallenge: string,
    state: string
  ): Promise<AuthSession.AuthSessionResult | { type: string; params: Record<string, string> }> {
    const authUrl = this.buildAuthorizationUrl(codeChallenge, state);

    const isExtension = this.isBrowserExtension();
    console.log("OAuth flow detection:", {
      isExtension,
      platform: Platform.OS,
      hasChrome: typeof chrome !== "undefined",
      hostname: window?.location?.hostname,
      port: window?.location?.port,
      inIframe: window.parent !== window,
    });

    if (isExtension) {
      // Browser extension: use Chrome's launchWebAuthFlow
      try {
        console.log("Using extension OAuth flow with URL:", authUrl);
        const responseUrl = await this.launchExtensionAuthFlow(authUrl);
        const params = this.parseCallbackUrl(responseUrl);
        return { type: "success" as const, params };
      } catch (error) {
        console.error("Extension OAuth flow failed:", error);
        return { type: "error", params: { error: error.message } } as {
          type: string;
          params: Record<string, string>;
        };
      }
    } else if (Platform.OS === "web") {
      // Regular web: use AuthSession
      const discovery = await this.getDiscoveryEndpoints();
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

    // If in extension context, use extension APIs for token exchange to avoid CORS
    if (this.isBrowserExtension() && window.parent !== window) {
      return await this.exchangeTokensViaExtension(code);
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
   * Exchange tokens via extension to avoid CORS issues
   */
  private async exchangeTokensViaExtension(code: string): Promise<OAuthTokens> {
    return new Promise((resolve, reject) => {
      console.log("Exchanging tokens via extension...");

      const messageHandler = (event: MessageEvent) => {
        if (event.data.type === "cal-extension-token-exchange-result") {
          window.removeEventListener("message", messageHandler);

          if (event.data.success) {
            console.log("Token exchange successful via extension");
            resolve(event.data.tokens);
          } else {
            console.error("Token exchange failed via extension:", event.data.error);
            reject(new Error(event.data.error || "Token exchange failed"));
          }
        }
      };

      window.addEventListener("message", messageHandler);

      // Send token exchange request to parent window
      window.parent.postMessage(
        {
          type: "cal-extension-token-exchange-request",
          tokenRequest: {
            grant_type: "authorization_code",
            client_id: this.config.clientId,
            code: code,
            redirect_uri: this.config.redirectUri,
            code_verifier: this.codeVerifier,
          },
          tokenEndpoint: `${this.config.calcomBaseUrl}/api/auth/oauth/token`,
        },
        "*"
      );

      // Set a timeout
      setTimeout(() => {
        window.removeEventListener("message", messageHandler);
        reject(new Error("Token exchange timeout"));
      }, 30000);
    });
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
 * Check if running in a browser extension environment
 */
function isBrowserExtension(): boolean {
  return (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    typeof chrome !== "undefined" &&
    chrome.extension !== undefined
  );
}

/**
 * Create OAuth service instance with default configuration
 */
export function createCalComOAuthService(overrides: Partial<OAuthConfig> = {}): CalComOAuthService {
  // Determine the appropriate redirect URI based on platform
  let defaultRedirectUri: string;

  const defaultConfig: OAuthConfig = {
    clientId: process.env.EXPO_PUBLIC_CALCOM_OAUTH_CLIENT_ID || "",
    redirectUri: process.env.EXPO_PUBLIC_CALCOM_OAUTH_REDIRECT_URI,
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
