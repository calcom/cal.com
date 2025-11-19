import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';

/**
 * OAuth Helper Screen - Temporary Workaround
 * 
 * This is a temporary helper for testing when Cal.com redirects to the wrong URL.
 * 
 * Instructions:
 * 1. Complete OAuth authorization in Cal.com
 * 2. When redirected to https://app.cal.com/event-types?code=XXX&state=YYY
 * 3. Copy the entire URL
 * 4. Come back to this screen
 * 5. Paste the URL and click "Extract & Login"
 * 
 * This extracts the code and completes the OAuth flow.
 */
export default function OAuthHelper() {
  const router = useRouter();
  const [url, setUrl] = useState('');

  const handleExtractCode = () => {
    try {
      // Parse the URL
      const urlObj = new URL(url);
      const code = urlObj.searchParams.get('code');
      const state = urlObj.searchParams.get('state');

      if (!code) {
        Alert.alert('Error', 'No code found in URL. Please paste the complete URL from Cal.com.');
        return;
      }

      // Navigate to callback with extracted params
      router.push({
        pathname: '/oauth/callback',
        params: { code, state: state || '' },
      });
    } catch (error) {
      Alert.alert(
        'Invalid URL',
        'Please paste the complete URL from Cal.com (should start with https://app.cal.com/event-types?code=...)'
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', padding: 20, paddingTop: 60 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>
        OAuth Helper
      </Text>
      <Text style={{ fontSize: 14, color: '#666', marginBottom: 20 }}>
        Temporary workaround until Cal.com updates redirect URI
      </Text>

      <View style={{ marginBottom: 30 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 10 }}>
          Instructions:
        </Text>
        <Text style={{ fontSize: 14, color: '#333', marginBottom: 5 }}>
          1. Complete OAuth in Cal.com
        </Text>
        <Text style={{ fontSize: 14, color: '#333', marginBottom: 5 }}>
          2. Copy the redirected URL (https://app.cal.com/event-types?code=...)
        </Text>
        <Text style={{ fontSize: 14, color: '#333', marginBottom: 5 }}>
          3. Paste it below
        </Text>
      </View>

      <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
        Paste Cal.com URL:
      </Text>
      <TextInput
        value={url}
        onChangeText={setUrl}
        placeholder="https://app.cal.com/event-types?code=..."
        multiline
        numberOfLines={3}
        style={{
          borderWidth: 1,
          borderColor: '#d1d5db',
          borderRadius: 8,
          padding: 12,
          fontSize: 14,
          marginBottom: 20,
          backgroundColor: '#f9fafb',
        }}
      />

      <TouchableOpacity
        onPress={handleExtractCode}
        disabled={!url}
        style={{
          backgroundColor: url ? '#111827' : '#9ca3af',
          paddingVertical: 16,
          borderRadius: 12,
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
          Extract Code & Login
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.back()}
        style={{
          paddingVertical: 12,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#6b7280', fontSize: 14 }}>
          Back
        </Text>
      </TouchableOpacity>

      <View style={{ marginTop: 40, padding: 15, backgroundColor: '#fef2f2', borderRadius: 8 }}>
        <Text style={{ fontSize: 12, color: '#991b1b', fontWeight: '600', marginBottom: 5 }}>
          ⚠️ Temporary Workaround
        </Text>
        <Text style={{ fontSize: 12, color: '#7f1d1d' }}>
          This is only needed because Cal.com's OAuth client has the wrong redirect_uri configured.
          Contact Cal.com support to update it to: http://localhost:8081/oauth/callback
        </Text>
      </View>
    </View>
  );
}

