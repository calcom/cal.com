import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppPressable } from "@/components/AppPressable";
import { HeaderButtonWrapper } from "@/components/HeaderButtonWrapper";
import type { EditAvailabilityOverrideScreenHandle } from "@/components/screens/EditAvailabilityOverrideScreen";
import EditAvailabilityOverrideScreenComponent from "@/components/screens/EditAvailabilityOverrideScreen";
import { getColors } from "@/constants/colors";
import { CalComAPIService, type Schedule } from "@/services/calcom";
import { showErrorAlert } from "@/utils/alerts";

export default function EditAvailabilityOverride() {
  const { id, overrideIndex } = useLocalSearchParams<{
    id: string;
    overrideIndex?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = getColors(isDark);

  const screenRef = useRef<EditAvailabilityOverrideScreenHandle>(null);

  const editingIndex = overrideIndex ? parseInt(overrideIndex, 10) : undefined;
  const isEditing = editingIndex !== undefined;

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

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  const handleSave = useCallback(() => {
    if (isSaving) return;
    screenRef.current?.submit();
  }, [isSaving]);

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

  const title = isEditing ? "Edit Override" : "Add Override";

  if (isLoading) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ paddingBottom: insets.bottom, backgroundColor: theme.background }}
      >
        <Stack.Screen
          options={{
            title,
            presentation: "modal",
            headerStyle: {
              backgroundColor: theme.background,
            },
            headerTitleStyle: {
              color: theme.text,
            },
          }}
        />
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  return (
    <View
      className="flex-1"
      style={{ paddingBottom: insets.bottom, backgroundColor: theme.background }}
    >
      <Stack.Screen
        options={{
          title,
          presentation: "modal",
          contentStyle: {
            backgroundColor: theme.background,
          },
          headerStyle: {
            backgroundColor: theme.background,
          },
          headerTitleStyle: {
            color: theme.text,
          },
          headerLeft: () => (
            <HeaderButtonWrapper side="left">
              <AppPressable
                onPress={handleClose}
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
          headerRight: () => (
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
        }}
      />
      <EditAvailabilityOverrideScreenComponent
        ref={screenRef}
        schedule={schedule}
        overrideIndex={editingIndex}
        onSuccess={handleSuccess}
        onSavingChange={setIsSaving}
        onEditOverride={handleEditOverride}
      />
    </View>
  );
}
