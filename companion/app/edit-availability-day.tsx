import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderButtonWrapper } from "@/components/HeaderButtonWrapper";
import type { EditAvailabilityDayScreenHandle } from "@/components/screens/EditAvailabilityDayScreen";
import EditAvailabilityDayScreenComponent from "@/components/screens/EditAvailabilityDayScreen";
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

  if (isLoading) {
    return (
      <View
        className="flex-1 items-center justify-center bg-white"
        style={{ paddingBottom: insets.bottom }}
      >
        <Stack.Screen options={{ title: dayName }} />
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white" style={{ paddingBottom: insets.bottom }}>
      <Stack.Screen
        options={{
          title: dayName,
          headerRight: () => (
            <HeaderButtonWrapper side="right">
              <Text
                onPress={handleSave}
                className={`text-[17px] font-semibold ${
                  isSaving ? "text-gray-400" : "text-[#007AFF]"
                }`}
              >
                Save
              </Text>
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
