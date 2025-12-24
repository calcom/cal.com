import ViewRecordingsScreen from "../../../components/screens/ViewRecordingsScreen";
import { CalComAPIService, type Booking } from "../../../services/calcom";
import type { BookingRecording } from "../../../services/types/bookings.types";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import { Alert, ActivityIndicator, View, Platform } from "react-native";

export default function ViewRecordings() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [recordings, setRecordings] = useState<BookingRecording[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch booking data and recordings
  useEffect(() => {
    if (uid) {
      setIsLoading(true);
      Promise.all([
        CalComAPIService.getBookingByUid(uid),
        CalComAPIService.getRecordings(uid).catch((error) => {
          console.error("Failed to load recordings:", error);
          return [];
        }),
      ])
        .then(([bookingData, recordingsData]) => {
          setBooking(bookingData);
          setRecordings(recordingsData);
        })
        .catch(() => {
          Alert.alert("Error", "Failed to load booking details");
          router.back();
        })
        .finally(() => setIsLoading(false));
    }
  }, [uid, router]);

  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Recordings",
            headerBackButtonDisplayMode: "minimal",
          }}
        />

        {/* iOS-only Stack.Header */}
        {Platform.OS === "ios" && (
          <Stack.Header style={{ shadowColor: "transparent" }}>
            <Stack.Header.Title>Recordings</Stack.Header.Title>
          </Stack.Header>
        )}

        <View className="flex-1 items-center justify-center bg-[#F2F2F7]">
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Recordings",
          headerBackButtonDisplayMode: "minimal",
        }}
      />

      {/* iOS-only Stack.Header with native styling */}
      {Platform.OS === "ios" && (
        <Stack.Header style={{ shadowColor: "transparent" }}>
          <Stack.Header.Title>Recordings</Stack.Header.Title>
        </Stack.Header>
      )}

      <ViewRecordingsScreen recordings={recordings} />
    </>
  );
}
