import { osName } from "expo-device";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { EditAvailabilityOverrideScreenHandle } from "@/components/screens/EditAvailabilityOverrideScreen.ios";
import EditAvailabilityOverrideScreenComponent from "@/components/screens/EditAvailabilityOverrideScreen.ios";
import { CalComAPIService, type Schedule } from "@/services/calcom";

// Semi-transparent background to prevent black flash while preserving glass effect
const GLASS_BACKGROUND = "rgba(248, 248, 250, 0.01)";

function getPresentationStyle(): "formSheet" | "modal" {
  if (isLiquidGlassAvailable() && osName !== "iPadOS") {
    return "formSheet";
  }
  return "modal";
}

export default function EditAvailabilityOverrideIOS() {
  const { id, overrideIndex } = useLocalSearchParams<{
    id: string;
    overrideIndex?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const screenRef = useRef<EditAvailabilityOverrideScreenHandle>(null);

  const editingIndex = overrideIndex ? parseInt(overrideIndex, 10) : undefined;
  const isEditing = editingIndex !== undefined;

  useEffect(() => {
    if (id) {
      setIsLoading(true);
      CalComAPIService.getScheduleById(Number(id))
        .then(setSchedule)
        .catch(() => {
          Alert.alert("Error", "Failed to load schedule details");
          router.back();
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
      Alert.alert("Error", "Schedule ID is missing");
      router.back();
    }
  }, [id, router]);

  const handleSave = useCallback(() => {
    screenRef.current?.submit();
  }, []);

  const handleSuccess = useCallback(() => {
    router.back();
  }, [router]);

  const handleEditOverride = useCallback(
    (index: number) => {
      // Push a new edit screen on top of the current one
      // This allows user to go back to the override list after editing
      router.push(`/edit-availability-override?id=${id}&overrideIndex=${index}` as never);
    },
    [id, router]
  );

  const presentationStyle = getPresentationStyle();
  const useGlassEffect = isLiquidGlassAvailable();

  return (
    <>
      <Stack.Screen
        options={{
          title: isEditing ? "Edit Override" : "Add Override",
          presentation: presentationStyle,
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.7, 1],
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

        <Stack.Header.Title>{isEditing ? "Edit Override" : "Add Override"}</Stack.Header.Title>

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
          <EditAvailabilityOverrideScreenComponent
            ref={screenRef}
            schedule={schedule}
            overrideIndex={editingIndex}
            onSuccess={handleSuccess}
            onSavingChange={setIsSaving}
            onEditOverride={handleEditOverride}
            transparentBackground={useGlassEffect}
          />
        )}
      </View>
    </>
  );
}
