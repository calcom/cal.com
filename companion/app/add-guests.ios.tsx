import { osName } from "expo-device";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getColors } from "@/constants/colors";
import type { AddGuestsScreenHandle } from "@/components/screens/AddGuestsScreen";
import AddGuestsScreenComponent from "@/components/screens/AddGuestsScreen";
import { type Booking, CalComAPIService } from "@/services/calcom";
import { showErrorAlert } from "@/utils/alerts";

// Semi-transparent background to prevent black flash while preserving glass effect

function getPresentationStyle(): "formSheet" | "modal" {
  if (isLiquidGlassAvailable() && osName !== "iPadOS") {
    return "formSheet";
  }
  return "modal";
}

export default function AddGuestsIOS() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [guestCount, setGuestCount] = useState(0);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = getColors(isDark);

  const addGuestsScreenRef = useRef<AddGuestsScreenHandle>(null);

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
    addGuestsScreenRef.current?.submit();
  }, []);

  const handleAddGuestsSuccess = useCallback(() => {
    router.back();
  }, [router]);

  const presentationStyle = getPresentationStyle();
  const useGlassEffect = isLiquidGlassAvailable();

  // Semi-transparent background to prevent flashes while preserving glass effect
  const glassBackground = isDark ? "rgba(28, 28, 30, 0.01)" : "rgba(248, 248, 250, 0.01)";

  const showSaveButton = guestCount > 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: "Add Guests",
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

        <Stack.Header.Title>Add Guests</Stack.Header.Title>

        <Stack.Header.Right>
          {showSaveButton ? (
            <Stack.Header.Button
              onPress={handleSave}
              disabled={isSaving}
              variant="prominent"
              tintColor={theme.text}
            >
              <Stack.Header.Icon sf="checkmark" />
            </Stack.Header.Button>
          ) : null}
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
          <AddGuestsScreenComponent
            ref={addGuestsScreenRef}
            booking={booking}
            onSuccess={handleAddGuestsSuccess}
            onSavingChange={setIsSaving}
            onGuestCountChange={setGuestCount}
            transparentBackground={useGlassEffect}
          />
        )}
      </View>
    </>
  );
}
