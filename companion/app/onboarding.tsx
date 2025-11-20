import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { CalComLogo } from '../components/CalComLogo';
import { CalComOAuthService, OAUTH_CONFIG } from '../services/oauth';

export default function Onboarding() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    try {
      setLoading(true);
      
      if (Platform.OS === 'ios') {
        // For iOS, open OAuth in WebView instead of external browser
        const state = Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
        
        // Use the same redirect URI that will be used during token exchange
        // to avoid redirect_uri mismatch errors from Cal.com
        const redirectUri = OAUTH_CONFIG.redirectUri;
        const authUrl = `https://app.cal.com/auth/oauth2/authorize?` +
          `client_id=${encodeURIComponent(process.env.EXPO_PUBLIC_CAL_CLIENT_ID || '')}&` +
          `state=${encodeURIComponent(state)}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}`;
        
        // Navigate to WebView screen with the auth URL
        router.push({
          pathname: '/oauth/webview',
          params: { authUrl },
        });
        setLoading(false);
      } else {
        // For web and Android, use the original flow (external browser)
        await CalComOAuthService.authorize();
        
        // Note: User will be redirected to Cal.com authorization page
        // After authorization, they'll be redirected back to /oauth/callback
        // which will handle the token exchange and navigate to main app
      }
      
    } catch (error) {
      console.error('OAuth flow error:', error);
      Alert.alert(
        'Authentication Error',
        'Failed to start authentication. Please try again.',
        [{ text: 'OK', onPress: () => setLoading(false) }]
      );
    }
  };

  return (
    <View style={{ flex: 1 }} className="bg-white">
      {/* Logo container - centered with generous spacing */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }}>
        <CalComLogo width={150} height={33} color="#292929" />
      </View>

      {/* Button container - fixed at bottom */}
      <View style={{ paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 50 : 32 }}>
        <TouchableOpacity
          onPress={handleContinue}
          activeOpacity={0.7}
          disabled={loading}
          style={{
            backgroundColor: loading ? '#6b7280' : '#111827',
            paddingVertical: 16,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text 
              style={{ 
                color: '#ffffff',
                fontSize: 16,
                fontWeight: '600',
                letterSpacing: 0.3,
              }}
            >
              Continue with Cal.com
            </Text>
          )}
        </TouchableOpacity>

        {/* Temporary helper link for OAuth redirect issue */}
        {Platform.OS === 'web' && (
          <TouchableOpacity
            onPress={() => router.push('/oauth-helper')}
            style={{ marginTop: 12, alignItems: 'center' }}
          >
            <Text style={{ color: '#6b7280', fontSize: 12 }}>
              OAuth not redirecting? Use helper →
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

