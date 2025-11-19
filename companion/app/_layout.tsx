import { Stack } from 'expo-router';
import { Platform, View, StatusBar } from 'react-native';
import '../global.css';

export default function RootLayout() {

  const stackContent = (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );

  return Platform.OS === 'web' ? (
    <View style={{ width: 400, height: "100vh", display: 'flex', flexDirection: 'column' }} className="bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {stackContent}
    </View>
  ) : (
    <View className="bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {stackContent}
    </View>
  );
}