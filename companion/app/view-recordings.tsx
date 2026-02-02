import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, useColorScheme, View } from "react-native";
import { AppPressable } from "@/components/AppPressable";
import { HeaderButtonWrapper } from "@/components/HeaderButtonWrapper";
import { getColors } from "@/constants/colors";
import ViewRecordingsScreenComponent from "@/components/screens/ViewRecordingsScreen";
import { CalComAPIService } from "@/services/calcom";
import type { BookingRecording } from "@/services/types/bookings.types";
import { showErrorAlert } from "@/utils/alerts";
import { safeLogError } from "@/utils/safeLogger";

export default function ViewRecordings() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const router = useRouter();
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

  const renderHeaderLeft = useCallback(
    () => (
      <HeaderButtonWrapper side="left">
        <AppPressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full border"
          style={{
            borderColor: theme.border,
            backgroundColor: theme.background,
            marginRight: 8,
          }}
        >
          <Ionicons name="close" size={20} color={theme.text} />
        </AppPressable>
      </HeaderButtonWrapper>
    ),
    [router, theme.border, theme.background, theme.text]
  );

  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Recordings",
            headerBackButtonDisplayMode: "minimal",
          }}
        />

        {Platform.OS === "ios" && (
          <Stack.Header>
            <Stack.Header.Title>Recordings</Stack.Header.Title>
          </Stack.Header>
        )}

        <View
          className="flex-1 items-center justify-center"
          style={{ backgroundColor: theme.background }}
        >
          <ActivityIndicator size="large" color={theme.text} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Recordings",
          headerBackButtonDisplayMode: "minimal",
          headerLeft: Platform.OS !== "ios" ? renderHeaderLeft : undefined,
        }}
      />

      {Platform.OS === "ios" && (
        <Stack.Header>
          <Stack.Header.Left>
            <Stack.Header.Button onPress={() => router.back()}>
              <Stack.Header.Icon sf="xmark" />
            </Stack.Header.Button>
          </Stack.Header.Left>

          <Stack.Header.Title>Recordings</Stack.Header.Title>
        </Stack.Header>
      )}

      <ViewRecordingsScreenComponent recordings={recordings} />
    </>
  );
}
