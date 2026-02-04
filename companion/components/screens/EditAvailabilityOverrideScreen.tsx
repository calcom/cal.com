import { Ionicons } from "@expo/vector-icons";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppPressable } from "@/components/AppPressable";
import { FullScreenModal } from "@/components/FullScreenModal";
import { useUpdateSchedule } from "@/hooks/useSchedules";
import type { Schedule } from "@/services/calcom";
import { showErrorAlert, showSuccessAlert } from "@/utils/alerts";
import { shadows } from "@/utils/shadows";

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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Use mutation hook for cache-synchronized updates
  const { mutate: updateSchedule, isPending: isMutating } = useUpdateSchedule();

  const isEditing = overrideIndex !== undefined;

  const [selectedDate, setSelectedDate] = useState("");
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [showTimePicker, setShowTimePicker] = useState<{
    type: "start" | "end";
  } | null>(null);

  // Render modal content
  const renderTimePickerContent = () => (
    <>
      <View className="flex-row items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-[#4D4D4D]">
        <Text className="text-[17px] font-semibold text-black dark:text-white">
          Select {showTimePicker?.type === "start" ? "Start" : "End"} Time
        </Text>
        <AppPressable onPress={() => setShowTimePicker(null)}>
          <Ionicons name="close" size={24} color={isDark ? "#FFFFFF" : "#A3A3A3"} />
        </AppPressable>
      </View>
      <ScrollView className="px-4 py-3">
        {TIME_OPTIONS.map((time) => {
          const currentTime = showTimePicker?.type === "start" ? startTime : endTime;
          const isSelected = currentTime === time;

          return (
            <AppPressable key={time} onPress={() => handleTimeSelect(time)}>
              <View
                className={`mb-2.5 rounded-xl border-2 px-4 py-4 ${
                  isSelected
                    ? "border-[#007AFF] bg-blue-50 shadow-md dark:bg-[#0A84FF]/20"
                    : "border-gray-200 bg-gray-50 dark:border-[#4D4D4D] dark:bg-[#171717]"
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <Text
                    className={`text-[17px] ${
                      isSelected
                        ? "font-semibold text-[#007AFF]"
                        : "font-medium text-gray-900 dark:text-white"
                    }`}
                  >
                    {formatTime12Hour(time)}
                  </Text>
                  {isSelected && (
                    <View className="rounded-full bg-[#007AFF] p-1.5">
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    </View>
                  )}
                </View>
              </View>
            </AppPressable>
          );
        })}
      </ScrollView>
    </>
  );

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
    onSavingChange?.(isMutating);
  }, [isMutating, onSavingChange]);

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
    (
      newOverrides: { date: string; startTime: string; endTime: string }[],
      successMessage: string
    ) => {
      if (!schedule) return;

      updateSchedule(
        { id: schedule.id, updates: { overrides: newOverrides } },
        {
          onSuccess: () => {
            if (Platform.OS === "web") {
              showSuccessAlert("Success", successMessage);
              onSuccess();
            } else {
              Alert.alert("Success", successMessage, [{ text: "OK", onPress: onSuccess }]);
            }
          },
          onError: () => {
            showErrorAlert("Error", "Failed to save override. Please try again.");
          },
        }
      );
    },
    [schedule, onSuccess, updateSchedule]
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

  const handleSubmit = useCallback(() => {
    if (!schedule || isMutating) return;

    if (!selectedDate) {
      showErrorAlert("Error", "Please enter a date (YYYY-MM-DD format)");
      return;
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(selectedDate)) {
      showErrorAlert("Error", "Please enter date in YYYY-MM-DD format");
      return;
    }

    // Validate end time is after start time (only when not marking as unavailable)
    if (!isUnavailable && endTime <= startTime) {
      showErrorAlert("Error", "End time must be after start time");
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
              onPress: () => {
                newOverrides[existingIndex] = newOverride;
                saveOverrides(newOverrides, "Override replaced successfully");
              },
            },
          ]
        );
        return;
      }
      newOverrides.push(newOverride);
    }

    saveOverrides(newOverrides, successMessage);
  }, [
    schedule,
    selectedDate,
    isUnavailable,
    startTime,
    endTime,
    isEditing,
    overrideIndex,
    saveOverrides,
    isMutating,
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
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <Text className="text-gray-500 dark:text-[#A3A3A3]">No schedule data</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-black"
      contentContainerStyle={{
        padding: 16,
        paddingBottom: insets.bottom + 16,
      }}
    >
      <Text className="mb-2 text-[13px] font-medium text-gray-500 dark:text-[#A3A3A3]">
        Date (YYYY-MM-DD)
      </Text>
      <View className="mb-4 rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 dark:border-[#4D4D4D] dark:bg-[#171717]">
        <View className="flex-row items-center">
          <Ionicons name="calendar-outline" size={20} color="#007AFF" style={{ marginRight: 12 }} />
          {Platform.OS === "web" ? (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                flex: 1,
                fontSize: 17,
                color: isDark ? "#FFFFFF" : "#000000",
                backgroundColor: "transparent",
                border: "none",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
          ) : (
            <TextInput
              className="flex-1 text-[17px] text-black dark:text-white"
              placeholder="2024-12-25"
              placeholderTextColor={isDark ? "#A3A3A3" : "#9CA3AF"}
              value={selectedDate}
              onChangeText={setSelectedDate}
            />
          )}
        </View>
        {selectedDate ? (
          <Text className="mt-2 text-[15px] text-gray-500 dark:text-[#A3A3A3]">
            {formatDateForDisplay(selectedDate)}
          </Text>
        ) : null}
      </View>

      <View className="mb-4 flex-row items-center justify-between rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3.5 dark:border-[#4D4D4D] dark:bg-[#171717]">
        <View className="flex-row items-center">
          <Ionicons name="moon-outline" size={20} color="#FF3B30" style={{ marginRight: 12 }} />
          <View>
            <Text className="text-[17px] text-black dark:text-white">Mark as unavailable</Text>
            <Text className="text-[13px] text-gray-500 dark:text-[#A3A3A3]">
              Block this entire day
            </Text>
          </View>
        </View>
        <Switch
          value={isUnavailable}
          onValueChange={setIsUnavailable}
          trackColor={{
            false: isDark ? "#404040" : "#E5E5EA",
            true: isDark ? "#34C759" : "#000000",
          }}
          thumbColor="#FFFFFF"
        />
      </View>

      {!isUnavailable && (
        <>
          <Text className="mb-2 text-[13px] font-medium text-gray-500 dark:text-[#A3A3A3]">
            Available Hours
          </Text>
          <View className="mb-4 rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3.5 dark:border-[#4D4D4D] dark:bg-[#171717]">
            <View className="flex-row items-center">
              {Platform.OS === "web" ? (
                <View className="flex-1 rounded-lg bg-gray-200/50 px-3 py-2 dark:bg-[#4D4D4D]/50">
                  <Text className="text-[13px] text-gray-500 dark:text-[#A3A3A3]">Start Time</Text>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    style={{
                      fontSize: 17,
                      color: isDark ? "#FFFFFF" : "#000000",
                      backgroundColor: "transparent",
                      border: "none",
                      outline: "none",
                      fontFamily: "inherit",
                      width: "100%",
                    }}
                  />
                </View>
              ) : (
                <AppPressable
                  className="flex-1 rounded-lg bg-gray-200/50 px-3 py-2 dark:bg-[#4D4D4D]/50"
                  onPress={() => setShowTimePicker({ type: "start" })}
                >
                  <Text className="text-[13px] text-gray-500 dark:text-[#A3A3A3]">Start Time</Text>
                  <Text className="text-[17px] text-black dark:text-white">
                    {formatTime12Hour(startTime)}
                  </Text>
                </AppPressable>
              )}

              <Text className="mx-4 text-[17px] text-gray-400 dark:text-[#A3A3A3]">–</Text>

              {Platform.OS === "web" ? (
                <View className="flex-1 rounded-lg bg-gray-200/50 px-3 py-2 dark:bg-[#4D4D4D]/50">
                  <Text className="text-[13px] text-gray-500 dark:text-[#A3A3A3]">End Time</Text>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    style={{
                      fontSize: 17,
                      color: isDark ? "#FFFFFF" : "#000000",
                      backgroundColor: "transparent",
                      border: "none",
                      outline: "none",
                      fontFamily: "inherit",
                      width: "100%",
                    }}
                  />
                </View>
              ) : (
                <AppPressable
                  className="flex-1 rounded-lg bg-gray-200/50 px-3 py-2 dark:bg-[#4D4D4D]/50"
                  onPress={() => setShowTimePicker({ type: "end" })}
                >
                  <Text className="text-[13px] text-gray-500 dark:text-[#A3A3A3]">End Time</Text>
                  <Text className="text-[17px] text-black dark:text-white">
                    {formatTime12Hour(endTime)}
                  </Text>
                </AppPressable>
              )}
            </View>
          </View>
        </>
      )}

      {!isEditing && schedule.overrides && schedule.overrides.length > 0 && (
        <>
          <Text className="mb-2 mt-4 text-[13px] font-medium text-gray-500 dark:text-[#A3A3A3]">
            Existing Overrides
          </Text>
          <View>
            {schedule.overrides.map((override, index) => (
              <AppPressable
                key={override.date}
                className="mb-2.5"
                onPress={() => onEditOverride?.(index)}
              >
                <View className="flex-row items-center justify-between rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 dark:border-[#4D4D4D] dark:bg-[#171717]">
                  <View className="flex-1">
                    <Text className="text-[15px] font-medium text-black dark:text-white">
                      {formatDateForDisplay(override.date ?? "")}
                    </Text>
                    {override.startTime === "00:00" && override.endTime === "00:00" ? (
                      <Text className="mt-0.5 text-[13px] text-red-500 dark:text-[#FF453A]">
                        Unavailable
                      </Text>
                    ) : (
                      <Text className="mt-0.5 text-[13px] text-gray-500 dark:text-[#A3A3A3]">
                        {formatTime12Hour(override.startTime ?? "00:00")} –{" "}
                        {formatTime12Hour(override.endTime ?? "00:00")}
                      </Text>
                    )}
                  </View>
                  <View className="flex-row items-center">
                    <AppPressable
                      className="rounded-full bg-red-50 p-2 dark:bg-[#FF453A]/10"
                      onPress={() => handleDeleteOverride(index)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                    </AppPressable>
                    <Ionicons
                      style={{ marginLeft: 12 }}
                      name="chevron-forward"
                      size={18}
                      color={isDark ? "#A3A3A3" : "#C7C7CC"}
                    />
                  </View>
                </View>
              </AppPressable>
            ))}
          </View>
        </>
      )}

      <FullScreenModal
        visible={!!showTimePicker}
        animationType={Platform.OS === "web" ? "fade" : "slide"}
        onRequestClose={() => setShowTimePicker(null)}
      >
        {Platform.OS === "web" ? (
          <TouchableOpacity
            className="flex-1 items-center justify-center bg-black/50 p-4"
            activeOpacity={1}
            onPress={() => setShowTimePicker(null)}
          >
            <TouchableOpacity
              className="max-h-[80%] w-full max-w-[500px] overflow-hidden rounded-2xl bg-white p-2 dark:bg-[#171717]"
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={shadows.xl()}
            >
              {renderTimePickerContent()}
            </TouchableOpacity>
          </TouchableOpacity>
        ) : (
          <View className="flex-1 bg-white p-2 dark:bg-[#171717]">{renderTimePickerContent()}</View>
        )}
      </FullScreenModal>
    </ScrollView>
  );
});

export default EditAvailabilityOverrideScreen;
