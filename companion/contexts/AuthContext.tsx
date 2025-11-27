import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { WebAuthService } from "../services/webAuth";
import { CalComAPIService } from "../services/calcom";
import { createCalComOAuthService, OAuthTokens } from "../services/oauthService";

interface AuthContextType {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  userInfo: any;
  isWebSession: boolean;
  isUsingOAuth: boolean;
  login: (accessToken: string, refreshToken: string) => Promise<void>;
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

type AuthType = "oauth" | "api_key" | "web_session";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isWebSession, setIsWebSession] = useState(false);
  const [isUsingOAuth, setIsUsingOAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [oauthService] = useState(() => {
    try {
      return createCalComOAuthService();
    } catch (error) {
      console.warn("Failed to initialize OAuth service:", error);
      return null;
    }
  });

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
        // Force logout on refresh failure
        await logout();
      }
    };

    CalComAPIService.setTokenRefreshCallback(handleTokenRefresh);

    return () => {
      CalComAPIService.setTokenRefreshCallback(() => Promise.resolve());
    };
  }, [refreshToken]);

  const checkAuthState = async () => {
    try {
      // Check for stored authentication type and tokens
      let authType: AuthType | null = null;
      let storedTokens: OAuthTokens | null = null;

      if (Platform.OS === "web") {
        try {
          authType = localStorage.getItem(AUTH_TYPE_KEY) as AuthType;
          const storedOAuthTokens = localStorage.getItem(OAUTH_TOKENS_KEY);
          if (storedOAuthTokens) {
            storedTokens = JSON.parse(storedOAuthTokens);
          }
        } catch (error) {
          console.warn("Failed to read auth state from localStorage:", error);
        }
      } else {
        try {
          authType = (await SecureStore.getItemAsync(AUTH_TYPE_KEY)) as AuthType;
          const storedOAuthTokens = await SecureStore.getItemAsync(OAUTH_TOKENS_KEY);
          if (storedOAuthTokens) {
            storedTokens = JSON.parse(storedOAuthTokens);
          }
        } catch (error) {
          console.warn("Failed to read auth state from SecureStore:", error);
        }
      }

      // Handle OAuth tokens
      if (authType === "oauth" && storedTokens && oauthService) {
        // Check if token is expired and refresh if needed
        if (oauthService.isTokenExpired(storedTokens) && storedTokens.refreshToken) {
          try {
            console.log("Access token expired, refreshing...");
            const newTokens = await oauthService.refreshAccessToken(storedTokens.refreshToken);
            await saveOAuthTokens(newTokens);
            storedTokens = newTokens;
          } catch (refreshError) {
            console.error("Failed to refresh token:", refreshError);
            await clearAuth();
            setLoading(false);
            return;
          }
        }

        setAccessToken(storedTokens.accessToken);
        setRefreshToken(storedTokens.refreshToken || null);
        setIsAuthenticated(true);
        setIsUsingOAuth(true);
        setIsWebSession(false);

        // Configure API service to use OAuth token
        CalComAPIService.setAccessToken(
          storedTokens.accessToken,
          storedTokens.refreshToken || undefined
        );

        // Set up refresh token function for automatic refresh on API 401 errors
        if (oauthService && storedTokens.refreshToken) {
          CalComAPIService.setRefreshTokenFunction(async (refreshToken: string) => {
            const newTokens = await oauthService!.refreshAccessToken(refreshToken);
            return {
              accessToken: newTokens.accessToken,
              refreshToken: newTokens.refreshToken,
            };
          });
        }

        // Initialize user profile
        try {
          await CalComAPIService.getUserProfile();
        } catch (profileError) {
          console.error("Failed to fetch user profile:", profileError);
        }
      }
      // Handle legacy API key authentication
      else if (authType === "api_key") {
        // Fall back to legacy API key method
        const legacyToken =
          Platform.OS === "web"
            ? localStorage.getItem("cal_access_token")
            : await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);

        if (legacyToken) {
          setAccessToken(legacyToken);
          setIsAuthenticated(true);
          setIsUsingOAuth(false);
          setIsWebSession(false);

          // Configure API service to use API key
          CalComAPIService.setApiKey(legacyToken);

          try {
            await CalComAPIService.getUserProfile();
          } catch (profileError) {
            console.error("Failed to fetch user profile:", profileError);
          }
        }
      }
      // Handle web session
      else if (authType === "web_session") {
        // Try to restore web session state
        setIsWebSession(true);
        setIsUsingOAuth(false);
      }
    } catch (error) {
      console.error("Failed to check auth state:", error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (newAccessToken: string, newRefreshToken: string) => {
    try {
      if (Platform.OS === "web") {
        // Store in localStorage for web
        try {
          localStorage.setItem("cal_access_token", newAccessToken);
          if (newRefreshToken) {
            localStorage.setItem("cal_refresh_token", newRefreshToken);
          }
          localStorage.setItem(AUTH_TYPE_KEY, "api_key");
        } catch (localStorageError) {
          console.warn("Could not store tokens in localStorage:", localStorageError);
        }
      } else {
        // Store in SecureStore for mobile
        await Promise.all([
          SecureStore.setItemAsync(ACCESS_TOKEN_KEY, newAccessToken),
          SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefreshToken),
          SecureStore.setItemAsync(AUTH_TYPE_KEY, "api_key"),
        ]);
      }

      setAccessToken(newAccessToken);
      setRefreshToken(newRefreshToken);
      setIsAuthenticated(true);
      setIsWebSession(false);
      setIsUsingOAuth(false);

      // Configure API service to use API key
      CalComAPIService.setApiKey(newAccessToken);

      // Initialize user profile after successful login
      try {
        await CalComAPIService.getUserProfile();
      } catch (profileError) {
        console.error("Failed to fetch user profile:", profileError);
        // Don't fail login if profile fetch fails
      }
    } catch (error) {
      console.error("Failed to save auth tokens:", error);
      throw error;
    }
  };

  const loginFromWebSession = async (sessionUserInfo: any) => {
    try {
      setUserInfo(sessionUserInfo);
      setIsAuthenticated(true);
      setIsWebSession(true);
      setIsUsingOAuth(false);

      // Store auth type
      if (Platform.OS === "web") {
        localStorage.setItem(AUTH_TYPE_KEY, "web_session");
      } else {
        await SecureStore.setItemAsync(AUTH_TYPE_KEY, "web_session");
      }

      // Try to get any available tokens
      const tokens = await WebAuthService.getTokensFromWebSession();
      if (tokens.accessToken) {
        setAccessToken(tokens.accessToken);
        setRefreshToken(tokens.refreshToken || null);

        // Configure API service
        CalComAPIService.setApiKey(tokens.accessToken);
      }

      // Initialize user profile after successful web session login
      try {
        await CalComAPIService.getUserProfile();
      } catch (profileError) {
        console.error("Failed to fetch user profile from web session:", profileError);
        // Don't fail login if profile fetch fails
      }
    } catch (error) {
      console.error("Failed to login from web session:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Revoke OAuth token if using OAuth
      if (isUsingOAuth && accessToken && oauthService) {
        try {
          await oauthService.revokeToken(accessToken);
        } catch (revokeError) {
          console.warn("Failed to revoke OAuth token:", revokeError);
        }
      }

      // Clear all stored auth data
      await clearAuth();

      // Reset state
      setAccessToken(null);
      setRefreshToken(null);
      setUserInfo(null);
      setIsAuthenticated(false);
      setIsWebSession(false);
      setIsUsingOAuth(false);

      // Clear API service auth
      CalComAPIService.clearAuth();
      CalComAPIService.clearUserProfile();
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  // Helper function to save OAuth tokens
  const saveOAuthTokens = async (tokens: OAuthTokens) => {
    const tokenData = JSON.stringify(tokens);
    if (Platform.OS === "web") {
      localStorage.setItem(OAUTH_TOKENS_KEY, tokenData);
      localStorage.setItem(AUTH_TYPE_KEY, "oauth");
    } else {
      await SecureStore.setItemAsync(OAUTH_TOKENS_KEY, tokenData);
      await SecureStore.setItemAsync(AUTH_TYPE_KEY, "oauth");
    }
  };

  // Helper function to clear all auth data
  const clearAuth = async () => {
    if (Platform.OS === "web") {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(OAUTH_TOKENS_KEY);
      localStorage.removeItem(AUTH_TYPE_KEY);
    } else {
      await Promise.all([
        SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
        SecureStore.deleteItemAsync(OAUTH_TOKENS_KEY),
        SecureStore.deleteItemAsync(AUTH_TYPE_KEY),
      ]);
    }
  };

  // OAuth login function
  const loginWithOAuth = async (): Promise<void> => {
    if (!oauthService) {
      throw new Error("OAuth service not available. Please check your configuration.");
    }

    try {
      setLoading(true);
      console.log("Starting OAuth flow...");

      const tokens = await oauthService.startAuthorizationFlow();

      console.log("OAuth flow completed, tokens received");

      // Save tokens
      await saveOAuthTokens(tokens);

      // Update state
      setAccessToken(tokens.accessToken);
      setRefreshToken(tokens.refreshToken || null);
      setIsAuthenticated(true);
      setIsUsingOAuth(true);
      setIsWebSession(false);

      // Configure API service
      CalComAPIService.setAccessToken(tokens.accessToken, tokens.refreshToken);

      // Set up refresh token function for automatic refresh
      if (oauthService && tokens.refreshToken) {
        CalComAPIService.setRefreshTokenFunction(async (refreshToken: string) => {
          const newTokens = await oauthService!.refreshAccessToken(refreshToken);
          return {
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken,
          };
        });
      }

      // Initialize user profile
      try {
        await CalComAPIService.getUserProfile();
      } catch (profileError) {
        console.error("Failed to fetch user profile after OAuth login:", profileError);
      }

      // Clear PKCE parameters
      oauthService.clearPKCEParams();
    } catch (error) {
      console.error("OAuth login failed:", error);
      setLoading(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    isAuthenticated,
    accessToken,
    refreshToken,
    userInfo,
    isWebSession,
    isUsingOAuth,
    login,
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
