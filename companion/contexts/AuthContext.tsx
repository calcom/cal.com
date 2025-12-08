/// <reference types="chrome" />

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { WebAuthService } from "../services/webAuth";
import { CalComAPIService } from "../services/calcom";
import {
  createCalComOAuthService,
  OAuthTokens,
  CalComOAuthService,
} from "../services/oauthService";

interface AuthContextType {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  userInfo: any;
  isWebSession: boolean;
  loginFromWebSession: (userInfo: any) => Promise<void>;
  loginWithOAuth: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCESS_TOKEN_KEY = "cal_access_token";
const REFRESH_TOKEN_KEY = "cal_refresh_token";
const OAUTH_TOKENS_KEY = "cal_oauth_tokens";
const AUTH_TYPE_KEY = "cal_auth_type";

type AuthType = "oauth" | "web_session";

interface AuthProviderProps {
  children: ReactNode;
}

// Check if chrome.storage is available (browser extension context)
const isChromeStorageAvailable = (): boolean => {
  return (
    Platform.OS === "web" &&
    typeof chrome !== "undefined" &&
    chrome.storage !== undefined &&
    chrome.storage.local !== undefined
  );
};

// Unified storage helper to abstract web/mobile/extension differences
const storage = {
  get: async (key: string): Promise<string | null> => {
    // Use chrome.storage in browser extension context (most secure)
    if (isChromeStorageAvailable()) {
      return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => {
          resolve(result[key] || null);
        });
      });
    }
    // Fall back to localStorage for regular web apps
    if (Platform.OS === "web") {
      return localStorage.getItem(key);
    }
    // Use SecureStore for mobile
    return await SecureStore.getItemAsync(key);
  },
  set: async (key: string, value: string): Promise<void> => {
    // Use chrome.storage in browser extension context (most secure)
    if (isChromeStorageAvailable()) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [key]: value }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    }
    // Fall back to localStorage for regular web apps
    if (Platform.OS === "web") {
      localStorage.setItem(key, value);
      return;
    }
    // Use SecureStore for mobile
    await SecureStore.setItemAsync(key, value);
  },
  remove: async (key: string): Promise<void> => {
    // Use chrome.storage in browser extension context (most secure)
    if (isChromeStorageAvailable()) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.remove(key, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    }
    // Fall back to localStorage for regular web apps
    if (Platform.OS === "web") {
      localStorage.removeItem(key);
      return;
    }
    // Use SecureStore for mobile
    await SecureStore.deleteItemAsync(key);
  },
  removeAll: async (keys: string[]): Promise<void> => {
    // Use chrome.storage in browser extension context (most secure)
    if (isChromeStorageAvailable()) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.remove(keys, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    }
    // Fall back to localStorage for regular web apps
    if (Platform.OS === "web") {
      keys.forEach((key) => localStorage.removeItem(key));
      return;
    }
    // Use SecureStore for mobile
    await Promise.all(keys.map((key) => SecureStore.deleteItemAsync(key)));
  },
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isWebSession, setIsWebSession] = useState(false);
  const [loading, setLoading] = useState(true);
  const [oauthService] = useState(() => {
    try {
      return createCalComOAuthService();
    } catch (error) {
      console.warn("Failed to initialize OAuth service:", error);
      return null;
    }
  });

  // Setup refresh token function for OAuth
  const setupRefreshTokenFunction = (service: CalComOAuthService) => {
    CalComAPIService.setRefreshTokenFunction(async (refreshToken: string) => {
      const newTokens = await service.refreshAccessToken(refreshToken);
      return {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
      };
    });
  };

  // Common post-login setup: configure API service and fetch user profile
  const setupAfterLogin = async (token: string, refreshToken?: string) => {
    CalComAPIService.setAccessToken(token, refreshToken);

    try {
      await CalComAPIService.getUserProfile();
    } catch (profileError) {
      console.error("Failed to fetch user profile:", profileError);
      // Don't fail login if profile fetch fails
    }
  };

  // Save OAuth tokens to storage
  const saveOAuthTokens = async (tokens: OAuthTokens) => {
    await storage.set(OAUTH_TOKENS_KEY, JSON.stringify(tokens));
    await storage.set(AUTH_TYPE_KEY, "oauth");
  };

  // Clear all auth data from storage
  const clearAuth = async () => {
    await storage.removeAll([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, OAUTH_TOKENS_KEY, AUTH_TYPE_KEY]);
  };

  // Reset all auth state
  const resetAuthState = () => {
    setAccessToken(null);
    setRefreshToken(null);
    setUserInfo(null);
    setIsAuthenticated(false);
    setIsWebSession(false);
    CalComAPIService.clearAuth();
    CalComAPIService.clearUserProfile();
  };

  useEffect(() => {
    checkAuthState();

    // Set up token refresh callback
    const handleTokenRefresh = async (newAccessToken: string, newRefreshToken?: string) => {
      try {
        const tokens: OAuthTokens = {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken || refreshToken || undefined,
          tokenType: "Bearer",
        };

        await saveOAuthTokens(tokens);
        setAccessToken(newAccessToken);
        if (newRefreshToken) {
          setRefreshToken(newRefreshToken);
        }

        CalComAPIService.setAccessToken(
          newAccessToken,
          newRefreshToken || refreshToken || undefined
        );
      } catch (error) {
        console.error("Failed to handle token refresh:", error);
        await logout();
      }
    };

    CalComAPIService.setTokenRefreshCallback(handleTokenRefresh);

    return () => {
      CalComAPIService.setTokenRefreshCallback(() => Promise.resolve());
    };
  }, [refreshToken]);

  // Handle OAuth authentication
  const handleOAuthAuth = async (storedTokens: OAuthTokens) => {
    if (!oauthService) return;

    // Refresh token if expired
    let tokens = storedTokens;
    if (oauthService.isTokenExpired(storedTokens) && storedTokens.refreshToken) {
      try {
        console.log("Access token expired, refreshing...");
        tokens = await oauthService.refreshAccessToken(storedTokens.refreshToken);
        await saveOAuthTokens(tokens);
      } catch (refreshError) {
        console.error("Failed to refresh token:", refreshError);
        await clearAuth();
        return;
      }
    }

    // Set state
    setAccessToken(tokens.accessToken);
    setRefreshToken(tokens.refreshToken || null);
    setIsAuthenticated(true);
    setIsWebSession(false);

    // Setup API service and refresh function
    await setupAfterLogin(tokens.accessToken, tokens.refreshToken);
    if (tokens.refreshToken) {
      setupRefreshTokenFunction(oauthService);
    }
  };

  // Handle web session authentication
  const handleWebSessionAuth = () => {
    setIsWebSession(true);
  };

  const checkAuthState = async () => {
    try {
      const authType = (await storage.get(AUTH_TYPE_KEY)) as AuthType | null;
      const storedOAuthTokens = await storage.get(OAUTH_TOKENS_KEY);
      const storedTokens = storedOAuthTokens ? JSON.parse(storedOAuthTokens) : null;

      if (authType === "oauth" && storedTokens && oauthService) {
        await handleOAuthAuth(storedTokens);
      } else if (authType === "web_session") {
        handleWebSessionAuth();
      }
    } catch (error) {
      console.error("Failed to check auth state:", error);
    } finally {
      setLoading(false);
    }
  };

  const loginFromWebSession = async (sessionUserInfo: any) => {
    try {
      setUserInfo(sessionUserInfo);
      setIsAuthenticated(true);
      setIsWebSession(true);
      await storage.set(AUTH_TYPE_KEY, "web_session");

      // Try to get tokens from web session
      const tokens = await WebAuthService.getTokensFromWebSession();
      if (tokens.accessToken) {
        setAccessToken(tokens.accessToken);
        setRefreshToken(tokens.refreshToken || null);
        await setupAfterLogin(tokens.accessToken, tokens.refreshToken);
      }
    } catch (error) {
      console.error("Failed to login from web session:", error);
      throw error;
    }
  };

  const loginWithOAuth = async (): Promise<void> => {
    if (!oauthService) {
      throw new Error("OAuth service not available. Please check your configuration.");
    }

    try {
      setLoading(true);

      const tokens = await oauthService.startAuthorizationFlow();

      // Save tokens
      await saveOAuthTokens(tokens);

      // Update state
      setAccessToken(tokens.accessToken);
      setRefreshToken(tokens.refreshToken || null);
      setIsAuthenticated(true);
      setIsWebSession(false);

      // Setup API service and refresh function
      await setupAfterLogin(tokens.accessToken, tokens.refreshToken);
      if (tokens.refreshToken) {
        setupRefreshTokenFunction(oauthService);
      }

      // Clear PKCE parameters
      oauthService.clearPKCEParams();
    } catch (error) {
      console.error("OAuth login failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await clearAuth();
      resetAuthState();
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  const value: AuthContextType = {
    isAuthenticated,
    accessToken,
    refreshToken,
    userInfo,
    isWebSession,
    loginFromWebSession,
    loginWithOAuth,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
