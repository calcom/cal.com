import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function MoreLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          // Hide native header on Android/Web since we use custom Header component
          // iOS uses Stack.Header in the component itself
          headerShown: Platform.OS === "ios",
        }}
      />
    </Stack>
  );
}
