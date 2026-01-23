/// <reference types="chrome" />
import { fromByteArray } from "base64-js";
import type * as AuthSession from "expo-auth-session";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import { fetchWithTimeout } from "@/utils/network";
import { safeLogWarn } from "@/utils/safeLogger";

WebBrowser.maybeCompleteAuthSession();

// Message types for extension communication
const EXTENSION_MESSAGE_TYPES = {
  OAUTH_REQUEST: "cal-extension-oauth-request",
  OAUTH_RESULT: "cal-extension-oauth-result",
  TOKEN_EXCHANGE_REQUEST: "cal-extension-token-exchange-request",
  TOKEN_EXCHANGE_RESULT: "cal-extension-token-exchange-result",
  SYNC_TOKENS: "cal-extension-sync-tokens",
  SYNC_TOKENS_RESULT: "cal-extension-sync-tokens-result",
  CLEAR_TOKENS: "cal-extension-clear-tokens",
  CLEAR_TOKENS_RESULT: "cal-extension-clear-tokens-result",
  REQUEST_SESSION: "cal-extension-request-session",
  SESSION_TOKEN: "cal-extension-session-token",
} as const;

let extensionSessionToken: string | null = null;
let sessionTokenPromise: Promise<string> | null = null;

const OAUTH_TIMEOUT_MS = 5 * 60 * 1000;
const TOKEN_EXCHANGE_TIMEOUT_MS = 30 * 1000;
const SESSION_TOKEN_TIMEOUT_MS = 5000;

