import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as Crypto from "expo-crypto";
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

  /**
   * Generate PKCE parameters
   */
  private async generatePKCEParams(): Promise<{
    codeVerifier: string;
    codeChallenge: string;
    state: string;
  }> {
    // Generate code verifier (43-128 characters, URL-safe)
    const codeVerifier = this.generateCodeVerifier();

    // Generate code challenge using SHA256
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    // Generate state parameter for CSRF protection
    const state = this.generateRandomString(32);

    this.codeVerifier = codeVerifier;
    this.state = state;

    return { codeVerifier, codeChallenge, state };
  }

  /**
   * Generate code challenge from code verifier using SHA256 and base64url encoding
   * Matches Cal.com's expected format: echo -n "{CODE_VERIFIER}" | openssl dgst -binary -sha256 | openssl base64 -A | tr -d '=' | tr '+' '-' | tr '/' '_'
   */
  private async generateCodeChallenge(codeVerifier: string): Promise<string> {
    try {
      // Use SHA256 with BASE64 encoding, then convert to base64url
      const base64Hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        codeVerifier,
        { encoding: Crypto.CryptoEncoding.BASE64 }
      );

      // Convert base64 to base64url (RFC 4648 § 5) - matches Cal.com format
      // openssl base64 -A outputs without newlines, tr commands convert to base64url
      const base64url = base64Hash
        .replace(/\+/g, "-") // + becomes -
        .replace(/\//g, "_") // / becomes _
        .replace(/=/g, ""); // remove padding

      return base64url;
    } catch (error) {
      console.error("Failed to generate code challenge:", error);
      throw new Error("Failed to generate OAuth code challenge");
    }
  }

  /**
   * Generate a cryptographically secure code verifier
   * Following Cal.com's method: base64url-encoded random 32 bytes
   * Equivalent to: openssl rand -base64 32 | tr -d '=' | tr '+' '-' | tr '/' '_'
   */
  private generateCodeVerifier(): string {
    try {
      // Generate 32 random bytes
      const randomBytes = new Uint8Array(32);

      if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        // Web environment
        crypto.getRandomValues(randomBytes);
      } else {
        // React Native environment using expo-crypto
        const expoRandomBytes = Crypto.getRandomBytes(32);
        const bytes =
          expoRandomBytes instanceof Uint8Array ? expoRandomBytes : new Uint8Array(expoRandomBytes);
        randomBytes.set(bytes);
      }

      // Convert to base64 using built-in methods
      let base64: string;

      if (typeof btoa !== "undefined") {
        // Web environment - use btoa
        const binaryString = String.fromCharCode.apply(null, Array.from(randomBytes));
        base64 = btoa(binaryString);
      } else {
        // React Native fallback - manual base64 encoding
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        let result = "";

        for (let i = 0; i < randomBytes.length; i += 3) {
          const a = randomBytes[i];
          const b = i + 1 < randomBytes.length ? randomBytes[i + 1] : 0;
          const c = i + 2 < randomBytes.length ? randomBytes[i + 2] : 0;

          const triplet = (a << 16) | (b << 8) | c;

          result += chars[(triplet >> 18) & 63];
          result += chars[(triplet >> 12) & 63];
          result += i + 1 < randomBytes.length ? chars[(triplet >> 6) & 63] : "=";
          result += i + 2 < randomBytes.length ? chars[triplet & 63] : "=";
        }
        base64 = result;
      }

      // Convert to base64url format (remove padding, replace + with -, / with _)
      const base64url = base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

      return base64url;
    } catch (error) {
      console.warn("Failed to generate secure code verifier, using fallback:", error);
      // Simple fallback that should work everywhere
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
      let result = "";
      for (let i = 0; i < 43; i++) {
        // Minimum length for PKCE
        result += chars[Math.floor(Math.random() * chars.length)];
      }
      return result;
    }
  }

  /**
   * Generate a cryptographically secure random string
   */
  private generateRandomString(length: number): string {
    try {
      const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

      if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        let result = "";
        for (let i = 0; i < length; i++) {
          result += charset[array[i] % charset.length];
        }
        return result;
      } else {
        const randomBytes = Crypto.getRandomBytes(length);
        let result = "";

        // Convert to Uint8Array if it's not already
        const bytes = randomBytes instanceof Uint8Array ? randomBytes : new Uint8Array(randomBytes);

        for (let i = 0; i < length; i++) {
          result += charset[bytes[i] % charset.length];
        }
        return result;
      }
    } catch (error) {
      console.warn("Failed to generate secure random string, using fallback:", error);
      const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let result = "";
      for (let i = 0; i < length; i++) {
        result += charset[Math.floor(Math.random() * charset.length)];
      }
      return result;
    }
  }

  /**
   * Build authorization URL with PKCE parameters
   */
  async buildAuthorizationUrl(): Promise<string> {
    const { codeChallenge, state } = await this.generatePKCEParams();

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: "code",
      redirect_uri: this.config.redirectUri,
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    const authUrl = `${this.config.calcomBaseUrl}/auth/oauth2/authorize?${params.toString()}`;

    return authUrl;
  }

  /**
   * Start OAuth authorization flow
   */
  async startAuthorizationFlow(): Promise<OAuthTokens> {
    try {
      // Generate PKCE params once and store them
      // NOTE: generatePKCEParams() already sets this.codeVerifier and this.state internally
      const { codeVerifier, codeChallenge, state } = await this.generatePKCEParams();

      // Verify the challenge matches the verifier (sanity check)
      const verifyChallenge = await this.generateCodeChallenge(codeVerifier);

      if (codeChallenge !== verifyChallenge) {
        throw new Error(
          "PKCE code challenge verification failed - code verifier and challenge don't match!"
        );
      }

      // Create the authorization request with our generated values
      // For web, AuthRequest will use our codeChallenge
      // For mobile, we'll build the URL manually to ensure we use our PKCE params
      const request = new AuthSession.AuthRequest({
        clientId: this.config.clientId,
        redirectUri: this.config.redirectUri,
        responseType: AuthSession.ResponseType.Code,
        state: state,
        codeChallenge: codeChallenge,
        codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
      });

      let authResult;

      if (Platform.OS === "web") {
        // For web, check if we have stored callback parameters first
        if (typeof window !== "undefined") {
          const storedCode = window.localStorage.getItem("oauth_callback_code");
          const storedState = window.localStorage.getItem("oauth_callback_state");

          if (storedCode) {
            // Clear the stored parameters
            window.localStorage.removeItem("oauth_callback_code");
            window.localStorage.removeItem("oauth_callback_state");

            authResult = {
              type: "success",
              params: {
                code: storedCode,
                state: storedState,
              },
            };
          } else {
            // Proceed with normal OAuth flow
            try {
              // Try to fetch discovery document first
              const discovery = await AuthSession.fetchDiscoveryAsync(
                `${this.config.calcomBaseUrl}/.well-known/openid_configuration`
              ).catch(() => {
                // If discovery fails, provide manual endpoints
                return {
                  authorizationEndpoint: `${this.config.calcomBaseUrl}/auth/oauth2/authorize`,
                  tokenEndpoint: `${this.config.calcomBaseUrl}/api/auth/oauth/token`,
                };
              });

              authResult = await request.promptAsync(discovery);
            } catch (error) {
              console.warn("Discovery failed, using manual endpoints:", error);
              // Fallback to manual discovery if fetchDiscoveryAsync fails
              const discovery = {
                authorizationEndpoint: `${this.config.calcomBaseUrl}/auth/oauth2/authorize`,
                tokenEndpoint: `${this.config.calcomBaseUrl}/api/auth/oauth/token`,
              };

              authResult = await request.promptAsync(discovery);
            }
          }
        }
      } else {
        // For mobile, use WebBrowser-based flow
        // Build the authorization URL manually to ensure we use our PKCE parameters
        const params = new URLSearchParams({
          client_id: this.config.clientId,
          response_type: "code",
          redirect_uri: this.config.redirectUri,
          state: state,
          code_challenge: codeChallenge,
          code_challenge_method: "S256",
        });

        const authUrlString = `${this.config.calcomBaseUrl}/auth/oauth2/authorize?${params.toString()}`;

        const result = await WebBrowser.openAuthSessionAsync(
          authUrlString,
          this.config.redirectUri
        );

        if (result.type === "success") {
          // Parse the URL manually to extract parameters
          const url = new URL(result.url);
          const params: any = {};

          // Get parameters from search params (after ?)
          url.searchParams.forEach((value, key) => {
            params[key] = value;
          });

          // Also try to parse parameters from hash fragment (after #) if searchParams is empty
          if (Object.keys(params).length === 0 && url.hash) {
            const hashParams = new URLSearchParams(url.hash.substring(1)); // Remove the # symbol
            hashParams.forEach((value, key) => {
              params[key] = value;
            });
          }

          // Fallback: manually parse the full URL if still no params
          if (Object.keys(params).length === 0) {
            const urlParts = result.url.split("?");
            if (urlParts.length > 1) {
              const queryString = urlParts[1].split("#")[0]; // Remove any hash fragment
              const searchParams = new URLSearchParams(queryString);
              searchParams.forEach((value, key) => {
                params[key] = value;
              });
            }
          }

          authResult = {
            type: "success",
            params: params,
          };
        } else {
          authResult = {
            type: result.type,
            params: {},
          };
        }
      }

      if (authResult.type === "success") {
        const params = authResult.params || {};
        // Cal.com might use 'code' or 'authorizationCode'
        const code = params.code || params.authorizationCode;
        const returnedState = params.state;

        if (returnedState !== this.state) {
          throw new Error(
            `Invalid state parameter - possible CSRF attack. Expected: ${this.state}, Received: ${returnedState}`
          );
        }

        if (!code) {
          throw new Error(
            `No authorization code received. Params received: ${JSON.stringify(authResult.params)}`
          );
        }

        // Exchange code for tokens
        return await this.exchangeCodeForTokens(code);
      } else if (authResult.type === "error") {
        const errorDescription =
          authResult.params?.error_description || authResult.error?.message || "Unknown error";
        throw new Error(`OAuth error: ${errorDescription}`);
      } else if (authResult.type === "cancel") {
        throw new Error("OAuth flow was cancelled by user");
      } else {
        throw new Error("OAuth flow failed or was dismissed");
      }
    } catch (error) {
      console.error("OAuth authorization error:", error);
      throw error;
    }
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
