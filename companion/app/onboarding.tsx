import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { CalComLogo } from '../components/CalComLogo';

export default function Onboarding() {
  const router = useRouter();

  const handleContinue = () => {
    // Navigate to main app (tabs)
    // Using replace to prevent going back to onboarding
    router.replace('/(tabs)/event-types');
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
          style={{
            backgroundColor: '#111827',
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
        </TouchableOpacity>
      </View>
    </View>
  );
}