async function getExtensionSessionToken(): Promise<string | null> {
  if (extensionSessionToken) {
    return extensionSessionToken;
  }

  if (sessionTokenPromise) {
    return sessionTokenPromise;
  }

  if (typeof window === "undefined" || window.parent === window) {
    return null;
  }

  sessionTokenPromise = new Promise<string>((resolve) => {
    const timeoutId = setTimeout(() => {
      window.removeEventListener("message", messageHandler);
      sessionTokenPromise = null;
      resolve("");
    }, SESSION_TOKEN_TIMEOUT_MS);

    const messageHandler = (event: MessageEvent) => {
      if (event.source !== window.parent) {
        return;
      }
      if (event.data.type !== EXTENSION_MESSAGE_TYPES.SESSION_TOKEN) {
        return;
      }

      clearTimeout(timeoutId);
      window.removeEventListener("message", messageHandler);

      const token = event.data.sessionToken || "";
      extensionSessionToken = token;
      sessionTokenPromise = null;
      resolve(token);
    };

    window.addEventListener("message", messageHandler);
    window.parent.postMessage({ type: EXTENSION_MESSAGE_TYPES.REQUEST_SESSION }, "*");
  });

  return sessionTokenPromise;
}

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

  constructor(config: OAuthConfig) {
    this.config = config;
  }

  private async generatePKCEParams() {
    const codeVerifier = this.generateRandomBase64Url();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    const state = this.generateRandomBase64Url();

    this.codeVerifier = codeVerifier;

    return { codeVerifier, codeChallenge, state };
  }

  private async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const base64Hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      codeVerifier,
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );
    return base64Hash.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
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
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    if (Platform.OS === "ios") {
      params.append("register", "false");
    }

    return `${this.config.calcomBaseUrl}/auth/oauth2/authorize?${params.toString()}`;
  }

  private parseCallbackUrl(url: string): Record<string, string> {
    const parsed = new URL(url);
    const params: Record<string, string> = {};
    parsed.searchParams.forEach((v, k) => {
      params[k] = v;
    });
    return params;
  }

  private isMobileApp(): boolean {
    return Platform.OS !== "web";
  }

  private isRunningInIframe(): boolean {
    return Platform.OS === "web" && typeof window !== "undefined" && window.parent !== window;
  }

  async startAuthorizationFlow(): Promise<OAuthTokens> {
    const { codeChallenge, state } = await this.generatePKCEParams();

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const storedTokens = this.checkForStoredCallback(state);
      if (storedTokens) {
        return storedTokens;
      }
    }

    const result = await this.getAuthorizationResult(codeChallenge, state);

    if (result.type !== "success") {
      throw new Error("OAuth flow failed");
    }

    const { code, state: returnedState } = result.params;

    if (!code) {
      throw new Error("No authorization code received");
    }

    if (returnedState !== state) {
      throw new Error("Invalid state parameter");
    }

    return this.exchangeCodeForTokens(code, returnedState);
  }

  private checkForStoredCallback(state: string): Promise<OAuthTokens> | null {
    const storedCode = window.localStorage.getItem(`oauth_callback_code_${state}`);
    const storedState = window.localStorage.getItem(`oauth_callback_state_${state}`);

    if (!storedCode || !storedState) {
      return null;
    }

    if (storedState !== state) {
      throw new Error("Invalid state parameter");
    }

    window.localStorage.removeItem(`oauth_callback_code_${state}`);
    window.localStorage.removeItem(`oauth_callback_state_${state}`);

    return this.exchangeCodeForTokens(storedCode, storedState);
  }

  private async getAuthorizationResult(
    codeChallenge: string,
    state: string
  ): Promise<{ type: "success"; params: Record<string, string> } | { type: "error" }> {
    const authUrl = this.buildAuthorizationUrl(codeChallenge, state);

    if (this.isMobileApp()) {
      return this.getMobileAuthResult(authUrl);
    }

    return this.getExtensionAuthResult(authUrl);
  }

  private async getMobileAuthResult(
    authUrl: string
  ): Promise<{ type: "success"; params: Record<string, string> } | { type: "error" }> {
    const result = await WebBrowser.openAuthSessionAsync(authUrl, this.config.redirectUri, {
      preferEphemeralSession: true,
    });

    if (result.type === "success") {
      return { type: "success", params: this.parseCallbackUrl(result.url) };
    }

    return { type: "error" };
  }

  private async getExtensionAuthResult(
    authUrl: string
  ): Promise<{ type: "success"; params: Record<string, string> } | { type: "error" }> {
    try {
      const responseUrl = await this.launchExtensionAuthFlow(authUrl);
      return { type: "success", params: this.parseCallbackUrl(responseUrl) };
    } catch {
      return { type: "error" };
    }
  }

  private async launchExtensionAuthFlow(authUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Try Chrome/Chromium identity API first
      if (typeof chrome !== "undefined" && chrome.identity) {
        chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (responseUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (responseUrl) {
            resolve(responseUrl);
          } else {
            reject(new Error("OAuth cancelled"));
          }
        });
        return;
      }

      // Try Firefox/Safari browser.identity API (Promise-based)
      if (typeof browser !== "undefined" && browser?.identity) {
        try {
          browser.identity
            .launchWebAuthFlow({ url: authUrl, interactive: true })
            .then((responseUrl: string | undefined) => {
              if (responseUrl) {
                resolve(responseUrl);
              } else {
                reject(new Error("OAuth cancelled"));
              }
            })
            .catch((error: Error) => {
              reject(new Error(`OAuth flow failed: ${error.message}`));
            });
          return;
        } catch {
          // Fall through to iframe-based flow
        }
      }

      if (this.isRunningInIframe()) {
        this.requestOAuthViaPostMessage(authUrl, resolve, reject);
        return;
      }

      reject(new Error("Extension context not available"));
    });
  }

  private requestOAuthViaPostMessage(
    authUrl: string,
    resolve: (url: string) => void,
    reject: (error: Error) => void
  ): void {
    const timeoutId = setTimeout(() => {
      window.removeEventListener("message", messageHandler);
      reject(new Error("OAuth flow timed out"));
    }, OAUTH_TIMEOUT_MS);

    const messageHandler = (event: MessageEvent) => {
      // Validate message source - must come from parent window (content script)
      if (event.source !== window.parent) {
        return;
      }
      if (event.data.type !== EXTENSION_MESSAGE_TYPES.OAUTH_RESULT) {
        return;
      }

      clearTimeout(timeoutId);
      window.removeEventListener("message", messageHandler);

      if (event.data.success && event.data.responseUrl) {
        resolve(event.data.responseUrl);
      } else {
        reject(new Error(event.data.error || "OAuth flow failed"));
      }
    };

    window.addEventListener("message", messageHandler);
    // Using "*" for targetOrigin because parent is the host page (e.g., gmail.com).
    // Security: source validation above ensures responses only come from parent window.
    window.parent.postMessage({ type: EXTENSION_MESSAGE_TYPES.OAUTH_REQUEST, authUrl }, "*");
  }

  private async exchangeCodeForTokens(code: string, state?: string): Promise<OAuthTokens> {
    if (!this.codeVerifier) {
      throw new Error("Missing code verifier");
    }

    const tokenRequest = {
      grant_type: "authorization_code",
      client_id: this.config.clientId,
      code,
      redirect_uri: this.config.redirectUri,
      code_verifier: this.codeVerifier,
    };

    const tokenEndpoint = `${this.config.calcomBaseUrl}/api/auth/oauth/token`;

    if (this.isRunningInIframe()) {
      return this.exchangeCodeForTokensViaExtension(tokenRequest, tokenEndpoint, state);
    }

    return this.exchangeCodeForTokensDirect(tokenRequest, tokenEndpoint);
  }

  private async exchangeCodeForTokensDirect(
    tokenRequest: Record<string, string>,
    tokenEndpoint: string
  ): Promise<OAuthTokens> {
    const response = await fetchWithTimeout(
      tokenEndpoint,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: new URLSearchParams(tokenRequest).toString(),
      },
      30000
    );

    if (!response.ok) {
      throw new Error("Token exchange failed");
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: data.token_type ?? "Bearer",
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
      scope: data.scope,
    };
  }

  private async exchangeCodeForTokensViaExtension(
    tokenRequest: Record<string, string>,
    tokenEndpoint: string,
    state?: string
  ): Promise<OAuthTokens> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        window.removeEventListener("message", messageHandler);
        reject(new Error("Token exchange timed out"));
      }, TOKEN_EXCHANGE_TIMEOUT_MS);

      const messageHandler = (event: MessageEvent) => {
        // Validate message source - must come from parent window (content script)
        if (event.source !== window.parent) {
          return;
        }
        if (event.data.type !== EXTENSION_MESSAGE_TYPES.TOKEN_EXCHANGE_RESULT) {
          return;
        }

        clearTimeout(timeoutId);
        window.removeEventListener("message", messageHandler);

        if (event.data.success && event.data.tokens) {
          resolve(event.data.tokens);
        } else {
          reject(new Error(event.data.error || "Token exchange failed"));
        }
      };

      window.addEventListener("message", messageHandler);
      // See comment in requestOAuthViaPostMessage for security rationale
      window.parent.postMessage(
        {
          type: EXTENSION_MESSAGE_TYPES.TOKEN_EXCHANGE_REQUEST,
          tokenRequest,
          tokenEndpoint,
          state,
        },
        "*"
      );
    });
  }

  getDiscoveryEndpoints(): AuthSession.DiscoveryDocument {
    return {
      authorizationEndpoint: `${this.config.calcomBaseUrl}/auth/oauth2/authorize`,
      tokenEndpoint: `${this.config.calcomBaseUrl}/api/auth/oauth/token`,
      revocationEndpoint: `${this.config.calcomBaseUrl}/api/auth/oauth/revoke`,
    };
  }

  isTokenExpired(tokens: OAuthTokens): boolean {
    if (!tokens.expiresAt) return false;
    return Date.now() >= tokens.expiresAt - 5 * 60 * 1000;
  }

  clearPKCEParams(): void {
    this.codeVerifier = null;
  }

  async syncTokensToExtension(tokens: OAuthTokens): Promise<void> {
    if (!this.isRunningInIframe()) {
      return;
    }

    const sessionToken = await getExtensionSessionToken();
    if (!sessionToken) {
      safeLogWarn("No session token available for token sync");
      return;
    }

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        window.removeEventListener("message", messageHandler);
        resolve();
      }, 5000);

      const messageHandler = (event: MessageEvent) => {
        if (event.source !== window.parent) {
          return;
        }
        if (event.data.type !== EXTENSION_MESSAGE_TYPES.SYNC_TOKENS_RESULT) {
          return;
        }

        clearTimeout(timeoutId);
        window.removeEventListener("message", messageHandler);

        if (event.data.success) {
          resolve();
        } else {
          safeLogWarn("Failed to sync tokens to extension", event.data.error);
          resolve();
        }
      };

      window.addEventListener("message", messageHandler);
      window.parent.postMessage(
        { type: EXTENSION_MESSAGE_TYPES.SYNC_TOKENS, tokens, sessionToken },
        "*"
      );
    });
  }

  async clearTokensFromExtension(): Promise<void> {
    if (!this.isRunningInIframe()) {
      return;
    }

    const sessionToken = await getExtensionSessionToken();
    if (!sessionToken) {
      safeLogWarn("No session token available for token clear");
      return;
    }

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        window.removeEventListener("message", messageHandler);
        resolve();
      }, 5000);

      const messageHandler = (event: MessageEvent) => {
        if (event.source !== window.parent) {
          return;
        }
        if (event.data.type !== EXTENSION_MESSAGE_TYPES.CLEAR_TOKENS_RESULT) {
          return;
        }

        clearTimeout(timeoutId);
        window.removeEventListener("message", messageHandler);

        if (event.data.success) {
          resolve();
        } else {
          safeLogWarn("Failed to clear tokens from extension", event.data.error);
          resolve();
        }
      };

      window.addEventListener("message", messageHandler);
      window.parent.postMessage({ type: EXTENSION_MESSAGE_TYPES.CLEAR_TOKENS, sessionToken }, "*");
    });
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const tokenRequest = {
      grant_type: "refresh_token",
      client_id: this.config.clientId,
      refresh_token: refreshToken,
    };

    const refreshTokenEndpoint = `${this.config.calcomBaseUrl}/api/auth/oauth/refreshToken`;

    if (this.isRunningInIframe()) {
      const tokens = await this.exchangeCodeForTokensViaExtension(
        tokenRequest,
        refreshTokenEndpoint
      );
      await this.syncTokensToExtension(tokens);
      return tokens;
    }

    const result = await this.exchangeCodeForTokensDirect(tokenRequest, refreshTokenEndpoint);
    return result;
  }
}

