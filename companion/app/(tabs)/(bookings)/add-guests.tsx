import { AppPressable } from "../../../components/AppPressable";
import AddGuestsScreen from "../../../components/screens/AddGuestsScreen";
import type { AddGuestsScreenHandle } from "../../../components/screens/AddGuestsScreen";
import { CalComAPIService, type Booking } from "../../../services/calcom";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Alert, ActivityIndicator, View, Text, Platform } from "react-native";

export default function AddGuests() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Ref to access AddGuestsScreen submit function (same pattern as senior's actionHandlersRef)
  const addGuestsScreenRef = useRef<AddGuestsScreenHandle>(null);

  // Fetch booking data
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
      // If uid is missing, navigate back to prevent infinite loading state
      setIsLoading(false);
      Alert.alert("Error", "Booking ID is missing");
      router.back();
    }
  }, [uid, router]);

  // Handle save action from header - calls the screen's submit function
  const handleSave = useCallback(() => {
    addGuestsScreenRef.current?.submit();
  }, []);

  // Callback when guests are added successfully
  const handleAddGuestsSuccess = useCallback(() => {
    router.back();
  }, [router]);

  // Android header right component
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
          // Android uses headerRight
          headerRight: Platform.OS !== "ios" ? renderHeaderRight : undefined,
        }}
      />

      {/* iOS-only Stack.Header with native styling */}
      {Platform.OS === "ios" && (
        <Stack.Header style={{ shadowColor: "transparent" }}>
          <Stack.Header.Title>Add Guests</Stack.Header.Title>

          {/* Header right - Save button, same pattern as senior's implementation */}
          <Stack.Header.Right>
            <Stack.Header.Button onPress={handleSave} disabled={isSaving}>
              Save
            </Stack.Header.Button>
          </Stack.Header.Right>
        </Stack.Header>
      )}

      <AddGuestsScreen
        ref={addGuestsScreenRef}
        booking={booking}
        onSuccess={handleAddGuestsSuccess}
        onSavingChange={setIsSaving}
      />
    </>
  );
}
