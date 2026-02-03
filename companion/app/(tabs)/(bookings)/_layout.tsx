import { Stack } from "expo-router";
import { Platform } from "react-native";

// Define initial route for deep linking
// This ensures booking-detail has index as parent in the stack
export const unstable_settings = {
  initialRouteName: "index",
};

export default function BookingsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: Platform.OS === "ios" }} />
      <Stack.Screen name="booking-detail" />
    </Stack>
  );
}
