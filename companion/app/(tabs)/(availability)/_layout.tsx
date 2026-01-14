import { Stack } from "expo-router";

export default function AvailabilityLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="availability-detail" />
    </Stack>
  );
}
