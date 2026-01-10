import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { AppPressable } from "@/components/AppPressable";
import { HeaderButtonWrapper } from "@/components/HeaderButtonWrapper";
import MeetingSessionDetailsScreenComponent from "@/components/screens/MeetingSessionDetailsScreen";
import { CalComAPIService } from "@/services/calcom";
import type { ConferencingSession } from "@/services/types/bookings.types";
import { showErrorAlert } from "@/utils/alerts";

export default function MeetingSessionDetails() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const router = useRouter();
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

  const renderHeaderLeft = useCallback(
    () => (
      <HeaderButtonWrapper side="left">
        <AppPressable onPress={() => router.back()} className="px-2 py-2">
          <Ionicons name="close" size={24} color="#007AFF" />
        </AppPressable>
      </HeaderButtonWrapper>
    ),
    [router]
  );

  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Session Details",
            headerBackButtonDisplayMode: "minimal",
          }}
        />

        {Platform.OS === "ios" && (
          <Stack.Header>
            <Stack.Header.Title>Session Details</Stack.Header.Title>
          </Stack.Header>
        )}

        <View className="flex-1 items-center justify-center bg-[#F2F2F7]">
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Session Details",
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

          <Stack.Header.Title>Session Details</Stack.Header.Title>
        </Stack.Header>
      )}

      <MeetingSessionDetailsScreenComponent sessions={sessions} />
    </>
  );
}
