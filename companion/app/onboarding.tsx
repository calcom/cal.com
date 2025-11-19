import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { CalComLogo } from '../components/CalComLogo';
import { CalComOAuthService } from '../services/oauth';

export default function Onboarding() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    try {
      setLoading(true);
      
      // Start OAuth flow
      await CalComOAuthService.authorize();
      
      // Note: User will be redirected to Cal.com authorization page
      // After authorization, they'll be redirected back to /oauth/callback
      // which will handle the token exchange and navigate to main app
      
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
      </View>
    </View>
  );
}

