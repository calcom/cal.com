import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, useColorScheme, View } from "react-native";
import { AppPressable } from "@/components/AppPressable";
import { HeaderButtonWrapper } from "@/components/HeaderButtonWrapper";
import type { AddGuestsScreenHandle } from "@/components/screens/AddGuestsScreen";
import AddGuestsScreenComponent from "@/components/screens/AddGuestsScreen";
import { getColors } from "@/constants/colors";
import { type Booking, CalComAPIService } from "@/services/calcom";
import { showErrorAlert } from "@/utils/alerts";

export default function AddGuests() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = getColors(isDark);

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

  const renderHeaderRight = useCallback(
    () => (
      <HeaderButtonWrapper side="right">
        <AppPressable
          onPress={handleSave}
          disabled={isSaving}
          className={`h-10 w-10 items-center justify-center rounded-full border ${
            isSaving ? "opacity-50" : ""
          }`}
          style={{
            borderColor: theme.border,
            backgroundColor: theme.background,
          }}
        >
          <Ionicons name="checkmark" size={20} color={theme.text} />
        </AppPressable>
      </HeaderButtonWrapper>
    ),
    [handleSave, isSaving, theme.text, theme.border, theme.background]
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

        {Platform.OS === "ios" && (
          <Stack.Header>
            <Stack.Header.Title>Add Guests</Stack.Header.Title>
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
          title: "Add Guests",
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

          <Stack.Header.Title>Add Guests</Stack.Header.Title>

          <Stack.Header.Right>
            <Stack.Header.Button onPress={handleSave} disabled={isSaving}>
              <Stack.Header.Icon sf="checkmark" />
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
