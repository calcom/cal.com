import { osName } from "expo-device";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getColors } from "@/constants/colors";
import ViewRecordingsScreenComponent from "@/components/screens/ViewRecordingsScreen";
import { CalComAPIService } from "@/services/calcom";
import type { BookingRecording } from "@/services/types/bookings.types";
import { showErrorAlert } from "@/utils/alerts";
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = getColors(isDark);

  useEffect(() => {
    if (uid) {
      setIsLoading(true);
      CalComAPIService.getRecordings(uid)
        .then(setRecordings)
        .catch((error) => {
          safeLogError("Failed to load recordings:", error);
          showErrorAlert("Error", "Failed to load recordings");
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
          title: "Recordings",
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

        <Stack.Header.Title>Recordings</Stack.Header.Title>
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
          <ViewRecordingsScreenComponent
            recordings={recordings}
            transparentBackground={useGlassEffect}
          />
        )}
      </View>
    </>
  );
}
