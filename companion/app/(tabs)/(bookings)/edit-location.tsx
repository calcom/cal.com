import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Platform, Text, View } from "react-native";
import { AppPressable } from "../../../components/AppPressable";
import type { EditLocationScreenHandle } from "../../../components/screens/EditLocationScreen";
import EditLocationScreenComponent from "../../../components/screens/EditLocationScreen";
import { type Booking, CalComAPIService } from "../../../services/calcom";

export default function EditLocation() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const editLocationScreenRef = useRef<EditLocationScreenHandle>(null);

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

  const handleSave = useCallback(() => {
    editLocationScreenRef.current?.submit();
  }, []);

  const handleUpdateSuccess = useCallback(() => {
    router.back();
  }, [router]);

  const renderHeaderRight = useCallback(
    () => (
      <AppPressable
        onPress={handleSave}
        disabled={isSaving}
        className={`px-4 py-2 ${isSaving ? "opacity-50" : ""}`}
      >
        <Text className="text-[16px] font-semibold text-[#007AFF]">Save</Text>
      </AppPressable>
    ),
    [handleSave, isSaving]
  );

  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Edit Location",
            headerBackButtonDisplayMode: "minimal",
          }}
        />

        {/* iOS-only Stack.Header */}
        {Platform.OS === "ios" && (
          <Stack.Header style={{ shadowColor: "transparent" }}>
            <Stack.Header.Title>Edit Location</Stack.Header.Title>
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
          title: "Edit Location",
          headerBackButtonDisplayMode: "minimal",
          headerRight: Platform.OS !== "ios" ? renderHeaderRight : undefined,
        }}
      />

      {Platform.OS === "ios" && (
        <Stack.Header style={{ shadowColor: "transparent" }}>
          <Stack.Header.Title>Edit Location</Stack.Header.Title>

          <Stack.Header.Right>
            <Stack.Header.Button onPress={handleSave} disabled={isSaving}>
              Save
            </Stack.Header.Button>
          </Stack.Header.Right>
        </Stack.Header>
      )}

      <EditLocationScreenComponent
        ref={editLocationScreenRef}
        booking={booking}
        onSuccess={handleUpdateSuccess}
        onSavingChange={setIsSaving}
      />
    </>
  );
}
