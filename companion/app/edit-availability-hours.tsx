import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect } from "react";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderButtonWrapper } from "@/components/HeaderButtonWrapper";
import EditAvailabilityHoursScreenComponent from "@/components/screens/EditAvailabilityHoursScreen";
import { useScheduleById } from "@/hooks/useSchedules";
import { showErrorAlert } from "@/utils/alerts";

export default function EditAvailabilityHours() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
        className="flex-1 items-center justify-center bg-white"
        style={{ paddingBottom: insets.bottom }}
      >
        <Stack.Screen
          options={{
            title: "Working Hours",
            presentation: "modal",
          }}
        />
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white" style={{ paddingBottom: insets.bottom }}>
      <Stack.Screen
        options={{
          title: "Working Hours",
          presentation: "modal",
          contentStyle: {
            backgroundColor: "#FFFFFF",
          },
          headerStyle: {
            backgroundColor: "#FFFFFF",
          },
          headerLeft: () => (
            <HeaderButtonWrapper side="left">
              <TouchableOpacity onPress={handleClose} style={{ padding: 8 }}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </HeaderButtonWrapper>
          ),
        }}
      />
      <EditAvailabilityHoursScreenComponent schedule={schedule} onDayPress={handleDayPress} />
    </View>
  );
}