/**
 * Browser type for OAuth configuration selection.
 * Used to determine which OAuth client credentials to use.
 */
type BrowserType = "chrome" | "firefox" | "safari" | "edge" | "brave" | "unknown";

/**
 * Detects the current browser type for OAuth configuration.
 * This is used in web/extension context to select the appropriate OAuth credentials.
 */
function detectBrowserType(): BrowserType {
  if (Platform.OS !== "web" || typeof navigator === "undefined") {
    return "unknown";
  }

  const userAgent = navigator.userAgent.toLowerCase();

  // Check for Brave first (it identifies as Chrome but has Brave-specific properties)
  if (navigator.brave && typeof navigator.brave.isBrave === "function") {
    return "brave";
  }

  // Check for Edge (Chromium-based Edge includes "Edg/" in user agent)
  if (userAgent.includes("edg/")) {
    return "edge";
  }

  // Check for Firefox
  if (userAgent.includes("firefox")) {
    return "firefox";
  }

  // Check for Safari (must check after Chrome since Chrome also includes "safari")
  if (
    userAgent.includes("safari") &&
    !userAgent.includes("chrome") &&
    !userAgent.includes("chromium")
  ) {
    return "safari";
  }

  // Check for Chrome (or other Chromium-based browsers)
  if (userAgent.includes("chrome") || userAgent.includes("chromium")) {
    return "chrome";
  }

  return "unknown";
}

