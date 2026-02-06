import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActivityIndicator, useColorScheme, View } from "react-native";
import { AppPressable } from "@/components/AppPressable";
import { HeaderButtonWrapper } from "@/components/HeaderButtonWrapper";
import EditAvailabilityHoursScreenComponent from "@/components/screens/EditAvailabilityHoursScreen";
import { getColors } from "@/constants/colors";
import { useScheduleById } from "@/hooks/useSchedules";
import { showErrorAlert } from "@/utils/alerts";

export default function EditAvailabilityHours() {
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

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  const handleDayPress = useCallback(
    (dayIndex: number) => {
      router.push(`/edit-availability-day?id=${id}&day=${dayIndex}` as never);
    },
    [router, id]
  );

  if (isLoading) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ paddingBottom: insets.bottom, backgroundColor: theme.background }}
      >
        <Stack.Screen
          options={{
            title: "Working Hours",
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
          title: "Working Hours",
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
        }}
      />
      <EditAvailabilityHoursScreenComponent
        schedule={schedule ?? null}
        onDayPress={handleDayPress}
      />
    </View>
  );
}
