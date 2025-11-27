import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { WebAuthService } from "../services/webAuth";
import { CalComAPIService } from "../services/calcom";

interface AuthContextType {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  userInfo: any;
  isWebSession: boolean;
  login: (accessToken: string, refreshToken: string) => Promise<void>;
  loginFromWebSession: (userInfo: any) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCESS_TOKEN_KEY = "cal_access_token";
const REFRESH_TOKEN_KEY = "cal_refresh_token";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isWebSession, setIsWebSession] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      // For web, check localStorage for stored API key/token
      if (Platform.OS === "web") {
        try {
          const storedToken = localStorage.getItem("cal_access_token");
          if (storedToken) {
            setAccessToken(storedToken);
            setIsAuthenticated(true);
            setIsWebSession(false); // Using API key, not web session

            // Initialize user profile for existing token
            try {
              await CalComAPIService.getUserProfile();
            } catch (profileError) {
              console.error("Failed to fetch user profile on startup:", profileError);
            }

            setLoading(false);
            return;
          }
        } catch (localStorageError) {
          // localStorage not available or error
        }

        // Disable automatic web session detection for now
        // as Cal.com API v2 may not support cookie authentication
        setLoading(false);
        return;
      }

      // For mobile, check SecureStore for stored tokens
      const [storedAccessToken, storedRefreshToken] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
      ]);

      if (storedAccessToken && storedRefreshToken) {
        setAccessToken(storedAccessToken);
        setRefreshToken(storedRefreshToken);
        setIsAuthenticated(true);
        setIsWebSession(false);

        // Initialize user profile for existing tokens
        try {
          await CalComAPIService.getUserProfile();
        } catch (profileError) {
          console.error("Failed to fetch user profile on startup:", profileError);
        }
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
        } catch (localStorageError) {
          console.warn("Could not store tokens in localStorage:", localStorageError);
        }
      } else {
        // Store in SecureStore for mobile
        await Promise.all([
          SecureStore.setItemAsync(ACCESS_TOKEN_KEY, newAccessToken),
          SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefreshToken),
        ]);
      }

      setAccessToken(newAccessToken);
      setRefreshToken(newRefreshToken);
      setIsAuthenticated(true);
      setIsWebSession(false);

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

      // Try to get any available tokens
      const tokens = await WebAuthService.getTokensFromWebSession();
      if (tokens.accessToken) {
        setAccessToken(tokens.accessToken);
        setRefreshToken(tokens.refreshToken || null);
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
      if (Platform.OS === "web") {
        // Clear localStorage for web
        try {
          localStorage.removeItem("cal_access_token");
          localStorage.removeItem("cal_refresh_token");
        } catch (localStorageError) {
          console.warn("Could not clear tokens from localStorage:", localStorageError);
        }
      } else {
        // Clear SecureStore for mobile
        await Promise.all([
          SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
          SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
        ]);
      }

      setAccessToken(null);
      setRefreshToken(null);
      setUserInfo(null);
      setIsAuthenticated(false);
      setIsWebSession(false);

      // Clear cached user profile
      CalComAPIService.clearUserProfile();
    } catch (error) {
      console.error("Failed to clear auth tokens:", error);
    }
  };

  const value: AuthContextType = {
    isAuthenticated,
    accessToken,
    refreshToken,
    userInfo,
    isWebSession,
    login,
    loginFromWebSession,
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
