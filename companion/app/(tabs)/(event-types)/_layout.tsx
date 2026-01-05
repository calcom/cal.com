import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function EventTypesLayout() {
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
      <Stack.Screen name="index" options={{}} />
      <Stack.Screen name="event-type-detail" options={{}} />
    </Stack>
  );
}
