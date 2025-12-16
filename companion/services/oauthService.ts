/// <reference types="chrome" />
import { fromByteArray } from "base64-js";
import * as AuthSession from "expo-auth-session";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

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

  private async generatePKCEParams() {
    const codeVerifier = this.generateRandomBase64Url();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    const state = this.generateRandomBase64Url();

    this.codeVerifier = codeVerifier;
    this.state = state;

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

    return `${this.config.calcomBaseUrl}/auth/oauth2/authorize?${params.toString()}`;
  }

  private isMobileApp(): boolean {
    return Platform.OS !== "web";
  }

  async startAuthorizationFlow(): Promise<OAuthTokens> {
    const { codeChallenge, state } = await this.generatePKCEParams();

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const storedCode = window.localStorage.getItem(`oauth_callback_code_${state}`);
      const storedState = window.localStorage.getItem(`oauth_callback_state_${state}`);

      if (storedCode && storedState) {
        if (storedState !== state) {
          throw new Error("Invalid state parameter");
        }

        window.localStorage.removeItem(`oauth_callback_code_${state}`);
        window.localStorage.removeItem(`oauth_callback_state_${state}`);

        return this.exchangeCodeForTokens(storedCode, state);
      }
    }

    const result = await this.getAuthorizationResult(codeChallenge, state);

    if (result.type !== "success") {
      throw new Error("OAuth flow failed");
    }

    const code = result.params.code;
    const returnedState = result.params.state;

    if (!code) {
      throw new Error("No authorization code received");
    }

    if (returnedState !== state) {
      throw new Error("Invalid state parameter");
    }

    return this.exchangeCodeForTokens(code, state);
  }

  private async getAuthorizationResult(
    codeChallenge: string,
    state: string
  ): Promise<{ type: "success"; params: Record<string, string> } | { type: "error" }> {
    const authUrl = this.buildAuthorizationUrl(codeChallenge, state);

    if (this.isMobileApp()) {
      const result = await WebBrowser.openAuthSessionAsync(authUrl, this.config.redirectUri, {
        preferEphemeralSession: false,
      });

      if (result.type === "success") {
        return { type: "success", params: this.parseCallbackUrl(result.url) };
      }

      return { type: "error" };
    } else {
      try {
        const responseUrl = await this.launchExtensionAuthFlow(authUrl);
        return { type: "success", params: this.parseCallbackUrl(responseUrl) };
      } catch {
        return { type: "error" };
      }
    }
  }

  private async launchExtensionAuthFlow(authUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
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

      reject(new Error("Extension context not available"));
    });
  }

  private async getDiscoveryEndpoints(): Promise<AuthSession.DiscoveryDocument> {
    return {
      authorizationEndpoint: `${this.config.calcomBaseUrl}/auth/oauth2/authorize`,
      tokenEndpoint: `${this.config.calcomBaseUrl}/api/auth/oauth/token`,
      revocationEndpoint: `${this.config.calcomBaseUrl}/api/auth/oauth/revoke`,
    };
  }

  private parseCallbackUrl(url: string): Record<string, string> {
    const parsed = new URL(url);
    const params: Record<string, string> = {};

    parsed.searchParams.forEach((v, k) => {
      params[k] = v;
    });

    return params;
  }

  private async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    if (!this.codeVerifier) {
      throw new Error("Missing code verifier");
    }

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: this.config.clientId,
      code,
      redirect_uri: this.config.redirectUri,
      code_verifier: this.codeVerifier,
    });

    const response = await fetch(`${this.config.calcomBaseUrl}/api/auth/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    });

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

  isTokenExpired(tokens: OAuthTokens): boolean {
    if (!tokens.expiresAt) return false;
    return Date.now() >= tokens.expiresAt - 5 * 60 * 1000;
  }

  clearPKCEParams() {
    this.codeVerifier = null;
    this.state = null;
  }
}

export function createCalComOAuthService(overrides: Partial<OAuthConfig> = {}): CalComOAuthService {
  const config: OAuthConfig = {
    clientId: process.env.EXPO_PUBLIC_CALCOM_OAUTH_CLIENT_ID || "",
    redirectUri: process.env.EXPO_PUBLIC_CALCOM_OAUTH_REDIRECT_URI || "",
    calcomBaseUrl: "https://app.cal.com",
    ...overrides,
  };

  if (!config.clientId || !config.redirectUri) {
    throw new Error("OAuth configuration incomplete");
  }

  return new CalComOAuthService(config);
}
