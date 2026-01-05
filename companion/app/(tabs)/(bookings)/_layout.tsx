import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function BookingsLayout() {
  return (
    <Stack
      screenOptions={
        Platform.OS === "web"
          ? {
              headerLeftContainerStyle: { paddingLeft: 12 },
              headerRightContainerStyle: { paddingRight: 12 },
            }
          : undefined
      }
    >
      <Stack.Screen name="index" options={{ headerShown: Platform.OS === "ios" }} />
      <Stack.Screen name="booking-detail" />
    </Stack>
  );
}
