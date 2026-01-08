import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, View } from "react-native";
import { AppPressable } from "@/components/AppPressable";
import { HeaderButtonWrapper } from "@/components/HeaderButtonWrapper";
import MarkNoShowScreenComponent from "@/components/screens/MarkNoShowScreen";
import { type Booking, CalComAPIService } from "@/services/calcom";

interface Attendee {
  id?: number | string;
  email: string;
  name: string;
  noShow?: boolean;
}

interface BookingAttendee {
  id?: number | string;
  email: string;
  name?: string;
  noShow?: boolean;
  absent?: boolean;
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
            bookingData.attendees.forEach((att: BookingAttendee) => {
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

  const renderHeaderLeft = useCallback(
    () => (
      <HeaderButtonWrapper side="left">
        <AppPressable onPress={() => router.back()} className="px-2 py-2">
          <Ionicons name="close" size={24} color="#007AFF" />
        </AppPressable>
      </HeaderButtonWrapper>
    ),
    [router]
  );

  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Mark No-Show",
            headerBackButtonDisplayMode: "minimal",
          }}
        />

        {Platform.OS === "ios" && (
          <Stack.Header>
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
          headerLeft: Platform.OS !== "ios" ? renderHeaderLeft : undefined,
        }}
      />

      {Platform.OS === "ios" && (
        <Stack.Header>
          <Stack.Header.Left>
            <Stack.Header.Button onPress={() => router.back()}>
              <Stack.Header.Icon sf="xmark" />
            </Stack.Header.Button>
          </Stack.Header.Left>

          <Stack.Header.Title>Mark No-Show</Stack.Header.Title>
        </Stack.Header>
      )}

      <MarkNoShowScreenComponent
        booking={booking}
        attendees={attendees}
        onUpdate={setAttendees}
        onBookingUpdate={(updatedBooking) => {
          setBooking(updatedBooking);
          const updatedAttendees: Attendee[] = [];
          if (updatedBooking.attendees && Array.isArray(updatedBooking.attendees)) {
            updatedBooking.attendees.forEach((att: BookingAttendee) => {
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
