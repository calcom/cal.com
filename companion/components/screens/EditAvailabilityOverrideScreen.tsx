import { Ionicons } from "@expo/vector-icons";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { Alert, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppPressable } from "@/components/AppPressable";
import { FullScreenModal } from "@/components/FullScreenModal";
import type { Schedule } from "@/services/calcom";
import { CalComAPIService } from "@/services/calcom";
import { showErrorAlert } from "@/utils/alerts";

// Generate time options (15-minute intervals)
const generateTimeOptions = () => {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const h = hour.toString().padStart(2, "0");
      const m = minute.toString().padStart(2, "0");
      options.push(`${h}:${m}`);
    }
  }
  return options;
};

const TIME_OPTIONS = generateTimeOptions();

// Convert 24-hour time to 12-hour format with AM/PM
const formatTime12Hour = (time24: string): string => {
  const [hours, minutes] = time24.split(":");
  const hour = parseInt(hours, 10);
  const min = minutes || "00";
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${min} ${period}`;
};

// Format date for display
const formatDateForDisplay = (dateStr: string): string => {
  if (!dateStr) return "";
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

export interface EditAvailabilityOverrideScreenProps {
  schedule: Schedule | null;
  overrideIndex?: number;
  onSuccess: () => void;
  onSavingChange?: (isSaving: boolean) => void;
  onEditOverride?: (index: number) => void;
  transparentBackground?: boolean;
}

export interface EditAvailabilityOverrideScreenHandle {
  submit: () => void;
}

export const EditAvailabilityOverrideScreen = forwardRef<
  EditAvailabilityOverrideScreenHandle,
  EditAvailabilityOverrideScreenProps
>(function EditAvailabilityOverrideScreen(
  { schedule, overrideIndex, onSuccess, onSavingChange, onEditOverride },
  ref
) {
  const insets = useSafeAreaInsets();

  const isEditing = overrideIndex !== undefined;

  const [selectedDate, setSelectedDate] = useState("");
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [isSaving, setIsSaving] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState<{
    type: "start" | "end";
  } | null>(null);

  // Initialize from existing override if editing
  useEffect(() => {
    if (schedule && isEditing && schedule.overrides && overrideIndex !== undefined) {
      const override = schedule.overrides[overrideIndex];
      if (override) {
        setSelectedDate(override.date ?? "");
        const start = override.startTime ?? "00:00";
        const end = override.endTime ?? "00:00";
        setIsUnavailable(start === "00:00" && end === "00:00");
        setStartTime(start === "00:00" ? "09:00" : start);
        setEndTime(end === "00:00" ? "17:00" : end);
      }
    }
  }, [schedule, isEditing, overrideIndex]);

  // Notify parent of saving state
  useEffect(() => {
    onSavingChange?.(isSaving);
  }, [isSaving, onSavingChange]);

  const handleTimeSelect = useCallback(
    (time: string) => {
      if (!showTimePicker) return;

      if (showTimePicker.type === "start") {
        setStartTime(time);
      } else {
        setEndTime(time);
      }
      setShowTimePicker(null);
    },
    [showTimePicker]
  );

  const saveOverrides = useCallback(
    async (
      newOverrides: { date: string; startTime: string; endTime: string }[],
      successMessage: string
    ) => {
      if (!schedule) return;

      setIsSaving(true);
      try {
        await CalComAPIService.updateSchedule(schedule.id, {
          overrides: newOverrides,
        });
        Alert.alert("Success", successMessage, [{ text: "OK", onPress: onSuccess }]);
        setIsSaving(false);
      } catch {
        showErrorAlert("Error", "Failed to save override. Please try again.");
        setIsSaving(false);
      }
    },
    [schedule, onSuccess]
  );

  const handleDeleteOverride = useCallback(
    (indexToDelete: number) => {
      if (!schedule || !schedule.overrides) return;

      const override = schedule.overrides[indexToDelete];
      const dateDisplay = formatDateForDisplay(override?.date ?? "");

      Alert.alert(
        "Delete Override",
        `Are you sure you want to delete the override for ${dateDisplay}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              const newOverrides = schedule.overrides
                ? schedule.overrides
                    .filter((_, idx) => idx !== indexToDelete)
                    .map((o) => ({
                      date: o.date ?? "",
                      startTime: (o.startTime ?? "00:00").substring(0, 5),
                      endTime: (o.endTime ?? "00:00").substring(0, 5),
                    }))
                : [];
              await saveOverrides(newOverrides, "Override deleted successfully");
            },
          },
        ]
      );
    },
    [schedule, saveOverrides]
  );

  const handleSubmit = useCallback(async () => {
    if (!schedule || isSaving) return;

    if (!selectedDate) {
      Alert.alert("Error", "Please enter a date (YYYY-MM-DD format)");
      return;
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(selectedDate)) {
      Alert.alert("Error", "Please enter date in YYYY-MM-DD format");
      return;
    }

    // Validate end time is after start time (only when not marking as unavailable)
    if (!isUnavailable && endTime <= startTime) {
      Alert.alert("Error", "End time must be after start time");
      return;
    }

    const newOverride = {
      date: selectedDate,
      startTime: isUnavailable ? "00:00" : startTime,
      endTime: isUnavailable ? "00:00" : endTime,
    };

    let newOverrides: { date: string; startTime: string; endTime: string }[] = [];

    if (schedule.overrides && Array.isArray(schedule.overrides)) {
      newOverrides = schedule.overrides.map((o) => ({
        date: o.date ?? "",
        startTime: (o.startTime ?? "00:00").substring(0, 5),
        endTime: (o.endTime ?? "00:00").substring(0, 5),
      }));
    }

    const successMessage = isEditing
      ? "Override updated successfully"
      : "Override added successfully";

    if (isEditing && overrideIndex !== undefined) {
      newOverrides[overrideIndex] = newOverride;
    } else {
      const existingIndex = newOverrides.findIndex((o) => o.date === selectedDate);
      if (existingIndex >= 0) {
        Alert.alert(
          "Date Already Exists",
          "An override for this date already exists. Do you want to replace it?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Replace",
              onPress: async () => {
                newOverrides[existingIndex] = newOverride;
                await saveOverrides(newOverrides, "Override replaced successfully");
              },
            },
          ]
        );
        return;
      }
      newOverrides.push(newOverride);
    }

    await saveOverrides(newOverrides, successMessage);
  }, [
    schedule,
    selectedDate,
    isUnavailable,
    startTime,
    endTime,
    isEditing,
    overrideIndex,
    saveOverrides,
    isSaving,
  ]);

  useImperativeHandle(
    ref,
    () => ({
      submit: handleSubmit,
    }),
    [handleSubmit]
  );

  if (!schedule) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-500">No schedule data</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{
        padding: 16,
        paddingBottom: insets.bottom + 16,
      }}
    >
      {/* Date Input */}
      <Text className="mb-2 text-[13px] font-medium text-gray-500">Date (YYYY-MM-DD)</Text>
      <View className="mb-4 rounded-lg border border-gray-200 px-4 py-3">
        <View className="flex-row items-center">
          <Ionicons name="calendar" size={20} color="#007AFF" style={{ marginRight: 12 }} />
          <TextInput
            className="flex-1 text-[17px] text-black"
            placeholder="2024-12-25"
            placeholderTextColor="#9CA3AF"
            value={selectedDate}
            onChangeText={setSelectedDate}
          />
        </View>
        {selectedDate && (
          <Text className="mt-2 text-[15px] text-gray-500">
            {formatDateForDisplay(selectedDate)}
          </Text>
        )}
      </View>

      {/* Unavailable Toggle */}
      <View className="mb-4 flex-row items-center justify-between rounded-lg border border-gray-200 px-4 py-3.5">
        <View className="flex-row items-center">
          <Ionicons name="moon-outline" size={20} color="#FF3B30" style={{ marginRight: 12 }} />
          <View>
            <Text className="text-[17px] text-black">Mark as unavailable</Text>
            <Text className="text-[13px] text-gray-500">Block this entire day</Text>
          </View>
        </View>
        <Switch
          value={isUnavailable}
          onValueChange={setIsUnavailable}
          trackColor={{ false: "#E5E5EA", true: "#FF3B30" }}
          thumbColor="#fff"
        />
      </View>

      {/* Time Range (only when available) */}
      {!isUnavailable && (
        <>
          <Text className="mb-2 text-[13px] font-medium text-gray-500">Available Hours</Text>
          <View className="mb-4 rounded-lg border border-gray-200 px-4 py-3.5">
            <View className="flex-row items-center">
              <AppPressable
                className="flex-1 rounded-lg bg-gray-100 px-3 py-2"
                onPress={() => setShowTimePicker({ type: "start" })}
              >
                <Text className="text-[13px] text-gray-500">Start Time</Text>
                <Text className="text-[17px] text-black">{formatTime12Hour(startTime)}</Text>
              </AppPressable>

              <Text className="mx-4 text-[17px] text-gray-400">–</Text>

              <AppPressable
                className="flex-1 rounded-lg bg-gray-100 px-3 py-2"
                onPress={() => setShowTimePicker({ type: "end" })}
              >
                <Text className="text-[13px] text-gray-500">End Time</Text>
                <Text className="text-[17px] text-black">{formatTime12Hour(endTime)}</Text>
              </AppPressable>
            </View>
          </View>
        </>
      )}

      {/* Existing Overrides */}
      {!isEditing && schedule.overrides && schedule.overrides.length > 0 && (
        <>
          <Text className="mb-2 mt-4 text-[13px] font-medium text-gray-500">
            Existing Overrides
          </Text>
          <View className="overflow-hidden rounded-lg border border-gray-200">
            {schedule.overrides.map((override, index) => (
              <AppPressable
                key={override.date}
                className={`flex-row items-center justify-between px-4 py-3 ${
                  index > 0 ? "border-t border-gray-200" : ""
                }`}
                onPress={() => onEditOverride?.(index)}
              >
                <View className="flex-1">
                  <Text className="text-[15px] text-black">
                    {formatDateForDisplay(override.date ?? "")}
                  </Text>
                  {override.startTime === "00:00" && override.endTime === "00:00" ? (
                    <Text className="text-[13px] text-red-500">Unavailable</Text>
                  ) : (
                    <Text className="text-[13px] text-gray-500">
                      {formatTime12Hour(override.startTime ?? "00:00")} –{" "}
                      {formatTime12Hour(override.endTime ?? "00:00")}
                    </Text>
                  )}
                </View>
                <View className="flex-row items-center">
                  <AppPressable
                    className="rounded-full bg-red-100 p-2"
                    onPress={() => handleDeleteOverride(index)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                  </AppPressable>
                  <AppPressable
                    className="ml-3 rounded-full bg-gray-100 p-2"
                    onPress={() => onEditOverride?.(index)}
                  >
                    <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
                  </AppPressable>
                </View>
              </AppPressable>
            ))}
          </View>
        </>
      )}

      {/* Time Picker Modal */}
      <FullScreenModal
        visible={!!showTimePicker}
        animationType="slide"
        onRequestClose={() => setShowTimePicker(null)}
      >
        <View className="flex-1 bg-white">
          <View className="flex-row items-center justify-between border-b border-gray-200 px-4 py-3">
            <Text className="text-[17px] font-semibold">
              Select {showTimePicker?.type === "start" ? "Start" : "End"} Time
            </Text>
            <AppPressable onPress={() => setShowTimePicker(null)}>
              <Ionicons name="close" size={24} color="#8E8E93" />
            </AppPressable>
          </View>
          <ScrollView>
            {TIME_OPTIONS.map((time) => {
              const currentTime = showTimePicker?.type === "start" ? startTime : endTime;
              const isSelected = currentTime === time;

              return (
                <AppPressable
                  key={time}
                  onPress={() => handleTimeSelect(time)}
                  className={`border-b border-gray-100 px-4 py-3.5 ${
                    isSelected ? "bg-blue-50" : ""
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <Text
                      className={`text-[17px] ${
                        isSelected ? "font-medium text-[#007AFF]" : "text-black"
                      }`}
                    >
                      {formatTime12Hour(time)}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={20} color="#007AFF" />}
                  </View>
                </AppPressable>
              );
            })}
          </ScrollView>
        </View>
      </FullScreenModal>
    </ScrollView>
  );
});

export default EditAvailabilityOverrideScreen;
