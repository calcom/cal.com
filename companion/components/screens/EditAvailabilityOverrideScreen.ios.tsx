import { DatePicker, Host } from "@expo/ui/swift-ui";
import { Ionicons } from "@expo/vector-icons";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { Alert, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Schedule } from "@/services/calcom";
import { CalComAPIService } from "@/services/calcom";
import { showErrorAlert, showSuccessAlert } from "@/utils/alerts";

// Convert 24-hour time to 12-hour format with AM/PM
const formatTime12Hour = (time24: string): string => {
  const [hours, minutes] = time24.split(":");
  const hour = parseInt(hours, 10);
  const min = minutes || "00";
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${min} ${period}`;
};

// Parse time string to Date object (for DatePicker)
const timeStringToDate = (timeStr: string): Date => {
  const [hours, minutes] = timeStr.split(":");
  const date = new Date();
  date.setHours(parseInt(hours, 10));
  date.setMinutes(parseInt(minutes || "0", 10));
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date;
};

// Convert Date to time string (HH:mm)
const dateToTimeString = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

// Convert Date to date string (YYYY-MM-DD)
const dateToDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Parse date string to Date object
const dateStringToDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
};

// Format date for display
const formatDateForDisplay = (date: Date): string => {
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
  {
    schedule,
    overrideIndex,
    onSuccess,
    onSavingChange,
    onEditOverride,
    transparentBackground = false,
  },
  ref
) {
  const insets = useSafeAreaInsets();
  const backgroundStyle = transparentBackground ? "bg-transparent" : "bg-[#F2F2F7]";

  const isEditing = overrideIndex !== undefined;

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [startTime, setStartTime] = useState<Date>(timeStringToDate("09:00"));
  const [endTime, setEndTime] = useState<Date>(timeStringToDate("17:00"));
  const [isSaving, setIsSaving] = useState(false);

  // Initialize from existing override if editing
  useEffect(() => {
    if (schedule && isEditing && schedule.overrides) {
      const override = schedule.overrides[overrideIndex];
      if (override) {
        setSelectedDate(dateStringToDate(override.date ?? ""));
        const start = override.startTime ?? "00:00";
        const end = override.endTime ?? "00:00";
        setIsUnavailable(start === "00:00" && end === "00:00");
        setStartTime(timeStringToDate(start === "00:00" ? "09:00" : start));
        setEndTime(timeStringToDate(end === "00:00" ? "17:00" : end));
      }
    }
  }, [schedule, isEditing, overrideIndex]);

  // Notify parent of saving state
  useEffect(() => {
    onSavingChange?.(isSaving);
  }, [isSaving, onSavingChange]);

  const handleDateChange = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  const handleStartTimeChange = useCallback((date: Date) => {
    setStartTime(date);
  }, []);

  const handleEndTimeChange = useCallback((date: Date) => {
    setEndTime(date);
  }, []);

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
        showSuccessAlert("Success", successMessage);
        onSuccess();
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
      const dateDisplay = formatDateForDisplay(dateStringToDate(override?.date ?? ""));

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

    const dateStr = dateToDateString(selectedDate);

    // Validate end time is after start time (only when not marking as unavailable)
    // Compare time strings to avoid issues with Date object day components
    const startTimeStr = dateToTimeString(startTime);
    const endTimeStr = dateToTimeString(endTime);
    if (!isUnavailable && endTimeStr <= startTimeStr) {
      showErrorAlert("Error", "End time must be after start time");
      return;
    }

    // Build the new override
    const newOverride = {
      date: dateStr,
      startTime: isUnavailable ? "00:00" : dateToTimeString(startTime),
      endTime: isUnavailable ? "00:00" : dateToTimeString(endTime),
    };

    // Build new overrides array
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
      // Update existing override
      newOverrides[overrideIndex] = newOverride;
    } else {
      // Check if date already exists
      const existingIndex = newOverrides.findIndex((o) => o.date === dateStr);
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
      // Add new override
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

  // Expose submit to parent via ref
  useImperativeHandle(
    ref,
    () => ({
      submit: handleSubmit,
    }),
    [handleSubmit]
  );

  if (!schedule) {
    return (
      <View className={`flex-1 items-center justify-center ${backgroundStyle}`}>
        <Text className="text-[#8E8E93]">No schedule data</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className={`flex-1 ${backgroundStyle}`}
      contentContainerStyle={{
        padding: 16,
        paddingBottom: insets.bottom + 16,
      }}
      showsVerticalScrollIndicator={!transparentBackground}
    >
      {/* Date Picker */}
      <Text className="mb-2 px-1 text-[13px] font-medium text-[#8E8E93]">Date</Text>
      <View
        className={`mb-4 rounded-xl px-4 py-3.5 ${
          transparentBackground ? "border border-gray-300/40 bg-white/60" : "bg-white"
        }`}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="mr-3 h-9 w-9 items-center justify-center rounded-lg bg-[#007AFF]/10">
              <Ionicons name="calendar" size={20} color="#007AFF" />
            </View>
            <Text className="text-[17px] text-black">{formatDateForDisplay(selectedDate)}</Text>
          </View>
        </View>
        <View className="mt-3">
          <Host matchContents>
            <DatePicker
              onDateChange={handleDateChange}
              displayedComponents={["date"]}
              selection={selectedDate}
            />
          </Host>
        </View>
      </View>

      {/* Unavailable Toggle */}
      <View
        className={`mb-4 flex-row items-center justify-between rounded-xl px-4 py-3.5 ${
          transparentBackground ? "border border-gray-300/40 bg-white/60" : "bg-white"
        }`}
      >
        <View className="flex-row items-center">
          <View className="mr-3 h-9 w-9 items-center justify-center rounded-lg bg-[#FF3B30]/10">
            <Ionicons name="moon-outline" size={20} color="#FF3B30" />
          </View>
          <View>
            <Text className="text-[17px] text-black">Mark as unavailable</Text>
            <Text className="text-[13px] text-[#8E8E93]">Block this entire day</Text>
          </View>
        </View>
        <Switch
          value={isUnavailable}
          onValueChange={setIsUnavailable}
          trackColor={{ false: "#E5E5EA", true: "#000000" }}
          thumbColor="#fff"
        />
      </View>

      {/* Time Range (only when available) */}
      {!isUnavailable && (
        <>
          <Text className="mb-2 px-1 text-[13px] font-medium text-[#8E8E93]">Available Hours</Text>
          <View
            className={`mb-4 rounded-xl px-4 py-3.5 ${
              transparentBackground ? "border border-gray-300/40 bg-white/60" : "bg-white"
            }`}
          >
            <View className="flex-row items-center">
              <View className="flex-1">
                <Text className="mb-2 text-[13px] text-[#8E8E93]">Start Time</Text>
                <Host matchContents>
                  <DatePicker
                    onDateChange={handleStartTimeChange}
                    displayedComponents={["hourAndMinute"]}
                    selection={startTime}
                  />
                </Host>
              </View>

              <Text className="mx-4 text-[17px] text-[#8E8E93]">–</Text>

              <View className="flex-1">
                <Text className="mb-2 text-[13px] text-[#8E8E93]">End Time</Text>
                <Host matchContents>
                  <DatePicker
                    onDateChange={handleEndTimeChange}
                    displayedComponents={["hourAndMinute"]}
                    selection={endTime}
                  />
                </Host>
              </View>
            </View>
          </View>
        </>
      )}

      {/* Existing Overrides (if any) */}
      {!isEditing && schedule.overrides && schedule.overrides.length > 0 && (
        <>
          <Text className="mb-2 mt-4 px-1 text-[13px] font-medium text-[#8E8E93]">
            Existing Overrides
          </Text>
          <View
            className={`overflow-hidden rounded-xl ${
              transparentBackground ? "border border-gray-300/40 bg-white/60" : "bg-white"
            }`}
          >
            {schedule.overrides.map((override, index) => (
              <Pressable
                key={override.date}
                className={`flex-row items-center justify-between px-4 py-3 ${
                  index > 0 ? "border-t border-[#E5E5EA]" : ""
                }`}
                onPress={() => onEditOverride?.(index)}
              >
                <View className="flex-1">
                  <Text className="text-[15px] text-black">
                    {formatDateForDisplay(dateStringToDate(override.date ?? ""))}
                  </Text>
                  {override.startTime === "00:00" && override.endTime === "00:00" ? (
                    <Text className="text-[13px] text-[#FF3B30]">Unavailable</Text>
                  ) : (
                    <Text className="text-[13px] text-[#8E8E93]">
                      {formatTime12Hour(override.startTime ?? "00:00")} –{" "}
                      {formatTime12Hour(override.endTime ?? "00:00")}
                    </Text>
                  )}
                </View>
                <View className="flex-row items-center">
                  <Pressable
                    className="rounded-full bg-[#FF3B30]/10 p-2"
                    onPress={() => handleDeleteOverride(index)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                  </Pressable>
                  <Pressable
                    className="ml-3 rounded-full bg-[#8E8E93]/10 p-2"
                    onPress={() => onEditOverride?.(index)}
                  >
                    <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
                  </Pressable>
                </View>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
});

export default EditAvailabilityOverrideScreen;
