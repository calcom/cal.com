import { Stack, useRouter } from 'expo-router';
import { Platform, View, StatusBar, Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useEffect } from 'react';
import * as ExpoLinking from 'expo-linking';
import '../global.css';

export default function RootLayout() {
  const router = useRouter();

  // Handle deep links
  useEffect(() => {
    // Handle initial URL if app was opened via deep link
    const handleInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink(initialUrl);
      }
    };

    // Listen for deep link events while app is running
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    handleInitialUrl();

    return () => {
      subscription.remove();
    };
  }, []);

  const handleDeepLink = (url: string) => {
    console.log('Deep link received:', url);
    
    // Parse the URL
    const { hostname, path, queryParams } = ExpoLinking.parse(url);
    
    // Handle OAuth callback
    if (hostname === 'oauth' || path?.includes('oauth/callback')) {
      const code = queryParams?.code as string;
      const state = queryParams?.state as string;
      const error = queryParams?.error as string;
      
      // Navigate to callback screen with params
      if (code || error) {
        router.push({
          pathname: '/oauth/callback',
          params: { code, state, error },
        });
      }
    }
  };

  const stackContent = (
    <Stack>
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="oauth/callback" options={{ headerShown: false }} />
      <Stack.Screen name="oauth-helper" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );

  return (
    <ErrorBoundary>
      {Platform.OS === 'web' ? (
        <View style={{ width: 400, height: "100vh", display: 'flex', flexDirection: 'column' }} className="bg-white">
          <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
          {stackContent}
        </View>
      ) : (
        <SafeAreaProvider>
          <View style={{ flex: 1 }} className="bg-white">
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
            {stackContent}
          </View>
        </SafeAreaProvider>
      )}
    </ErrorBoundary>
  );
}