import { osName } from "expo-device";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { EditAvailabilityDayScreenHandle } from "@/components/screens/EditAvailabilityDayScreen.ios";
import EditAvailabilityDayScreenComponent from "@/components/screens/EditAvailabilityDayScreen.ios";
import { CalComAPIService, type Schedule } from "@/services/calcom";
import { showErrorAlert } from "@/utils/alerts";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Semi-transparent background to prevent black flash while preserving glass effect
const GLASS_BACKGROUND = "rgba(248, 248, 250, 0.01)";

function getPresentationStyle(): "formSheet" | "modal" {
  if (isLiquidGlassAvailable() && osName !== "iPadOS") {
    return "formSheet";
  }
  return "modal";
}

export default function EditAvailabilityDayIOS() {
  const { id, day } = useLocalSearchParams<{ id: string; day: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const screenRef = useRef<EditAvailabilityDayScreenHandle>(null);

  const dayIndex = day ? parseInt(day, 10) : 0;
  const dayName = DAYS[dayIndex] || "Day";

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

  return (
    <>
      <Stack.Screen
        options={{
          title: dayName,
          presentation: presentationStyle,
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.6, 0.9],
          sheetInitialDetentIndex: 0,
          contentStyle: {
            backgroundColor: useGlassEffect ? GLASS_BACKGROUND : "#F2F2F7",
          },
        }}
      />

      <Stack.Header>
        <Stack.Header.Left>
          <Stack.Header.Button onPress={() => router.back()}>
            <Stack.Header.Icon sf="xmark" />
          </Stack.Header.Button>
        </Stack.Header.Left>

        <Stack.Header.Title>{dayName}</Stack.Header.Title>

        <Stack.Header.Right>
          <Stack.Header.Button
            onPress={handleSave}
            disabled={isSaving}
            variant="prominent"
            tintColor="#000"
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
          <EditAvailabilityDayScreenComponent
            ref={screenRef}
            schedule={schedule}
            dayIndex={dayIndex}
            onSuccess={handleSuccess}
            onSavingChange={setIsSaving}
            transparentBackground={useGlassEffect}
          />
        )}
      </View>
    </>
  );
}
