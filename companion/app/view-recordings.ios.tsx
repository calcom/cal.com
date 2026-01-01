import { Ionicons } from "@expo/vector-icons";
import { osName } from "expo-device";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ViewRecordingsScreenComponent from "@/components/screens/ViewRecordingsScreen";
import { CalComAPIService } from "@/services/calcom";
import type { BookingRecording } from "@/services/types/bookings.types";
import { safeLogError } from "@/utils/safeLogger";

function getPresentationStyle(): "formSheet" | "modal" {
  if (isLiquidGlassAvailable() && osName !== "iPadOS") {
    return "formSheet";
  }
  return "modal";
}

export default function ViewRecordingsIOS() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [recordings, setRecordings] = useState<BookingRecording[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (uid) {
      setIsLoading(true);
      CalComAPIService.getRecordings(uid)
        .then(setRecordings)
        .catch((error) => {
          safeLogError("Failed to load recordings:", error);
          Alert.alert("Error", "Failed to load recordings");
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
          title: "Recordings",
          presentation: presentationStyle,
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.7, 0.9],
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
            <ViewRecordingsScreenComponent recordings={recordings} />
          </View>
        )}
      </View>
    </>
  );
}
