import { osName } from "expo-device";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AddGuestsScreenHandle } from "@/components/screens/AddGuestsScreen";
import AddGuestsScreenComponent from "@/components/screens/AddGuestsScreen";
import { type Booking, CalComAPIService } from "@/services/calcom";
import { showErrorAlert } from "@/utils/alerts";

// Semi-transparent background to prevent black flash while preserving glass effect
const GLASS_BACKGROUND = "rgba(248, 248, 250, 0.01)";

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
            backgroundColor: useGlassEffect ? GLASS_BACKGROUND : "#F2F2F7",
          },
        }}
      />

      <Stack.Header>
        <Stack.Header.Left>
          <Stack.Header.Button onPress={() => router.back()}>
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
              tintColor="#000"
            >
              <Stack.Header.Icon sf="checkmark" />
            </Stack.Header.Button>
          ) : null}
        </Stack.Header.Right>
      </Stack.Header>

      <View
        style={{
          flex: 1,
          backgroundColor: useGlassEffect ? GLASS_BACKGROUND : "#F2F2F7",
          paddingTop: 56,
          paddingBottom: insets.bottom,
        }}
      >
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#007AFF" />
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
