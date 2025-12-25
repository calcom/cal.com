import MarkNoShowScreen from "../../../components/screens/MarkNoShowScreen";
import { CalComAPIService, type Booking } from "../../../services/calcom";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import { Alert, ActivityIndicator, View, Platform } from "react-native";

interface Attendee {
  id?: number | string;
  email: string;
  name: string;
  noShow?: boolean;
}

export default function MarkNoShow() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (uid) {
      setIsLoading(true);
      CalComAPIService.getBookingByUid(uid)
        .then((bookingData) => {
          setBooking(bookingData);
          // API may return "absent" or "noShow" depending on endpoint version
          const bookingAttendees: Attendee[] = [];
          if (bookingData.attendees && Array.isArray(bookingData.attendees)) {
            bookingData.attendees.forEach((att: any) => {
              bookingAttendees.push({
                id: att.id,
                email: att.email,
                name: att.name || att.email,
                noShow: att.absent === true || att.noShow === true,
              });
            });
          }
          setAttendees(bookingAttendees);
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
            title: "Mark No-Show",
            headerBackButtonDisplayMode: "minimal",
          }}
        />

        {/* iOS-only Stack.Header */}
        {Platform.OS === "ios" && (
          <Stack.Header style={{ shadowColor: "transparent" }}>
            <Stack.Header.Title>Mark No-Show</Stack.Header.Title>
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
          title: "Mark No-Show",
          headerBackButtonDisplayMode: "minimal",
        }}
      />

      {/* iOS-only Stack.Header with native styling */}
      {Platform.OS === "ios" && (
        <Stack.Header style={{ shadowColor: "transparent" }}>
          <Stack.Header.Title>Mark No-Show</Stack.Header.Title>
        </Stack.Header>
      )}

      <MarkNoShowScreen
        booking={booking}
        attendees={attendees}
        onUpdate={setAttendees}
        onBookingUpdate={(updatedBooking) => {
          setBooking(updatedBooking);
          const updatedAttendees: Attendee[] = [];
          if (updatedBooking.attendees && Array.isArray(updatedBooking.attendees)) {
            updatedBooking.attendees.forEach((att: any) => {
              updatedAttendees.push({
                id: att.id,
                email: att.email,
                name: att.name || att.email,
                noShow: att.absent === true || att.noShow === true,
              });
            });
          }
          setAttendees(updatedAttendees);
        }}
      />
    </>
  );
}
