import { osName } from "expo-device";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getColors } from "@/constants/colors";
import MarkNoShowScreenComponent from "@/components/screens/MarkNoShowScreen";
import { type Booking, CalComAPIService } from "@/services/calcom";
import { showErrorAlert } from "@/utils/alerts";

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

function getPresentationStyle(): "formSheet" | "modal" {
  if (isLiquidGlassAvailable() && osName !== "iPadOS") {
    return "formSheet";
  }
  return "modal";
}

export default function MarkNoShowIOS() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = getColors(isDark);

  useEffect(() => {
    if (uid) {
      setIsLoading(true);
      CalComAPIService.getBookingByUid(uid)
        .then((bookingData) => {
          setBooking(bookingData);
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
          showErrorAlert("Error", "Failed to load booking details");
          router.back();
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
      showErrorAlert("Error", "Booking ID is missing");
      router.back();
    }
  }, [uid, router]);

  const presentationStyle = getPresentationStyle();
  const useGlassEffect = isLiquidGlassAvailable();

  return (
    <>
      <Stack.Screen
        options={{
          title: "Mark No-Show",
          presentation: presentationStyle,
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.7, 1],
          sheetInitialDetentIndex: 0,
          contentStyle: {
            backgroundColor: useGlassEffect ? "transparent" : theme.background,
          },
        }}
      />

      <Stack.Header>
        <Stack.Header.Left>
          <Stack.Header.Button onPress={() => router.back()}>
            <Stack.Header.Icon sf="xmark" />
          </Stack.Header.Button>
        </Stack.Header.Left>

        <Stack.Header.Title>Mark No-Show</Stack.Header.Title>
      </Stack.Header>

      <View
        style={{
          flex: 1,
          backgroundColor: useGlassEffect ? "transparent" : theme.background,
          paddingTop: 56,
          paddingBottom: insets.bottom,
        }}
      >
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={theme.text} />
          </View>
        ) : (
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
            transparentBackground={useGlassEffect}
          />
        )}
      </View>
    </>
  );
}