/**
 * Gets browser-specific OAuth configuration.
 * Falls back to default (Chrome) config if browser-specific config is not available.
 */
function getBrowserSpecificOAuthConfig(): { clientId: string; redirectUri: string } {
  // Default values (Chrome/Brave)
  const defaultClientId = process.env.EXPO_PUBLIC_CALCOM_OAUTH_CLIENT_ID || "";
  const defaultRedirectUri = process.env.EXPO_PUBLIC_CALCOM_OAUTH_REDIRECT_URI || "";

  // For mobile apps, always use default config
  if (Platform.OS !== "web") {
    return { clientId: defaultClientId, redirectUri: defaultRedirectUri };
  }

  const browserType = detectBrowserType();

  switch (browserType) {
    case "firefox":
      return {
        clientId: process.env.EXPO_PUBLIC_CALCOM_OAUTH_CLIENT_ID_FIREFOX || defaultClientId,
        redirectUri:
          process.env.EXPO_PUBLIC_CALCOM_OAUTH_REDIRECT_URI_FIREFOX || defaultRedirectUri,
      };

    case "safari":
      return {
        clientId: process.env.EXPO_PUBLIC_CALCOM_OAUTH_CLIENT_ID_SAFARI || defaultClientId,
        redirectUri: process.env.EXPO_PUBLIC_CALCOM_OAUTH_REDIRECT_URI_SAFARI || defaultRedirectUri,
      };

    case "edge":
      return {
        clientId: process.env.EXPO_PUBLIC_CALCOM_OAUTH_CLIENT_ID_EDGE || defaultClientId,
        redirectUri: process.env.EXPO_PUBLIC_CALCOM_OAUTH_REDIRECT_URI_EDGE || defaultRedirectUri,
      };
    default:
      // Chrome, Brave, and unknown browsers use the default configuration
      return { clientId: defaultClientId, redirectUri: defaultRedirectUri };
  }
}

export function createCalComOAuthService(overrides: Partial<OAuthConfig> = {}): CalComOAuthService {
  // Get browser-specific OAuth config
  const browserConfig = getBrowserSpecificOAuthConfig();

  const config: OAuthConfig = {
    clientId: browserConfig.clientId,
    redirectUri: browserConfig.redirectUri,
    calcomBaseUrl: "https://app.cal.com",
    ...overrides,
  };

  if (!config.clientId || !config.redirectUri) {
    throw new Error("OAuth configuration incomplete");
  }

  return new CalComOAuthService(config);
}
