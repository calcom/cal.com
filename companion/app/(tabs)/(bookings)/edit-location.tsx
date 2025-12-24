import { AppPressable } from "../../../components/AppPressable";
import EditLocationScreen from "../../../components/screens/EditLocationScreen";
import type { EditLocationScreenHandle } from "../../../components/screens/EditLocationScreen";
import { CalComAPIService, type Booking } from "../../../services/calcom";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Alert, ActivityIndicator, View, Text, Platform } from "react-native";

export default function EditLocation() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Ref to access EditLocationScreen submit function (same pattern as senior's actionHandlersRef)
  const editLocationScreenRef = useRef<EditLocationScreenHandle>(null);

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
    }
  }, [uid, router]);

  // Handle save action from header - calls the screen's submit function
  const handleSave = useCallback(() => {
    editLocationScreenRef.current?.submit();
  }, []);

  // Callback when location update is successful
  const handleUpdateSuccess = useCallback(() => {
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
        <Text className="text-[16px] font-semibold text-[#007AFF]">
          {isSaving ? "Saving..." : "Save"}
        </Text>
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
          // Android uses headerRight
          headerRight: Platform.OS !== "ios" ? renderHeaderRight : undefined,
        }}
      />

      {/* iOS-only Stack.Header with native styling */}
      {Platform.OS === "ios" && (
        <Stack.Header style={{ shadowColor: "transparent" }}>
          <Stack.Header.Title>Edit Location</Stack.Header.Title>

          {/* Header right - Save button, same pattern as senior's implementation */}
          <Stack.Header.Right>
            <Stack.Header.Button onPress={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Stack.Header.Button>
          </Stack.Header.Right>
        </Stack.Header>
      )}

      <EditLocationScreen
        ref={editLocationScreenRef}
        booking={booking}
        onSuccess={handleUpdateSuccess}
        onSavingChange={setIsSaving}
      />
    </>
  );
}
