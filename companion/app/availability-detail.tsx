import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useRef } from "react";
import { Platform } from "react-native";
import {
  AvailabilityDetailScreen,
  type AvailabilityDetailScreenHandle,
} from "@/components/screens/AvailabilityDetailScreen";

export default function AvailabilityDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const screenRef = useRef<AvailabilityDetailScreenHandle>(null);

  if (!id) {
    return null;
  }

  const handleSave = () => {
    screenRef.current?.save();
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      {Platform.OS === "ios" && (
        <Stack.Header>
          <Stack.Header.Left>
            <Stack.Header.Button onPress={() => router.back()}>
              <Stack.Header.Icon sf="chevron.left" />
            </Stack.Header.Button>
          </Stack.Header.Left>

          <Stack.Header.Title>Edit Availability</Stack.Header.Title>

          <Stack.Header.Right>
            <Stack.Header.Button onPress={handleSave} variant="prominent" tintColor="#000">
              Save
            </Stack.Header.Button>
          </Stack.Header.Right>
        </Stack.Header>
      )}

      <AvailabilityDetailScreen ref={screenRef} id={id} useNativeHeader={Platform.OS === "ios"} />
    </>
  );
}
