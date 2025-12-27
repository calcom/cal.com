import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Platform, Text, View } from "react-native";
import { AppPressable } from "../../../components/AppPressable";
import type { AddGuestsScreenHandle } from "../../../components/screens/AddGuestsScreen";
import AddGuestsScreenComponent from "../../../components/screens/AddGuestsScreen";
import { type Booking, CalComAPIService } from "../../../services/calcom";

export default function AddGuests() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const addGuestsScreenRef = useRef<AddGuestsScreenHandle>(null);

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
    addGuestsScreenRef.current?.submit();
  }, []);

  const handleAddGuestsSuccess = useCallback(() => {
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
            title: "Add Guests",
            headerBackButtonDisplayMode: "minimal",
          }}
        />

        {/* iOS-only Stack.Header */}
        {Platform.OS === "ios" && (
          <Stack.Header style={{ shadowColor: "transparent" }}>
            <Stack.Header.Title>Add Guests</Stack.Header.Title>
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
          title: "Add Guests",
          headerBackButtonDisplayMode: "minimal",
          headerRight: Platform.OS !== "ios" ? renderHeaderRight : undefined,
        }}
      />

      {Platform.OS === "ios" && (
        <Stack.Header style={{ shadowColor: "transparent" }}>
          <Stack.Header.Title>Add Guests</Stack.Header.Title>

          <Stack.Header.Right>
            <Stack.Header.Button onPress={handleSave} disabled={isSaving}>
              Save
            </Stack.Header.Button>
          </Stack.Header.Right>
        </Stack.Header>
      )}

      <AddGuestsScreenComponent
        ref={addGuestsScreenRef}
        booking={booking}
        onSuccess={handleAddGuestsSuccess}
        onSavingChange={setIsSaving}
      />
    </>
  );
}
