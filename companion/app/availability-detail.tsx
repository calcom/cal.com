import { AvailabilityDetailScreen } from "../components/screens/AvailabilityDetailScreen";
import { useLocalSearchParams, Stack } from "expo-router";
import React from "react";

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
