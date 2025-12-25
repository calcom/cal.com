import MeetingSessionDetailsScreen from "../../../components/screens/MeetingSessionDetailsScreen";
import { CalComAPIService, type Booking } from "../../../services/calcom";
import type { ConferencingSession } from "../../../services/types/bookings.types";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import { Alert, ActivityIndicator, View, Platform } from "react-native";

export default function MeetingSessionDetails() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [sessions, setSessions] = useState<ConferencingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (uid) {
      setIsLoading(true);
      Promise.all([
        CalComAPIService.getBookingByUid(uid),
        CalComAPIService.getConferencingSessions(uid).catch((error) => {
          console.error("Failed to load sessions:", error);
          return [];
        }),
      ])
        .then(([bookingData, sessionsData]) => {
          setBooking(bookingData);
          setSessions(sessionsData);
        })
        .catch(() => {
          Alert.alert("Error", "Failed to load booking details");
          router.back();
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
      Alert.alert("Error", "Booking ID is missing");
      router.back();
    }
  }, [uid, router]);

  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Session Details",
            headerBackButtonDisplayMode: "minimal",
          }}
        />

        {/* iOS-only Stack.Header */}
        {Platform.OS === "ios" && (
          <Stack.Header style={{ shadowColor: "transparent" }}>
            <Stack.Header.Title>Session Details</Stack.Header.Title>
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
          title: "Session Details",
          headerBackButtonDisplayMode: "minimal",
        }}
      />

      {/* iOS-only Stack.Header with native styling */}
      {Platform.OS === "ios" && (
        <Stack.Header style={{ shadowColor: "transparent" }}>
          <Stack.Header.Title>Session Details</Stack.Header.Title>
        </Stack.Header>
      )}

      <MeetingSessionDetailsScreen sessions={sessions} />
    </>
  );
}
