import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { WebAuthService } from '../services/webAuth';
import { CalComAPIService } from '../services/calcom';
import { OAuthService, OAuthTokens } from '../services/oauthService';

interface AuthContextType {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  userInfo: any;
  isWebSession: boolean;
  isOAuthFlow: boolean;
  login: (accessToken: string, refreshToken: string) => Promise<void>;
  loginWithOAuth: () => Promise<void>;
  loginFromWebSession: (userInfo: any) => Promise<void>;
  refreshTokens: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCESS_TOKEN_KEY = 'cal_access_token';
const REFRESH_TOKEN_KEY = 'cal_refresh_token';
const OAUTH_FLAG_KEY = 'cal_oauth_flow';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isWebSession, setIsWebSession] = useState(false);
  const [isOAuthFlow, setIsOAuthFlow] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      // For web, check localStorage for stored tokens
      if (Platform.OS === 'web') {
        try {
          const storedToken = localStorage.getItem('cal_access_token');
          const storedRefreshToken = localStorage.getItem('cal_refresh_token');
          const isOAuth = localStorage.getItem('cal_oauth_flow') === 'true';
          
          if (storedToken) {
            setAccessToken(storedToken);
            setRefreshToken(storedRefreshToken);
            setIsAuthenticated(true);
            setIsWebSession(false);
            setIsOAuthFlow(isOAuth);
            
            // Set access token in API service
            CalComAPIService.setAccessToken(storedToken);
            
            // Initialize user profile for existing token
            try {
              await CalComAPIService.getUserProfile();
            } catch (profileError) {
              console.error('Failed to fetch user profile on startup:', profileError);
              // If profile fetch fails, token might be expired - try refresh if OAuth
              if (isOAuth && storedRefreshToken) {
                await attemptTokenRefresh(storedRefreshToken);
              }
            }
            
            setLoading(false);
            return;
          }
        } catch (localStorageError) {
          // localStorage not available or error
        }

        setLoading(false);
        return;
      }

      // For mobile, check SecureStore for stored tokens
      const [storedAccessToken, storedRefreshToken, isOAuth] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
        SecureStore.getItemAsync(OAUTH_FLAG_KEY),
      ]);

      if (storedAccessToken) {
        setAccessToken(storedAccessToken);
        setRefreshToken(storedRefreshToken);
        setIsAuthenticated(true);
        setIsWebSession(false);
        setIsOAuthFlow(isOAuth === 'true');
        
        // Set access token in API service
        CalComAPIService.setAccessToken(storedAccessToken);
        
        // Initialize user profile for existing tokens
        try {
          await CalComAPIService.getUserProfile();
        } catch (profileError) {
          console.error('Failed to fetch user profile on startup:', profileError);
          // If profile fetch fails, token might be expired - try refresh if OAuth
          if (isOAuth === 'true' && storedRefreshToken) {
            await attemptTokenRefresh(storedRefreshToken);
          }
        }
      }
    } catch (error) {
      console.error('Failed to check auth state:', error);
    } finally {
      setLoading(false);
    }
  };

  const attemptTokenRefresh = async (currentRefreshToken: string) => {
    try {
      const oauthService = OAuthService.getInstance();
      const newTokens = await oauthService.refreshAccessToken(currentRefreshToken);
      
      // Update stored tokens
      await login(newTokens.accessToken, newTokens.refreshToken, true);
      console.log('Tokens refreshed successfully');
    } catch (refreshError) {
      console.error('Failed to refresh tokens:', refreshError);
      // If refresh fails, logout user
      await logout();
    }
  };

  const login = async (newAccessToken: string, newRefreshToken: string, isOAuth = false) => {
    try {
      if (Platform.OS === 'web') {
        // Store in localStorage for web
        try {
          localStorage.setItem('cal_access_token', newAccessToken);
          if (newRefreshToken) {
            localStorage.setItem('cal_refresh_token', newRefreshToken);
          }
          localStorage.setItem('cal_oauth_flow', isOAuth.toString());
        } catch (localStorageError) {
          console.warn('Could not store tokens in localStorage:', localStorageError);
        }
      } else {
        // Store in SecureStore for mobile
        await Promise.all([
          SecureStore.setItemAsync(ACCESS_TOKEN_KEY, newAccessToken),
          SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefreshToken),
          SecureStore.setItemAsync(OAUTH_FLAG_KEY, isOAuth.toString()),
        ]);
      }

      setAccessToken(newAccessToken);
      setRefreshToken(newRefreshToken);
      setIsAuthenticated(true);
      setIsWebSession(false);
      setIsOAuthFlow(isOAuth);
      
      // Set access token in API service
      console.log('AuthContext.login - Setting token in API service:', {
        hasToken: !!newAccessToken,
        tokenLength: newAccessToken?.length
      });
      CalComAPIService.setAccessToken(newAccessToken);
      
      // Initialize user profile after successful login
      try {
        await CalComAPIService.getUserProfile();
      } catch (profileError) {
        console.error('Failed to fetch user profile:', profileError);
        // Don't fail login if profile fetch fails
      }
    } catch (error) {
      console.error('Failed to save auth tokens:', error);
      throw error;
    }
  };

  const loginWithOAuth = async () => {
    try {
      const oauthService = OAuthService.getInstance();
      let tokens: OAuthTokens;

      if (Platform.OS === 'web') {
        tokens = await oauthService.initiateWebOAuth();
      } else {
        tokens = await oauthService.initiateMobileOAuth();
      }

      // Verify the token and get user info
      const user = await oauthService.verifyTokenAndGetUser(tokens.accessToken);
      setUserInfo(user);
      
      // Store tokens with OAuth flag
      await login(tokens.accessToken, tokens.refreshToken, true);
      
      console.log('OAuth login successful for user:', user.email);
    } catch (error) {
      console.error('OAuth login error:', error);
      throw error;
    }
  };

  const refreshTokens = async () => {
    if (!refreshToken || !isOAuthFlow) {
      throw new Error('No refresh token available or not using OAuth');
    }

    await attemptTokenRefresh(refreshToken);
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
        console.error('Failed to fetch user profile from web session:', profileError);
        // Don't fail login if profile fetch fails
      }
    } catch (error) {
      console.error('Failed to login from web session:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // If using OAuth, try to revoke tokens
      if (isOAuthFlow && accessToken) {
        try {
          const oauthService = OAuthService.getInstance();
          await oauthService.revokeTokens(accessToken);
        } catch (revokeError) {
          console.warn('Failed to revoke OAuth tokens:', revokeError);
        }
      }

      if (Platform.OS === 'web') {
        // Clear localStorage for web
        try {
          localStorage.removeItem('cal_access_token');
          localStorage.removeItem('cal_refresh_token');
          localStorage.removeItem('cal_oauth_flow');
        } catch (localStorageError) {
          console.warn('Could not clear tokens from localStorage:', localStorageError);
        }
      } else {
        // Clear SecureStore for mobile
        await Promise.all([
          SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
          SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
          SecureStore.deleteItemAsync(OAUTH_FLAG_KEY),
        ]);
      }

      setAccessToken(null);
      setRefreshToken(null);
      setUserInfo(null);
      setIsAuthenticated(false);
      setIsWebSession(false);
      setIsOAuthFlow(false);
      
      // Clear access token from API service
      CalComAPIService.setAccessToken(null);
      
      // Clear cached user profile
      CalComAPIService.clearUserProfile();
    } catch (error) {
      console.error('Failed to clear auth tokens:', error);
    }
  };

  const value: AuthContextType = {
    isAuthenticated,
    accessToken,
    refreshToken,
    userInfo,
    isWebSession,
    isOAuthFlow,
    login,
    loginWithOAuth,
    loginFromWebSession,
    refreshTokens,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}