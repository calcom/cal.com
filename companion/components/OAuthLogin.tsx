import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CalComLogo } from './CalComLogo';
import { OAuthService } from '../services/oauthService';
import { getConfigurationInstructions, validateOAuthConfig } from '../config/oauth';

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

      // Verify the token and get user info
      const user = await oauthService.verifyTokenAndGetUser(tokens.accessToken);
      
      console.log('OAuth login successful for user:', user.email);
      console.log('OAuthLogin: Calling onSuccess with tokens...');
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

  const showSetupInstructions = () => {
    const instructions = getConfigurationInstructions();
    Alert.alert(
      'OAuth Setup Instructions',
      instructions,
      [{ text: 'OK' }],
      { userInterfaceStyle: 'light' }
    );
  };

  return (
    <View className="flex-1 bg-white px-8 justify-center">
      {/* Logo */}
      <View className="items-center mb-12">
        <CalComLogo width={120} height={40} />
        <Text className="text-lg text-gray-600 mt-4 text-center">
          Companion App
        </Text>
      </View>

      {/* Welcome Text */}
      <View className="mb-8">
        <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
          Welcome Back
        </Text>
        <Text className="text-base text-gray-600 text-center">
          Sign in to your Cal.com account to access your bookings, event types, and availability.
        </Text>
      </View>

      {/* Error Message */}
      {error && (
        <View className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <View className="flex-row items-center">
            <Ionicons name="alert-circle" size={20} color="#DC2626" />
            <Text className="text-red-800 ml-2 flex-1 text-sm">
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
            <Ionicons 
              name={!isConfigured ? "settings-outline" : "logo-google"} 
              size={20} 
              color={!isConfigured ? "#6B7280" : "white"} 
            />
            <Text className={`font-semibold text-base ml-3 ${
              !isConfigured ? 'text-gray-600' : 'text-white'
            }`}>
              {!isConfigured ? 'OAuth Setup Required' : 'Continue with Cal.com'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {!isConfigured && (
        <View className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <Text className="text-amber-800 text-sm text-center">
            OAuth client ID not configured. Please check setup instructions below.
          </Text>
        </View>
      )}

      {/* Alternative Options */}
      <View className="flex-row items-center my-6">
        <View className="flex-1 h-px bg-gray-200" />
        <Text className="mx-4 text-gray-500 text-sm">or</Text>
        <View className="flex-1 h-px bg-gray-200" />
      </View>

      {/* Setup Instructions Button */}
      <TouchableOpacity
        onPress={showSetupInstructions}
        className="border border-gray-300 rounded-lg py-4 px-6 flex-row items-center justify-center mb-8"
      >
        <Ionicons name="settings-outline" size={20} color="#6B7280" />
        <Text className="text-gray-700 font-medium text-base ml-3">
          Setup Instructions
        </Text>
      </TouchableOpacity>

      {/* Platform Info */}
      <View className="items-center">
        <Text className="text-xs text-gray-400 text-center">
          {Platform.OS === 'web' ? 'Browser Extension' : 'Mobile App'} • Secure OAuth 2.0
        </Text>
      </View>

      {/* Development Note */}
      {__DEV__ && (
        <View className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <View className="flex-row items-start">
            <Ionicons name="warning-outline" size={16} color="#D97706" />
            <Text className="text-yellow-800 text-xs ml-2 flex-1">
              <Text className="font-semibold">Development Mode:</Text> Make sure to configure OAuth client ID in OAuthService and set up proper redirect URLs for your environment.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

export default OAuthLogin;