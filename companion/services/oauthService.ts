/// <reference types="chrome" />
import { fromByteArray } from "base64-js";
import * as AuthSession from "expo-auth-session";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

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

  private async generatePKCEParams(): Promise<{
    codeVerifier: string;
    codeChallenge: string;
    state: string;
  }> {
    const codeVerifier = this.generateRandomBase64Url();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    const state = this.generateRandomBase64Url();

    this.codeVerifier = codeVerifier;
    this.state = state;

    return { codeVerifier, codeChallenge, state };
  }

  private async generateCodeChallenge(codeVerifier: string): Promise<string> {
    try {
      const base64Hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        codeVerifier,
        { encoding: Crypto.CryptoEncoding.BASE64 }
      );

      return base64Hash.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    } catch (error) {
      console.error("Failed to generate code challenge:", error);
      throw new Error("Failed to generate OAuth code challenge");
    }
  }

  private generateRandomBase64Url(): string {
    const bytes = new Uint8Array(Crypto.getRandomBytes(32));

    const base64 =
      typeof btoa !== "undefined" ? btoa(String.fromCharCode(...bytes)) : fromByteArray(bytes);

    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }

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

  async startAuthorizationFlow(): Promise<OAuthTokens> {
    try {
      const { codeChallenge, state } = await this.generatePKCEParams();

      // Web only: check for stored callback with state-specific keys to prevent race conditions
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const storedCode = window.localStorage.getItem(`oauth_callback_code_${state}`);
        const storedState = window.localStorage.getItem(`oauth_callback_state_${state}`);

        if (storedCode && storedState) {
          // CSRF protection: verify state matches
          if (storedState !== state) {
            window.localStorage.removeItem(`oauth_callback_code_${state}`);
            window.localStorage.removeItem(`oauth_callback_state_${state}`);
            throw new Error("Invalid state parameter - possible CSRF attack");
          }

          window.localStorage.removeItem(`oauth_callback_code_${state}`);
          window.localStorage.removeItem(`oauth_callback_state_${state}`);

          return await this.exchangeCodeForTokens(storedCode, state);
        }
      }

      // Note: State stored in background script (iframe may not have chrome.storage access)

      const authResult = await this.getAuthorizationResult(codeChallenge, state);
      if (authResult.type === "success") {
        const code = authResult.params?.code || authResult.params?.authorizationCode;
        const returnedState = authResult.params?.state;

        if (returnedState !== state) {
          throw new Error("Invalid state parameter - possible CSRF attack");
        }

        if (!code) {
          throw new Error("No authorization code received");
        }

        return await this.exchangeCodeForTokens(code, state);
      }

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

  // Detect if this is a mobile app (not web/extension)
  private isMobileApp(): boolean {
    return Platform.OS !== "web";
  }

  private async launchExtensionAuthFlow(authUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
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

      // Iframe: communicate with parent window
      if (window.parent !== window) {
        let timeoutId: NodeJS.Timeout | null = null;

        const messageHandler = (event: MessageEvent) => {
          // Security: only accept messages from parent
          if (event.source !== window.parent) {
            return;
          }

          if (event.data.type === "cal-extension-oauth-result") {
            window.removeEventListener("message", messageHandler);
            if (timeoutId) {
              clearTimeout(timeoutId);
            }

            if (event.data.success) {
              resolve(event.data.responseUrl);
            } else {
              console.error("OAuth flow failed:", event.data.error);
              reject(new Error(event.data.error || "OAuth flow failed"));
            }
          }
        };

        window.addEventListener("message", messageHandler);

        window.parent.postMessage(
          {
            type: "cal-extension-oauth-request",
            authUrl: authUrl,
          },
          "*"
        );

        timeoutId = setTimeout(() => {
          console.error("OAuth flow timeout - no response from extension");
          window.removeEventListener("message", messageHandler);
          reject(new Error("OAuth flow timeout - no response from extension"));
        }, 30000);
      } else {
        reject(new Error("Chrome extension context not detected"));
      }
    });
  }

  private async getAuthorizationResult(
    codeChallenge: string,
    state: string
  ): Promise<AuthSession.AuthSessionResult | { type: string; params: Record<string, string> }> {
    const authUrl = this.buildAuthorizationUrl(codeChallenge, state);

    if (this.isMobileApp()) {
      const result = await WebBrowser.openAuthSessionAsync(authUrl, this.config.redirectUri);

      if (result.type === "success") {
        const params = this.parseCallbackUrl(result.url);
        return { type: "success" as const, params };
      }

      return { type: result.type, params: {} } as { type: string; params: Record<string, string> };
    } else {
      // Treat everything else as browser extension
      try {
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
    }
  }

  private async getDiscoveryEndpoints(): Promise<AuthSession.DiscoveryDocument> {
    const fallbackDiscovery: AuthSession.DiscoveryDocument = {
      authorizationEndpoint: `${this.config.calcomBaseUrl}/auth/oauth2/authorize`,
      tokenEndpoint: `${this.config.calcomBaseUrl}/api/auth/oauth/token`,
      revocationEndpoint: `${this.config.calcomBaseUrl}/api/auth/oauth/revoke`,
    };

    const isCrossOriginWeb =
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      (() => {
        try {
          return new URL(this.config.calcomBaseUrl).origin !== window.location.origin;
        } catch {
          return true;
        }
      })();

    // Skip discovery fetch when we know CORS will block it (e.g. companion.cal.com -> app.cal.com).
    if (isCrossOriginWeb) {
      return fallbackDiscovery;
    }

    try {
      const discovery = await AuthSession.fetchDiscoveryAsync(this.config.calcomBaseUrl);
      return {
        ...fallbackDiscovery,
        ...discovery,
      };
    } catch (error) {
      console.warn("Failed to load discovery document, using fallback endpoints", error);
      return fallbackDiscovery;
    }
  }

  private parseCallbackUrl(url: string): Record<string, string> {
    const urlObj = new URL(url);
    const params: Record<string, string> = {};

    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    if (Object.keys(params).length === 0 && urlObj.hash) {
      const hashParams = new URLSearchParams(urlObj.hash.substring(1));
      hashParams.forEach((value, key) => {
        params[key] = value;
      });
    }

    return params;
  }

  private async exchangeCodeForTokens(code: string, state?: string): Promise<OAuthTokens> {
    if (!this.codeVerifier) {
      throw new Error("No code verifier available");
    }

    // Extension: use APIs to avoid CORS
    if (!this.isMobileApp() && typeof window !== "undefined" && window.parent !== window) {
      return await this.exchangeTokensViaExtension(code, state);
    }

    const tokenEndpoint = `${this.config.calcomBaseUrl}/api/auth/oauth/token`;

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

      try {
        const errorJson = JSON.parse(errorData);
        console.error("Parsed error:", errorJson);
      } catch {
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

  private async exchangeTokensViaExtension(code: string, state?: string): Promise<OAuthTokens> {
    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | null = null;

      const messageHandler = (event: MessageEvent) => {
        // Security: only accept messages from parent
        if (event.source !== window.parent) {
          return;
        }

        if (event.data.type === "cal-extension-token-exchange-result") {
          window.removeEventListener("message", messageHandler);
          if (timeoutId) {
            clearTimeout(timeoutId);
          }

          if (event.data.success) {
            resolve(event.data.tokens);
          } else {
            console.error("Token exchange failed via extension:", event.data.error);
            reject(new Error(event.data.error || "Token exchange failed"));
          }
        }
      };

      window.addEventListener("message", messageHandler);

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
          state: state, // CSRF validation in background script
          tokenEndpoint: `${this.config.calcomBaseUrl}/api/auth/oauth/token`,
        },
        "*"
      );

      timeoutId = setTimeout(() => {
        window.removeEventListener("message", messageHandler);
        reject(new Error("Token exchange timeout"));
      }, 30000);
    });
  }

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
      refreshToken: tokenData.refresh_token || refreshToken,
      tokenType: tokenData.token_type || "Bearer",
      expiresAt: tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : undefined,
      scope: tokenData.scope,
    };

    return tokens;
  }

  isTokenExpired(tokens: OAuthTokens): boolean {
    if (!tokens.expiresAt) {
      return false;
    }
    // 5-minute buffer before expiry
    return Date.now() >= tokens.expiresAt - 5 * 60 * 1000;
  }
  clearPKCEParams(): void {
    this.codeVerifier = null;
    this.state = null;
  }
}

export function createCalComOAuthService(overrides: Partial<OAuthConfig> = {}): CalComOAuthService {
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
