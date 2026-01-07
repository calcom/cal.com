import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function AvailabilityLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="availability-detail" options={{ headerShown: Platform.OS === "ios" }} />
    </Stack>
  );
}
