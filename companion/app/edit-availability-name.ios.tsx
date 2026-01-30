import { osName } from "expo-device";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getColors } from "@/constants/colors";
import type { EditAvailabilityNameScreenHandle } from "@/components/screens/EditAvailabilityNameScreen.ios";
import EditAvailabilityNameScreenComponent from "@/components/screens/EditAvailabilityNameScreen.ios";
import { CalComAPIService, type Schedule } from "@/services/calcom";
import { showErrorAlert } from "@/utils/alerts";

// Semi-transparent background to prevent black flash while preserving glass effect

function getPresentationStyle(): "formSheet" | "modal" {
  if (isLiquidGlassAvailable() && osName !== "iPadOS") {
    return "formSheet";
  }
  return "modal";
}

export default function EditAvailabilityNameIOS() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = getColors(isDark);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const screenRef = useRef<EditAvailabilityNameScreenHandle>(null);

  useEffect(() => {
    if (id) {
      setIsLoading(true);
      CalComAPIService.getScheduleById(Number(id))
        .then(setSchedule)
        .catch(() => {
          showErrorAlert("Error", "Failed to load schedule details");
          router.back();
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
      showErrorAlert("Error", "Schedule ID is missing");
      router.back();
    }
  }, [id, router]);

  const handleSave = useCallback(() => {
    screenRef.current?.submit();
  }, []);

  const handleSuccess = useCallback(() => {
    router.back();
  }, [router]);

  const presentationStyle = getPresentationStyle();
  const useGlassEffect = isLiquidGlassAvailable();

  // Semi-transparent background to prevent flashes while preserving glass effect
  const glassBackground = isDark ? "rgba(28, 28, 30, 0.01)" : "rgba(248, 248, 250, 0.01)";

  return (
    <>
      <Stack.Screen
        options={{
          title: "Edit Name & Timezone",
          presentation: presentationStyle,
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.7, 1],
          sheetInitialDetentIndex: 0,
          contentStyle: {
            backgroundColor: useGlassEffect ? glassBackground : theme.backgroundSecondary,
          },
        }}
      />

      <Stack.Header>
        <Stack.Header.Left>
          <Stack.Header.Button
            onPress={() => router.back()}
            tintColor={theme.backgroundEmphasis}
            variant="prominent"
          >
            <Stack.Header.Icon sf="xmark" />
          </Stack.Header.Button>
        </Stack.Header.Left>

        <Stack.Header.Title>Edit Name & Timezone</Stack.Header.Title>

        <Stack.Header.Right>
          <Stack.Header.Button
            onPress={handleSave}
            disabled={isSaving}
            variant="prominent"
            tintColor={theme.text}
          >
            <Stack.Header.Icon sf="checkmark" />
          </Stack.Header.Button>
        </Stack.Header.Right>
      </Stack.Header>

      <View
        style={{
          flex: 1,
          paddingTop: 56,
          paddingBottom: insets.bottom,
        }}
      >
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : (
          <EditAvailabilityNameScreenComponent
            ref={screenRef}
            schedule={schedule}
            onSuccess={handleSuccess}
            onSavingChange={setIsSaving}
            transparentBackground={useGlassEffect}
          />
        )}
      </View>
    </>
  );
}
