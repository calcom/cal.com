/**
 * Authentication configuration and functions for Cal.com API
 */

// Authentication configuration
interface AuthConfig {
  accessToken?: string;
  refreshToken?: string;
}

// Global auth state
const authConfig: AuthConfig = {};

// Token refresh callback - will be set by AuthContext
let tokenRefreshCallback: ((accessToken: string, refreshToken?: string) => Promise<void>) | null =
  null;

// Refresh token function - will be set by AuthContext
let refreshTokenFunction:
  | ((refreshToken: string) => Promise<{ accessToken: string; refreshToken?: string }>)
  | null = null;

/**
 * Set OAuth access token for authentication
 */
export function setAccessToken(accessToken: string, refreshToken?: string): void {
  authConfig.accessToken = accessToken;
  if (refreshToken) {
    authConfig.refreshToken = refreshToken;
  }
}

/**
 * Set refresh token function for automatic token refresh
 */
export function setRefreshTokenFunction(
  refreshFn: (refreshToken: string) => Promise<{ accessToken: string; refreshToken?: string }>
): void {
  refreshTokenFunction = refreshFn;
}

/**
 * Clear all authentication
 */
export function clearAuth(): void {
  authConfig.accessToken = undefined;
  authConfig.refreshToken = undefined;
  tokenRefreshCallback = null;
  refreshTokenFunction = null;
}

/**
 * Set token refresh callback for OAuth token refresh
 */
export function setTokenRefreshCallback(
  callback: (accessToken: string, refreshToken?: string) => Promise<void>
): void {
  tokenRefreshCallback = callback;
}

/**
 * Get current authentication header
 */
export function getAuthHeader(): string {
  if (authConfig.accessToken) {
    return `Bearer ${authConfig.accessToken}`;
  } else {
    throw new Error("No authentication configured. Please sign in with OAuth.");
  }
}

/**
 * Get the current auth config (for internal use by request module)
 */
export function getAuthConfig(): AuthConfig {
  return authConfig;
}

/**
 * Get the token refresh callback (for internal use by request module)
 */
export function getTokenRefreshCallback(): typeof tokenRefreshCallback {
  return tokenRefreshCallback;
}

/**
 * Get the refresh token function (for internal use by request module)
 */
export function getRefreshTokenFunction(): typeof refreshTokenFunction {
  return refreshTokenFunction;
}
