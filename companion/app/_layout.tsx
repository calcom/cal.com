import { Stack } from 'expo-router';
import { Platform, View, StatusBar } from 'react-native';
import { AuthProvider } from '../contexts/AuthContext';
import '../global.css';

export default function RootLayout() {
  const stackContent = (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth/login" options={{ headerShown: false }} />
      <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
    </Stack>
  );

  const layoutContent = Platform.OS === 'web' ? (
    <View style={{ width: 400, flex: 1, display: 'flex', flexDirection: 'column' }} className="bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {stackContent}
    </View>
  ) : (
    <View style={{ flex: 1 }} className="bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {stackContent}
    </View>
  );

  return (
    <AuthProvider>
      {layoutContent}
    </AuthProvider>
  );
}