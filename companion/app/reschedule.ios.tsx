import { Ionicons } from "@expo/vector-icons";
import { osName } from "expo-device";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RescheduleScreenHandle } from "@/components/screens/RescheduleScreen";
import RescheduleScreenComponent from "@/components/screens/RescheduleScreen";
import { type Booking, CalComAPIService } from "@/services/calcom";

function getPresentationStyle(): "formSheet" | "modal" {
  if (isLiquidGlassAvailable() && osName !== "iPadOS") {
    return "formSheet";
  }
  return "modal";
}

export default function RescheduleIOS() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const rescheduleScreenRef = useRef<RescheduleScreenHandle>(null);

  useEffect(() => {
    if (uid) {
      setIsLoading(true);
      CalComAPIService.getBookingByUid(uid)
        .then(setBooking)
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

  const handleSave = useCallback(() => {
    rescheduleScreenRef.current?.submit();
  }, []);

  const handleRescheduleSuccess = useCallback(() => {
    router.back();
  }, [router]);

  const presentationStyle = getPresentationStyle();
  const useGlassEffect = isLiquidGlassAvailable();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          headerLargeTitle: false,
          title: "Reschedule",
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
                backgroundColor: "rgba(120, 120, 128, 0.08)",
                borderRadius: 20,
              }}>
              <Ionicons name="close" size={20} color="#000" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving}
              style={{
                padding: 8,
                backgroundColor: "rgba(0, 122, 255, 0.08)",
                borderRadius: 20,
                opacity: isSaving ? 0.5 : 1,
              }}>
              <Ionicons name="checkmark" size={20} color="#007AFF" />
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
            <RescheduleScreenComponent
              ref={rescheduleScreenRef}
              booking={booking}
              onSuccess={handleRescheduleSuccess}
              onSavingChange={setIsSaving}
              transparentBackground={useGlassEffect}
            />
          </View>
        )}
      </View>
    </>
  );
}
