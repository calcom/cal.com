import { Ionicons } from "@expo/vector-icons";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { Alert, KeyboardAvoidingView, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppPressable } from "@/components/AppPressable";
import { FullScreenModal } from "@/components/FullScreenModal";
import { TIMEZONES as ALL_TIMEZONES } from "@/constants/timezones";
import type { Schedule } from "@/services/calcom";
import { CalComAPIService } from "@/services/calcom";
import { showErrorAlert } from "@/utils/alerts";

// Format timezones for display
const TIMEZONES = ALL_TIMEZONES.map((tz) => ({
  id: tz,
  label: tz.replace(/_/g, " "),
}));

export interface EditAvailabilityNameScreenProps {
  schedule: Schedule | null;
  onSuccess: () => void;
  onSavingChange?: (isSaving: boolean) => void;
  transparentBackground?: boolean;
}

export interface EditAvailabilityNameScreenHandle {
  submit: () => void;
}

export const EditAvailabilityNameScreen = forwardRef<
  EditAvailabilityNameScreenHandle,
  EditAvailabilityNameScreenProps
>(function EditAvailabilityNameScreen({ schedule, onSuccess, onSavingChange }, ref) {
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [isSaving, setIsSaving] = useState(false);
  const [showTimezoneModal, setShowTimezoneModal] = useState(false);

  // Initialize from schedule
  useEffect(() => {
    if (schedule) {
      setName(schedule.name ?? "");
      setTimezone(schedule.timeZone ?? "UTC");
    }
  }, [schedule]);

  // Notify parent of saving state
  useEffect(() => {
    onSavingChange?.(isSaving);
  }, [isSaving, onSavingChange]);

  const handleSubmit = useCallback(async () => {
    if (!schedule || isSaving) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert("Error", "Please enter a schedule name");
      return;
    }

    setIsSaving(true);
    try {
      await CalComAPIService.updateSchedule(schedule.id, {
        name: trimmedName,
        timeZone: timezone,
      });
      Alert.alert("Success", "Schedule updated successfully", [{ text: "OK", onPress: onSuccess }]);
      setIsSaving(false);
    } catch {
      showErrorAlert("Error", "Failed to update schedule. Please try again.");
      setIsSaving(false);
    }
  }, [schedule, name, timezone, onSuccess, isSaving]);

  // Expose submit to parent via ref
  useImperativeHandle(
    ref,
    () => ({
      submit: handleSubmit,
    }),
    [handleSubmit]
  );

  const selectedTimezoneLabel = TIMEZONES.find((tz) => tz.id === timezone)?.label || timezone;

  if (!schedule) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-500">No schedule data</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 16,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Name Input */}
        <Text className="mb-2 text-[13px] font-medium uppercase tracking-wide text-gray-500">
          Schedule Name
        </Text>
        <TextInput
          className="mb-4 rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-[17px] text-black"
          placeholder="Enter schedule name"
          placeholderTextColor="#9CA3AF"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          editable={!isSaving}
        />

        {/* Timezone Selector */}
        <Text className="mb-2 text-[13px] font-medium uppercase tracking-wide text-gray-500">
          Timezone
        </Text>
        <AppPressable
          className="flex-row items-center justify-between rounded-lg border border-gray-300 bg-gray-50 px-4 py-3"
          onPress={() => setShowTimezoneModal(true)}
        >
          <View className="flex-row items-center">
            <Ionicons name="globe-outline" size={20} color="#007AFF" style={{ marginRight: 12 }} />
            <View>
              <Text className="text-[17px] text-black">{selectedTimezoneLabel}</Text>
              <Text className="mt-0.5 text-[13px] text-gray-500">{timezone}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
        </AppPressable>
      </ScrollView>

      {/* Timezone Modal */}
      <FullScreenModal
        visible={showTimezoneModal}
        animationType="slide"
        onRequestClose={() => setShowTimezoneModal(false)}
      >
        <View className="flex-1 bg-white">
          <View className="flex-row items-center justify-between border-b border-gray-200 px-4 py-3">
            <Text className="text-[17px] font-semibold">Select Timezone</Text>
            <AppPressable onPress={() => setShowTimezoneModal(false)}>
              <Ionicons name="close" size={24} color="#8E8E93" />
            </AppPressable>
          </View>
          <ScrollView>
            {TIMEZONES.map((tz) => (
              <AppPressable
                key={tz.id}
                onPress={() => {
                  setTimezone(tz.id);
                  setShowTimezoneModal(false);
                }}
                className={`border-b border-gray-100 px-4 py-3.5 ${
                  tz.id === timezone ? "bg-blue-50" : ""
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text
                      className={`text-[17px] ${
                        tz.id === timezone ? "font-medium text-[#007AFF]" : "text-black"
                      }`}
                    >
                      {tz.label}
                    </Text>
                    <Text className="text-[13px] text-gray-500">{tz.id}</Text>
                  </View>
                  {tz.id === timezone && <Ionicons name="checkmark" size={20} color="#007AFF" />}
                </View>
              </AppPressable>
            ))}
          </ScrollView>
        </View>
      </FullScreenModal>
    </KeyboardAvoidingView>
  );
});

export default EditAvailabilityNameScreen;
