import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, View } from "react-native";
import ViewRecordingsScreenComponent from "@/components/screens/ViewRecordingsScreen";
import { CalComAPIService } from "@/services/calcom";
import type { BookingRecording } from "@/services/types/bookings.types";
import { safeLogError } from "@/utils/safeLogger";

export default function ViewRecordings() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const router = useRouter();
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

  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Recordings",
            headerBackButtonDisplayMode: "minimal",
          }}
        />

        {/* iOS-only Stack.Header */}
        {Platform.OS === "ios" && (
          <Stack.Header style={{ shadowColor: "transparent" }}>
            <Stack.Header.Title>Recordings</Stack.Header.Title>
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
          title: "Recordings",
          headerBackButtonDisplayMode: "minimal",
        }}
      />

      {/* iOS-only Stack.Header with native styling */}
      {Platform.OS === "ios" && (
        <Stack.Header style={{ shadowColor: "transparent" }}>
          <Stack.Header.Title>Recordings</Stack.Header.Title>
        </Stack.Header>
      )}

      <ViewRecordingsScreenComponent recordings={recordings} />
    </>
  );
}
