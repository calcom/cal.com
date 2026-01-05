import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import EditAvailabilityHoursScreenComponent from "@/components/screens/EditAvailabilityHoursScreen";
import { CalComAPIService, type Schedule } from "@/services/calcom";

export default function EditAvailabilityHours() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        <Stack.Screen options={{ title: "Working Hours" }} />
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white" style={{ paddingBottom: insets.bottom }}>
      <Stack.Screen options={{ title: "Working Hours" }} />
      <EditAvailabilityHoursScreenComponent schedule={schedule} onDayPress={handleDayPress} />
    </View>
  );
}
