import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { OAuthService } from '../../services/oauthService';

export default function OAuthCallbackScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      handleWebCallback();
    } else {
      // For mobile, this screen shouldn't be reached as OAuth is handled in-app
      router.replace('/auth/login');
    }
  }, []);

  const handleWebCallback = async () => {
    try {
      // Handle the OAuth callback
      await OAuthService.handleOAuthCallback();
      
      // Redirect to main app - the auth context will handle the login state
      router.replace('/(tabs)/event-types');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'OAuth callback failed';
      setError(errorMessage);
      
      // Redirect to login after showing error briefly
      setTimeout(() => {
        router.replace('/auth/login');
      }, 3000);
    }
  };

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-white px-8">
        <Text className="text-red-600 text-center text-lg mb-4">
          Authentication Error
        </Text>
        <Text className="text-gray-600 text-center mb-4">
          {error}
        </Text>
        <Text className="text-sm text-gray-400 text-center">
          Redirecting to login...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center items-center bg-white">
      <ActivityIndicator size="large" color="#000" />
      <Text className="text-gray-600 mt-4 text-center">
        Completing authentication...
      </Text>
    </View>
  );
}