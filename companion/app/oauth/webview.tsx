import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform, Alert, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { useAuth } from '../../contexts/AuthContext';
import { CalComOAuthService } from '../../services/oauth';

export default function OAuthWebView() {
  const router = useRouter();
  const { login } = useAuth();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const lastUrlRef = useRef<string>('');

  const authUrl = params.authUrl as string;

  // Show fallback button after 5 seconds if still loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        setShowFallback(true);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [loading]);

  const openInBrowser = async () => {
    try {
      await Linking.openURL(authUrl);
      Alert.alert(
        'Opened in Browser',
        'Please complete the login in your browser. The app will automatically detect when you return.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to open browser:', error);
    }
  };

  const handleAuthCode = async (code: string) => {
    if (processing) return;
    
    setProcessing(true);
    console.log('Exchanging code for tokens...');
    
    try {
      const tokens = await CalComOAuthService.exchangeCodeForTokens(code);
      const isValid = await CalComOAuthService.verifyToken(tokens.access_token);
      
      if (!isValid) {
        throw new Error('Token verification failed');
      }

      await login(tokens.access_token, tokens.refresh_token);
      console.log('Login successful!');
      router.replace('/(tabs)/event-types');
    } catch (error: any) {
      console.error('Auth error:', error);
      setProcessing(false);
      Alert.alert(
        'Authentication Failed',
        error.message || 'Please try again',
        [{ text: 'OK', onPress: () => router.replace('/onboarding') }]
      );
    }
  };

  const onNavigationStateChange = (navState: any) => {
    const { url, loading: navLoading, canGoBack, canGoForward } = navState;
    
    // Prevent duplicate processing
    if (url === lastUrlRef.current) {
      return;
    }
    lastUrlRef.current = url;
    
    console.log('Navigation:', url);
    console.log('Nav loading:', navLoading);
    console.log('Can go back:', canGoBack, 'Can go forward:', canGoForward);

    // ONLY process OAuth redirect URLs with code
    // Don't interfere with normal page navigation
    if (url.includes('code=') && (url.includes('event-types') || url.includes('expo-wxt-app://'))) {
      const parsed = CalComOAuthService.parseCallbackUrl(url);
      if (parsed.code && !processing) {
        console.log('Found code, processing...');
        handleAuthCode(parsed.code);
      }
    }
    
    // Mark initial load as done once we see the login page
    if (!initialLoadDone && (url.includes('/auth/login') || url.includes('/auth/oauth2/authorize'))) {
      setInitialLoadDone(true);
    }
  };

  if (!authUrl) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
        <Text style={{ color: '#ef4444', marginBottom: 16 }}>Invalid URL</Text>
        <TouchableOpacity
          onPress={() => router.replace('/onboarding')}
          style={{ paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#111827', borderRadius: 8 }}
        >
          <Text style={{ color: 'white' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      {/* Header */}
      <View style={{
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingBottom: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        backgroundColor: 'white',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>
            Sign in to Cal.com
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <Text style={{ fontSize: 18, color: '#6b7280' }}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Loading */}
      {loading && (
        <View style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: [{ translateX: -20 }, { translateY: -20 }],
          zIndex: 10,
        }}>
          <ActivityIndicator size="large" color="#111827" />
          {showFallback && (
            <TouchableOpacity
              onPress={openInBrowser}
              style={{
                marginTop: 60,
                paddingHorizontal: 16,
                paddingVertical: 8,
                backgroundColor: '#111827',
                borderRadius: 8,
              }}
            >
              <Text style={{ color: 'white', fontSize: 12 }}>
                Open in Browser Instead
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* WebView */}
      <WebView
        key={authUrl}
        ref={webViewRef}
        source={{ uri: authUrl }}
        originWhitelist={['*']}
        onNavigationStateChange={(navState) => {
          // Only log, don't process here - let onShouldStartLoadWithRequest handle redirects
          const { url } = navState;
          if (url !== lastUrlRef.current) {
            lastUrlRef.current = url;
            console.log('Navigation:', url);
          }
        }}
        onShouldStartLoadWithRequest={(request) => {
          const { url } = request;
          console.log('Should start load:', url);
          
          // Check if this is the OAuth redirect with code
          if (url.includes('code=') && (url.includes('event-types') || url.includes('expo-wxt-app://') || url.includes('/oauth/callback'))) {
            console.log('Intercepting OAuth redirect');
            const parsed = CalComOAuthService.parseCallbackUrl(url);
            if (parsed.code && !processing) {
              handleAuthCode(parsed.code);
              return false; // Don't load the redirect URL
            }
          }
          
          // Allow all other URLs
          return true;
        }}
        onLoadStart={() => {
          console.log('Load started');
          setLoading(true);
        }}
        onLoadEnd={() => {
          console.log('Load ended');
          setLoading(false);
        }}
        onError={(e) => {
          console.error('WebView error:', e.nativeEvent);
          setLoading(false);
        }}
        onHttpError={(e) => {
          console.error('HTTP error:', e.nativeEvent);
        }}
        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        javaScriptEnabled={true}
        domStorageEnabled={true}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        setSupportMultipleWindows={false}
        incognito={false}
        cacheEnabled={false}
        style={{ flex: 1, backgroundColor: '#f5f5f5' }}
      />
    </View>
  );
}
