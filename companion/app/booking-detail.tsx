import { BookingDetailScreen } from "../components/screens/BookingDetailScreen";
import { useLocalSearchParams, Stack } from "expo-router";
import React from "react";

export default function BookingDetail() {
  const { uid } = useLocalSearchParams<{ uid: string }>();

  if (!uid) {
    return null;
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <BookingDetailScreen uid={uid} />
    </>
  );
}
