import { Stack, useLocalSearchParams } from "expo-router";
import { AvailabilityDetailScreen } from "@/components/screens/AvailabilityDetailScreen";

export default function AvailabilityDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) {
    return null;
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AvailabilityDetailScreen id={id} />
    </>
  );
}
