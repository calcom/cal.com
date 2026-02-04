/**
 * Core HTTP request functionality for Cal.com API
 */

import { fetchWithTimeout } from "@/utils/network";
import { safeLogError } from "@/utils/safeLogger";

import {
  clearAuth,
  getAuthConfig,
  getAuthHeader,
  getRefreshTokenFunction,
  getTokenRefreshCallback,
} from "./auth";
import { safeParseErrorJson, safeParseJson } from "./utils";

export const API_BASE_URL = "https://api.cal.com/v2";
export const REQUEST_TIMEOUT_MS = 30000;

/**
 * Test function for bookings API specifically
 */
export async function testRawBookingsAPI(): Promise<void> {
  try {
    const url = `${API_BASE_URL}/bookings?status=upcoming&status=unconfirmed&limit=50`;

    const response = await fetchWithTimeout(
      url,
      {
        headers: {
          Authorization: getAuthHeader(),
          "Content-Type": "application/json",
          "cal-api-version": "2024-08-13",
        },
      },
      REQUEST_TIMEOUT_MS
    );

    const responseText = await response.text();

    if (responseText?.trim()) {
      const _responseJson = safeParseJson(responseText);
      if (!_responseJson) {
        safeLogError("[CalComAPIService] Failed to parse bookings response", {
          responseLength: responseText.length,
        });
      }
    }
  } catch (_error) {
    safeLogError("[CalComAPIService] testRawBookingsAPI failed", {
      error: _error,
    });
  }
}

/**
 * Make an authenticated request to the Cal.com API
 */
export async function makeRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  apiVersion: string = "2024-08-13",
  isRetry: boolean = false
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetchWithTimeout(
    url,
    {
      ...options,
      headers: {
        Authorization: getAuthHeader(),
        "Content-Type": "application/json",
        "cal-api-version": apiVersion,
        ...options.headers,
      },
    },
    REQUEST_TIMEOUT_MS
  );

  if (!response.ok) {
    const errorBody = await response.text();

    // Parse error for better user messages
    let errorMessage = response.statusText;

    const errorJson = safeParseErrorJson(errorBody);
    if (errorJson) {
      errorMessage = errorJson?.error?.message || errorJson?.message || response.statusText;
    } else {
      // If JSON parsing fails, use the raw error body
      errorMessage = errorBody || response.statusText;
    }

    // Handle specific error cases
    if (response.status === 401) {
      const authConfig = getAuthConfig();
      const refreshTokenFunction = getRefreshTokenFunction();
      const tokenRefreshCallback = getTokenRefreshCallback();

      if (!isRetry && authConfig.refreshToken && refreshTokenFunction && tokenRefreshCallback) {
        try {
          const newTokens = await refreshTokenFunction(authConfig.refreshToken);

          authConfig.accessToken = newTokens.accessToken;
          if (newTokens.refreshToken) {
            authConfig.refreshToken = newTokens.refreshToken;
          }

          // Notify AuthContext to update stored tokens
          await tokenRefreshCallback(newTokens.accessToken, newTokens.refreshToken);

          // Retry the original request with the new token
          return makeRequest<T>(endpoint, options, apiVersion, true);
        } catch (refreshError) {
          safeLogError("Token refresh failed:", refreshError);
          clearAuth();
          throw new Error("Authentication failed. Please sign in again.");
        }
      }

      if (errorMessage.includes("expired")) {
        throw new Error("Your authentication has expired. Please sign in again.");
      }
      throw new Error("Authentication failed. Please check your credentials.");
    }

    // Include status code in error message for graceful error handling downstream
    throw new Error(`API Error: ${response.status} ${errorMessage}`);
  }

  return response.json();
}
