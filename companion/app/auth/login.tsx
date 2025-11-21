import React from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import OAuthLogin from '../../components/OAuthLogin';

export default function LoginScreen() {
  const router = useRouter();
  const { loginWithOAuth, login } = useAuth();

  const handleOAuthSuccess = async (accessToken: string, refreshToken: string) => {
    try {
      console.log('LoginScreen: OAuth success, storing tokens in AuthContext...');
      // Store the OAuth tokens in AuthContext
      await login(accessToken, refreshToken, true); // true = isOAuth
      router.replace('/(tabs)/event-types');
    } catch (error) {
      console.error('Failed to store tokens or navigate after OAuth success:', error);
    }
  };

  const handleOAuthError = (error: string) => {
    console.error('OAuth login failed:', error);
    // Error is already displayed in the OAuthLogin component
  };

  const handleDirectOAuthLogin = async () => {
    try {
      await loginWithOAuth();
      router.replace('/(tabs)/event-types');
    } catch (error) {
      console.error('Direct OAuth login failed:', error);
    }
  };

  return (
    <OAuthLogin 
      onSuccess={handleOAuthSuccess} 
      onError={handleOAuthError}
    />
  );
}