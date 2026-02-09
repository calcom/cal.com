import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppPressable } from "@/components/AppPressable";
import { HeaderButtonWrapper } from "@/components/HeaderButtonWrapper";
import type { EditAvailabilityDayScreenHandle } from "@/components/screens/EditAvailabilityDayScreen";
import EditAvailabilityDayScreenComponent from "@/components/screens/EditAvailabilityDayScreen";
import { getColors } from "@/constants/colors";
import { CalComAPIService, type Schedule } from "@/services/calcom";
import { showErrorAlert } from "@/utils/alerts";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function EditAvailabilityDay() {
  const { id, day } = useLocalSearchParams<{ id: string; day: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = getColors(isDark);

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
    if (isSaving) return;
    screenRef.current?.submit();
  }, [isSaving]);

  const handleSuccess = useCallback(() => {
    router.back();
  }, [router]);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  if (isLoading) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ paddingBottom: insets.bottom, backgroundColor: theme.background }}
      >
        <Stack.Screen
          options={{
            title: dayName,
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
          title: dayName,
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
      <EditAvailabilityDayScreenComponent
        ref={screenRef}
        schedule={schedule}
        dayIndex={dayIndex}
        onSuccess={handleSuccess}
        onSavingChange={setIsSaving}
      />
    </View>
  );
}
