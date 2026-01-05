import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { EditAvailabilityOverrideScreenHandle } from "@/components/screens/EditAvailabilityOverrideScreen";
import EditAvailabilityOverrideScreenComponent from "@/components/screens/EditAvailabilityOverrideScreen";
import { CalComAPIService, type Schedule } from "@/services/calcom";

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
        className="flex-1 items-center justify-center bg-white"
        style={{ paddingBottom: insets.bottom }}
      >
        <Stack.Screen options={{ title }} />
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white" style={{ paddingBottom: insets.bottom }}>
      <Stack.Screen
        options={{
          title,
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
