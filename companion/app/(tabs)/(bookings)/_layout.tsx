import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function BookingsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: Platform.OS !== "ios" ? false : true }} />
      <Stack.Screen name="booking-detail" />
      <Stack.Screen name="reschedule" />
      <Stack.Screen name="edit-location" />
      <Stack.Screen name="add-guests" />
      <Stack.Screen name="mark-no-show" />
      <Stack.Screen name="view-recordings" />
      <Stack.Screen name="meeting-session-details" />
    </Stack>
  );
}
