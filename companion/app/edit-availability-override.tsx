import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderButtonWrapper } from "@/components/HeaderButtonWrapper";
import type { EditAvailabilityOverrideScreenHandle } from "@/components/screens/EditAvailabilityOverrideScreen";
import EditAvailabilityOverrideScreenComponent from "@/components/screens/EditAvailabilityOverrideScreen";
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
        className="flex-1 items-center justify-center bg-white"
        style={{ paddingBottom: insets.bottom }}
      >
        <Stack.Screen
          options={{
            title,
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
          title,
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
