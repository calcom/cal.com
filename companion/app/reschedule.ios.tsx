import { osName } from "expo-device";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getColors } from "@/constants/colors";
import type { RescheduleScreenHandle } from "@/components/screens/RescheduleScreen";
import RescheduleScreenComponent from "@/components/screens/RescheduleScreen";
import { type Booking, CalComAPIService } from "@/services/calcom";
import { showErrorAlert } from "@/utils/alerts";

// Semi-transparent background to prevent black flash while preserving glass effect

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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = getColors(isDark);

  const rescheduleScreenRef = useRef<RescheduleScreenHandle>(null);

  useEffect(() => {
    if (uid) {
      setIsLoading(true);
      CalComAPIService.getBookingByUid(uid)
        .then(setBooking)
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

  const handleSave = useCallback(() => {
    rescheduleScreenRef.current?.submit();
  }, []);

  const handleRescheduleSuccess = useCallback(() => {
    router.back();
  }, [router]);

  const presentationStyle = getPresentationStyle();
  const useGlassEffect = isLiquidGlassAvailable();

  // Semi-transparent background to prevent flashes while preserving glass effect
  const glassBackground = isDark ? "rgba(28, 28, 30, 0.01)" : "rgba(248, 248, 250, 0.01)";

  return (
    <>
      <Stack.Screen
        options={{
          title: "Reschedule",
          presentation: presentationStyle,
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.7, 1],
          sheetInitialDetentIndex: 0,
          contentStyle: {
            backgroundColor: useGlassEffect
              ? glassBackground
              : isDark
                ? theme.backgroundSecondary
                : theme.background,
          },
        }}
      />

      <Stack.Header>
        <Stack.Header.Left>
          <Stack.Header.Button
            onPress={() => router.back()}
            tintColor={theme.backgroundEmphasis}
            variant="prominent"
          >
            <Stack.Header.Icon sf="xmark" />
          </Stack.Header.Button>
        </Stack.Header.Left>

        <Stack.Header.Title>Reschedule</Stack.Header.Title>

        <Stack.Header.Right>
          <Stack.Header.Button
            onPress={handleSave}
            disabled={isSaving}
            variant="prominent"
            tintColor={theme.text}
          >
            <Stack.Header.Icon sf="checkmark" />
          </Stack.Header.Button>
        </Stack.Header.Right>
      </Stack.Header>

      <View
        style={{
          flex: 1,
          backgroundColor: useGlassEffect
            ? glassBackground
            : isDark
              ? theme.backgroundSecondary
              : theme.background,
          paddingTop: 56,
          paddingBottom: insets.bottom,
        }}
      >
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={theme.text} />
          </View>
        ) : (
          <RescheduleScreenComponent
            ref={rescheduleScreenRef}
            booking={booking}
            onSuccess={handleRescheduleSuccess}
            onSavingChange={setIsSaving}
            transparentBackground={useGlassEffect}
          />
        )}
      </View>
    </>
  );
}
