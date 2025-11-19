import { Stack } from 'expo-router';
import { Platform, View, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '../components/ErrorBoundary';
import '../global.css';

export default function RootLayout() {

  const stackContent = (
    <Stack>
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
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