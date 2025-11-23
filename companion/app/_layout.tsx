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
    <View className="w-[400px] bg-white self-end flex-1 flex-col border border-gray-200">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {stackContent}
    </View>
  ) : (
    <View style={{ flex: 1 }} className="bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {stackContent}
    </View>
  );
}