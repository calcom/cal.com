import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CalComLogo } from './CalComLogo';
import { OAuthService } from '../services/oauthService';
import { validateOAuthConfig } from '../config/oauth';

interface OAuthLoginProps {
  onSuccess: (accessToken: string, refreshToken: string) => void;
  onError: (error: string) => void;
}

export function OAuthLogin({ onSuccess, onError }: OAuthLoginProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isConfigured = validateOAuthConfig();

  const handleOAuthLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const oauthService = OAuthService.getInstance();
      let tokens;

      if (Platform.OS === 'web') {
        tokens = await oauthService.initiateWebOAuth();
      } else {
        tokens = await oauthService.initiateMobileOAuth();
      }
      onSuccess(tokens.accessToken, tokens.refreshToken);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'OAuth login failed';
      console.error('OAuth login error:', err);
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center px-8 bg-white">
      {/* Logo */}
      <View className="items-center mb-12">
        <CalComLogo width={120} height={40} />
      </View>

      {/* Error Message */}
      {error && (
        <View className="p-4 mb-6 bg-red-50 rounded-lg border border-red-200">
          <View className="flex-row items-center">
            <Ionicons name="alert-circle" size={20} color="#DC2626" />
            <Text className="flex-1 ml-2 text-sm text-red-800">
              {error}
            </Text>
          </View>
        </View>
      )}

      {/* OAuth Login Button */}
      <TouchableOpacity
        onPress={handleOAuthLogin}
        disabled={isLoading || !isConfigured}
        className={`rounded-lg py-4 px-6 flex-row items-center justify-center mb-4 ${
          !isConfigured
            ? 'bg-gray-300'
            : isLoading
              ? 'bg-black opacity-50'
              : 'bg-black active:bg-gray-800'
        }`}
      >
        {isLoading ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <>
            <Text className={`font-semibold text-base ml-3 ${
              !isConfigured ? 'text-gray-600' : 'text-white'
            }`}>
              {!isConfigured ? 'OAuth Setup Required' : 'Continue with Cal.com'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {!isConfigured && (
        <View className="p-3 mb-4 bg-amber-50 rounded-lg border border-amber-200">
          <Text className="text-sm text-center text-amber-800">
            OAuth client ID not configured. Please check setup instructions below.
          </Text>
        </View>
      )}

    </View>
  );
}

export default OAuthLogin;
