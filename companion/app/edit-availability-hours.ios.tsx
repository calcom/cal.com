import { osName } from "expo-device";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect } from "react";
import { ActivityIndicator, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getColors } from "@/constants/colors";
import EditAvailabilityHoursScreenComponent from "@/components/screens/EditAvailabilityHoursScreen.ios";
import { useScheduleById } from "@/hooks/useSchedules";
import { showErrorAlert } from "@/utils/alerts";

// Semi-transparent background to prevent black flash while preserving glass effect

function getPresentationStyle(): "formSheet" | "modal" {
  if (isLiquidGlassAvailable() && osName !== "iPadOS") {
    return "formSheet";
  }
  return "modal";
}

export default function EditAvailabilityHoursIOS() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = getColors(isDark);

  // Use React Query hook to read from cache (syncs with mutations)
  const { data: schedule, isLoading, isError } = useScheduleById(id ? Number(id) : undefined);

  // Handle missing ID or error
  useEffect(() => {
    if (!id) {
      showErrorAlert("Error", "Schedule ID is missing");
      router.back();
    } else if (isError) {
      showErrorAlert("Error", "Failed to load schedule details");
      router.back();
    }
  }, [id, isError, router]);

  const handleDayPress = useCallback(
    (dayIndex: number) => {
      router.push(`/edit-availability-day?id=${id}&day=${dayIndex}` as never);
    },
    [router, id]
  );

  const presentationStyle = getPresentationStyle();
  const useGlassEffect = isLiquidGlassAvailable();

  // Semi-transparent background to prevent flashes while preserving glass effect
  const glassBackground = isDark ? "rgba(28, 28, 30, 0.01)" : "rgba(248, 248, 250, 0.01)";

  return (
    <>
      <Stack.Screen
        options={{
          title: "Working Hours",
          presentation: presentationStyle,
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.7, 1],
          sheetInitialDetentIndex: 0,
          contentStyle: {
            backgroundColor: useGlassEffect
              ? glassBackground
              : isDark
                ? theme.backgroundSecondary
                : theme.background,
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

        <Stack.Header.Title>Working Hours</Stack.Header.Title>
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
          <EditAvailabilityHoursScreenComponent
            schedule={schedule ?? null}
            onDayPress={handleDayPress}
            transparentBackground={useGlassEffect}
          />
        )}
      </View>
    </>
  );
}
