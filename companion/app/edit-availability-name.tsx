import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { EditAvailabilityNameScreenHandle } from "@/components/screens/EditAvailabilityNameScreen";
import EditAvailabilityNameScreenComponent from "@/components/screens/EditAvailabilityNameScreen";
import { CalComAPIService, type Schedule } from "@/services/calcom";

export default function EditAvailabilityName() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
        <Stack.Screen options={{ title: "Edit Name & Timezone" }} />
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white" style={{ paddingBottom: insets.bottom }}>
      <Stack.Screen
        options={{
          title: "Edit Name & Timezone",
          headerRight: () => (
            <Text
              onPress={handleSave}
              className={`text-[17px] font-semibold ${
                isSaving ? "text-gray-400" : "text-[#007AFF]"
              }`}
            >
              {isSaving ? "Saving..." : "Save"}
            </Text>
          ),
        }}
      />
      <EditAvailabilityNameScreenComponent
        ref={screenRef}
        schedule={schedule}
        onSuccess={handleSuccess}
        onSavingChange={setIsSaving}
      />
    </View>
  );
}
