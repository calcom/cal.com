import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Platform, View } from "react-native";
import { AppPressable } from "@/components/AppPressable";
import { HeaderButtonWrapper } from "@/components/HeaderButtonWrapper";
import type { EditLocationScreenHandle } from "@/components/screens/EditLocationScreen";
import EditLocationScreenComponent from "@/components/screens/EditLocationScreen";
import { type Booking, CalComAPIService } from "@/services/calcom";

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

  const renderHeaderRight = useCallback(
    () => (
      <HeaderButtonWrapper side="right">
        <AppPressable
          onPress={handleSave}
          disabled={isSaving}
          className={`px-2 py-2 ${isSaving ? "opacity-50" : ""}`}
        >
          <Ionicons name="checkmark" size={24} color="#007AFF" />
        </AppPressable>
      </HeaderButtonWrapper>
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

        {Platform.OS === "ios" && (
          <Stack.Header>
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
          headerLeft: Platform.OS !== "ios" ? renderHeaderLeft : undefined,
          headerRight: Platform.OS !== "ios" ? renderHeaderRight : undefined,
        }}
      />

      {Platform.OS === "ios" && (
        <Stack.Header>
          <Stack.Header.Left>
            <Stack.Header.Button onPress={() => router.back()}>
              <Stack.Header.Icon sf="xmark" />
            </Stack.Header.Button>
          </Stack.Header.Left>

          <Stack.Header.Title>Edit Location</Stack.Header.Title>

          <Stack.Header.Right>
            <Stack.Header.Button onPress={handleSave} disabled={isSaving}>
              <Stack.Header.Icon sf="checkmark" />
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
