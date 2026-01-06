/**
 * OAuth token expiration constants
 */
export const OAUTH_TOKEN_EXPIRY = {
  /** Access token expires in 30 minutes */
  ACCESS_TOKEN: 1800,
  /** Refresh token expires in 30 days */
  REFRESH_TOKEN: 30 * 24 * 60 * 60,
} as const;
