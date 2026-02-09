import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, useColorScheme, View } from "react-native";
import { AppPressable } from "@/components/AppPressable";
import { HeaderButtonWrapper } from "@/components/HeaderButtonWrapper";
import type { EditLocationScreenHandle } from "@/components/screens/EditLocationScreen";
import EditLocationScreenComponent from "@/components/screens/EditLocationScreen";
import { getColors } from "@/constants/colors";
import { type Booking, CalComAPIService } from "@/services/calcom";
import { showErrorAlert } from "@/utils/alerts";

export default function EditLocation() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = getColors(isDark);

  const editLocationScreenRef = useRef<EditLocationScreenHandle>(null);

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
    editLocationScreenRef.current?.submit();
  }, []);

  const handleUpdateSuccess = useCallback(() => {
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
            title: "Edit Location",
            headerBackButtonDisplayMode: "minimal",
          }}
        />

        {Platform.OS === "ios" && (
          <Stack.Header>
            <Stack.Header.Title>Edit Location</Stack.Header.Title>
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
          title: "Edit Location",
          headerBackButtonDisplayMode: "minimal",
          contentStyle: {
            backgroundColor: theme.background,
          },
          headerStyle: {
            backgroundColor: theme.background,
          },
          headerTitleStyle: {
            color: theme.text,
          },
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
