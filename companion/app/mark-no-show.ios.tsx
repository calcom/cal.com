import { Ionicons } from "@expo/vector-icons";
import { osName } from "expo-device";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

  const handleClose = () => {
    router.back();
  };

  const presentationStyle = getPresentationStyle();
  const useGlassEffect = isLiquidGlassAvailable();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          headerLargeTitle: false,
          title: "Mark No-Show",
          presentation: presentationStyle,
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.4, 0.6],
          sheetInitialDetentIndex: 0,
          contentStyle: {
            backgroundColor: useGlassEffect ? "transparent" : "#F2F2F7",
          },
          headerStyle: {
            backgroundColor: "transparent",
          },
          headerBlurEffect: useGlassEffect ? undefined : "light",
          headerLeft: () => null,
          headerRight: () => (
            <TouchableOpacity onPress={handleClose} style={{ padding: 8 }}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          ),
        }}
      />

      <View
        style={{
          flex: 1,
          backgroundColor: useGlassEffect ? "transparent" : "#F2F2F7",
          paddingBottom: insets.bottom,
        }}>
        {isLoading ? (
          <View className="mt-20 flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : (
          <View className="mt-16 flex-1">
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
          </View>
        )}
      </View>
    </>
  );
}
