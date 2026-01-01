import { Ionicons } from "@expo/vector-icons";
import { osName } from "expo-device";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MeetingSessionDetailsScreenComponent from "@/components/screens/MeetingSessionDetailsScreen";
import { CalComAPIService } from "@/services/calcom";
import type { ConferencingSession } from "@/services/types/bookings.types";

/**
 * Get the presentation style for the meeting session details sheet
 * - Uses formSheet on iPhone with liquid glass support
 * - Uses modal on iPad or older iOS devices
 */
function getPresentationStyle(): "formSheet" | "modal" {
  if (isLiquidGlassAvailable() && osName !== "iPadOS") {
    return "formSheet";
  }
  return "modal";
}

export default function MeetingSessionDetailsIOS() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sessions, setSessions] = useState<ConferencingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (uid) {
      setIsLoading(true);
      CalComAPIService.getConferencingSessions(uid)
        .then((sessionsData) => {
          setSessions(sessionsData);
        })
        .catch(() => {
          Alert.alert("Error", "Failed to load session details");
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
          title: "Session Details",
          presentation: presentationStyle,
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.7, 1],
          sheetInitialDetentIndex: 0,
          contentStyle: {
            backgroundColor: useGlassEffect ? "transparent" : "#F2F2F7",
          },
          headerStyle: {
            backgroundColor: "transparent",
          },
          headerBlurEffect: useGlassEffect ? undefined : "light",
          headerLeft: () => (
            <TouchableOpacity
              onPress={handleClose}
              style={{
                padding: 8,
                backgroundColor: "rgba(120, 120, 128, 0.12)",
                borderRadius: 20,
              }}>
              <Ionicons name="close" size={20} color="#000" />
            </TouchableOpacity>
          ),
          headerRight: () => null,
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
            <MeetingSessionDetailsScreenComponent
              sessions={sessions}
              transparentBackground={useGlassEffect}
            />
          </View>
        )}
      </View>
    </>
  );
}
