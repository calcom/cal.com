import { Stack } from 'expo-router';
import { Platform, View } from 'react-native';
import '../global.css';

export default function RootLayout() {
  const stackContent = (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );

  return Platform.OS === 'web' ? (
    <View style={{ width: 400, height: "100vh", display: 'flex', flexDirection: 'column' }}>
      {stackContent}
    </View>
  ) : (
    stackContent
  );
}