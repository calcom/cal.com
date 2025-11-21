import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { CalComOAuthService } from '../../services/oauth';

export default function OAuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleOAuthCallback();
  }, []);

  const handleOAuthCallback = async () => {
    try {
      // Extract code and state from URL parameters
      const code = params.code as string;
      const state = params.state as string;
      const errorParam = params.error as string;

      if (errorParam) {
        setError(`OAuth error: ${errorParam}`);
        setTimeout(() => router.replace('/onboarding'), 3000);
        return;
      }

      if (!code) {
        setError('No authorization code received');
        setTimeout(() => router.replace('/onboarding'), 3000);
        return;
      }

      // Exchange code for tokens
      console.log('Exchanging authorization code for tokens...');
      const tokens = await CalComOAuthService.exchangeCodeForTokens(code);

      // Verify the access token works
      const isValid = await CalComOAuthService.verifyToken(tokens.access_token);
      if (!isValid) {
        setError('Token verification failed');
        setTimeout(() => router.replace('/onboarding'), 3000);
        return;
      }

      // Save tokens using AuthContext
      await login(tokens.access_token, tokens.refresh_token);

      // Navigate to main app
      router.replace('/(tabs)/event-types');
    } catch (err) {
      console.error('OAuth callback error:', err);
      setError(err instanceof Error ? err.message : 'Authentication failed');
      setTimeout(() => router.replace('/onboarding'), 3000);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      {error ? (
        <>
          <Text style={{ fontSize: 18, color: '#dc2626', marginBottom: 10, textAlign: 'center' }}>
            Authentication Failed
          </Text>
          <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
            {error}
          </Text>
          <Text style={{ fontSize: 12, color: '#999', marginTop: 10, textAlign: 'center' }}>
            Redirecting back to login...
          </Text>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color="#111827" />
          <Text style={{ fontSize: 16, color: '#333', marginTop: 20, textAlign: 'center' }}>
            Completing authentication...
          </Text>
        </>
      )}
    </View>
  );
}

