import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function BookingsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: Platform.OS !== "ios" ? false : true }} />
    </Stack>
  );
}
