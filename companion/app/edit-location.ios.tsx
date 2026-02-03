import { osName } from "expo-device";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getColors } from "@/constants/colors";
import type { EditLocationScreenHandle } from "@/components/screens/EditLocationScreen";
import EditLocationScreenComponent from "@/components/screens/EditLocationScreen";
import { type Booking, CalComAPIService } from "@/services/calcom";
import { showErrorAlert } from "@/utils/alerts";

// Semi-transparent background to prevent black flash while preserving glass effect

function getPresentationStyle(): "formSheet" | "modal" {
  if (isLiquidGlassAvailable() && osName !== "iPadOS") {
    return "formSheet";
  }
  return "modal";
}

export default function EditLocationIOS() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = getColors(isDark);

  const editLocationScreenRef = useRef<EditLocationScreenHandle>(null);

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
    editLocationScreenRef.current?.submit();
  }, []);

  const handleUpdateSuccess = useCallback(() => {
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
          title: "Edit Location",
          presentation: presentationStyle,
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.7, 1],
          sheetInitialDetentIndex: 0,
          contentStyle: {
            backgroundColor: useGlassEffect ? glassBackground : theme.backgroundSecondary,
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

        <Stack.Header.Title>Edit Location</Stack.Header.Title>

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
          backgroundColor: useGlassEffect ? glassBackground : theme.backgroundSecondary,
          paddingTop: 56,
          paddingBottom: insets.bottom,
        }}
      >
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={theme.text} />
          </View>
        ) : (
          <EditLocationScreenComponent
            ref={editLocationScreenRef}
            booking={booking}
            onSuccess={handleUpdateSuccess}
            onSavingChange={setIsSaving}
            transparentBackground={useGlassEffect}
          />
        )}
      </View>
    </>
  );
}
