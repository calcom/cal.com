import { DatePicker, Host } from "@expo/ui/swift-ui";
import { Ionicons } from "@expo/vector-icons";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { Alert, ScrollView, Switch, Text, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppPressable } from "@/components/AppPressable";
import { useUpdateSchedule } from "@/hooks/useSchedules";
import type { Schedule } from "@/services/calcom";
import type { ScheduleAvailability } from "@/services/types";
import { showErrorAlert } from "@/utils/alerts";
import { getColors } from "@/constants/colors";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Map day names to numbers
const DAY_NAME_TO_NUMBER: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
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

// Parse availability from schedule for a specific day
const parseAvailabilityForDay = (
  schedule: Schedule | null,
  dayIndex: number
): ScheduleAvailability[] => {
  if (!schedule) return [];

  const slots: ScheduleAvailability[] = [];
  const availabilityArray = schedule.availability;

  if (availabilityArray && Array.isArray(availabilityArray)) {
    availabilityArray.forEach((slot) => {
      let days: number[] = [];
      if (Array.isArray(slot.days)) {
        days = slot.days
          .map((day) => {
            if (typeof day === "string" && DAY_NAME_TO_NUMBER[day] !== undefined) {
              return DAY_NAME_TO_NUMBER[day];
            }
            if (typeof day === "string") {
              const parsed = parseInt(day, 10);
              if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 6) {
                return parsed;
              }
            }
            if (typeof day === "number" && day >= 0 && day <= 6) {
              return day;
            }
            return null;
          })
          .filter((day): day is number => day !== null);
      }

      if (days.includes(dayIndex)) {
        const startTime = slot.startTime ?? "09:00:00";
        const endTime = slot.endTime ?? "17:00:00";
        slots.push({
          days: [dayIndex.toString()],
          startTime,
          endTime,
        });
      }
    });
  }

  return slots;
};

// Build full availability array from schedule, replacing the specific day
const buildFullAvailability = (
  schedule: Schedule,
  dayIndex: number,
  newSlots: ScheduleAvailability[]
): { days: string[]; startTime: string; endTime: string }[] => {
  const result: { days: string[]; startTime: string; endTime: string }[] = [];

  // First, add all existing slots except for the target day
  const existingArray = schedule.availability;
  if (existingArray && Array.isArray(existingArray)) {
    existingArray.forEach((slot) => {
      let days: number[] = [];
      if (Array.isArray(slot.days)) {
        days = slot.days
          .map((day) => {
            if (typeof day === "string" && DAY_NAME_TO_NUMBER[day] !== undefined) {
              return DAY_NAME_TO_NUMBER[day];
            }
            if (typeof day === "string") {
              const parsed = parseInt(day, 10);
              if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 6) {
                return parsed;
              }
            }
            if (typeof day === "number" && day >= 0 && day <= 6) {
              return day;
            }
            return null;
          })
          .filter((day): day is number => day !== null);
      }

      // Remove the target day from this slot's days
      const otherDays = days.filter((d) => d !== dayIndex);
      if (otherDays.length > 0) {
        otherDays.forEach((d) => {
          result.push({
            days: [DAYS[d]],
            startTime: (slot.startTime ?? "09:00:00").substring(0, 5),
            endTime: (slot.endTime ?? "17:00:00").substring(0, 5),
          });
        });
      }
    });
  }

  // Add the new slots for the target day
  newSlots.forEach((slot) => {
    result.push({
      days: [DAYS[dayIndex]],
      startTime: slot.startTime.substring(0, 5),
      endTime: slot.endTime.substring(0, 5),
    });
  });

  return result;
};

export interface EditAvailabilityDayScreenProps {
  schedule: Schedule | null;
  dayIndex: number;
  onSuccess: () => void;
  onSavingChange?: (isSaving: boolean) => void;
  transparentBackground?: boolean;
}

export interface EditAvailabilityDayScreenHandle {
  submit: () => void;
}

export const EditAvailabilityDayScreen = forwardRef<
  EditAvailabilityDayScreenHandle,
  EditAvailabilityDayScreenProps
>(function EditAvailabilityDayScreen(
  { schedule, dayIndex, onSuccess, onSavingChange, transparentBackground = false },
  ref
) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = getColors(isDark);
  const backgroundColor = transparentBackground
    ? "transparent"
    : isDark
      ? theme.background
      : theme.backgroundMuted;

  // Use mutation hook for cache-synchronized updates
  const { mutate: updateSchedule, isPending: isMutating } = useUpdateSchedule();

  const [isEnabled, setIsEnabled] = useState(false);
  const [slots, setSlots] = useState<{ startTime: Date; endTime: Date }[]>([]);

  const dayName = DAYS[dayIndex] || "Day";

  // Initialize from schedule
  useEffect(() => {
    if (schedule) {
      const daySlots = parseAvailabilityForDay(schedule, dayIndex);
      if (daySlots.length > 0) {
        setIsEnabled(true);
        setSlots(
          daySlots.map((s) => ({
            startTime: timeStringToDate(s.startTime.substring(0, 5)),
            endTime: timeStringToDate(s.endTime.substring(0, 5)),
          }))
        );
      } else {
        setIsEnabled(false);
        setSlots([
          {
            startTime: timeStringToDate("09:00"),
            endTime: timeStringToDate("17:00"),
          },
        ]);
      }
    }
  }, [schedule, dayIndex]);

  // Notify parent of saving state
  useEffect(() => {
    onSavingChange?.(isMutating);
  }, [isMutating, onSavingChange]);

  const handleToggle = useCallback(
    (value: boolean) => {
      setIsEnabled(value);
      if (value && slots.length === 0) {
        setSlots([
          {
            startTime: timeStringToDate("09:00"),
            endTime: timeStringToDate("17:00"),
          },
        ]);
      }
    },
    [slots.length]
  );

  const handleAddSlot = useCallback(() => {
    setSlots((prev) => [
      ...prev,
      {
        startTime: timeStringToDate("09:00"),
        endTime: timeStringToDate("17:00"),
      },
    ]);
  }, []);

  const handleRemoveSlot = useCallback((index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleStartTimeChange = useCallback((index: number, date: Date) => {
    setSlots((prev) => {
      const newSlots = [...prev];
      newSlots[index] = { ...newSlots[index], startTime: date };
      return newSlots;
    });
  }, []);

  const handleEndTimeChange = useCallback((index: number, date: Date) => {
    setSlots((prev) => {
      const newSlots = [...prev];
      newSlots[index] = { ...newSlots[index], endTime: date };
      return newSlots;
    });
  }, []);

  const handleSubmit = useCallback(() => {
    if (!schedule || isMutating) return;

    // Validate all slots have end time after start time
    // Compare time strings to avoid issues with Date object day components
    if (isEnabled) {
      for (const slot of slots) {
        const startTimeStr = dateToTimeString(slot.startTime);
        const endTimeStr = dateToTimeString(slot.endTime);
        if (endTimeStr <= startTimeStr) {
          Alert.alert("Error", "End time must be after start time for all slots");
          return;
        }
      }
    }

    // Build availability slots for this day
    const daySlots: ScheduleAvailability[] = isEnabled
      ? slots.map((s) => ({
          days: [dayIndex.toString()],
          startTime: `${dateToTimeString(s.startTime)}:00`,
          endTime: `${dateToTimeString(s.endTime)}:00`,
        }))
      : [];

    const fullAvailability = buildFullAvailability(schedule, dayIndex, daySlots);

    updateSchedule(
      { id: schedule.id, updates: { availability: fullAvailability } },
      {
        onSuccess: () => {
          Alert.alert("Success", `${dayName} updated successfully`, [
            { text: "OK", onPress: onSuccess },
          ]);
        },
        onError: () => {
          showErrorAlert("Error", "Failed to update schedule. Please try again.");
        },
      }
    );
  }, [schedule, dayIndex, dayName, isEnabled, slots, onSuccess, isMutating, updateSchedule]);

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
      <View className="flex-1 items-center justify-center" style={{ backgroundColor }}>
        <Text className="text-[#A3A3A3]">No schedule data</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor }}
      contentContainerStyle={{
        padding: 16,
        paddingBottom: insets.bottom + 16,
      }}
      showsVerticalScrollIndicator={!transparentBackground}
    >
      {/* Enable/Disable Toggle */}
      <View
        className={`mb-4 flex-row items-center justify-between rounded-xl px-4 py-3.5 ${
          transparentBackground
            ? isDark
              ? "border border-[#4D4D4D]/40 bg-[#171717]/80"
              : "border border-gray-300/40 bg-white/60"
            : isDark
              ? "bg-[#171717]"
              : "bg-white"
        }`}
      >
        <Text className="text-[17px] font-medium text-black dark:text-white">
          Available on {dayName}
        </Text>
        <Switch
          value={isEnabled}
          onValueChange={handleToggle}
          trackColor={{
            false: isDark ? theme.backgroundEmphasis : "#E5E5EA",
            true: isDark ? "#34C759" : "#000000",
          }}
          thumbColor="#FFFFFF"
        />
      </View>

      {/* Time Slots */}
      {isEnabled && (
        <>
          <Text className="mb-2 px-1 text-[13px] font-medium text-[#A3A3A3]">Time Slots</Text>

          {slots.map((slot, index) => (
            <View
              key={`slot-${slot.startTime}-${slot.endTime}-${index}`}
              className={`mb-3 rounded-xl px-4 py-3 ${
                transparentBackground
                  ? isDark
                    ? "border border-[#4D4D4D]/40 bg-[#171717]/80"
                    : "border border-gray-300/40 bg-white/60"
                  : isDark
                    ? "bg-[#171717]"
                    : "bg-white"
              }`}
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-[15px] font-medium text-[#A3A3A3]">Slot {index + 1}</Text>
                {slots.length > 1 && (
                  <AppPressable onPress={() => handleRemoveSlot(index)} className="p-1">
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                  </AppPressable>
                )}
              </View>

              <View className="mt-3 flex-row items-center">
                <View className="flex-1">
                  <Text className="mb-1 text-[13px] text-[#A3A3A3]">Start</Text>
                  <View className="flex-row items-center">
                    <Host matchContents>
                      <DatePicker
                        onDateChange={(date) => handleStartTimeChange(index, date)}
                        displayedComponents={["hourAndMinute"]}
                        selection={slot.startTime}
                      />
                    </Host>
                  </View>
                </View>

                <Text className="mx-3 text-[17px] text-[#A3A3A3]">–</Text>

                <View className="flex-1">
                  <Text className="mb-1 text-[13px] text-[#A3A3A3]">End</Text>
                  <View className="flex-row items-center">
                    <Host matchContents>
                      <DatePicker
                        onDateChange={(date) => handleEndTimeChange(index, date)}
                        displayedComponents={["hourAndMinute"]}
                        selection={slot.endTime}
                      />
                    </Host>
                  </View>
                </View>
              </View>
            </View>
          ))}

          {/* Add Slot Button */}
          <AppPressable
            onPress={handleAddSlot}
            className={`flex-row items-center justify-center rounded-xl py-3.5 ${
              transparentBackground
                ? isDark
                  ? "border border-dashed border-[#4D4D4D]/60 bg-[#171717]/60"
                  : "border border-dashed border-gray-300/60 bg-white/40"
                : isDark
                  ? "border border-dashed border-[#4D4D4D] bg-[#171717]"
                  : "border border-dashed border-[#C7C7CC] bg-white"
            }`}
          >
            <Ionicons name="add-circle" size={20} color="#007AFF" />
            <Text className="ml-2 text-[15px] font-medium text-[#007AFF]">Add Time Slot</Text>
          </AppPressable>
        </>
      )}

      {/* Unavailable Message */}
      {!isEnabled && (
        <View
          className={`items-center rounded-xl px-4 py-8 ${
            transparentBackground
              ? isDark
                ? "border border-[#4D4D4D]/40 bg-[#171717]/80"
                : "border border-gray-300/40 bg-white/60"
              : isDark
                ? "bg-[#171717]"
                : "bg-white"
          }`}
        >
          <Ionicons name="moon-outline" size={40} color="#A3A3A3" />
          <Text className="mt-3 text-center text-[17px] text-[#A3A3A3]">
            You are unavailable on {dayName}
          </Text>
          <Text className="mt-1 text-center text-[15px] text-[#C7C7CC]">
            Toggle on to set availability
          </Text>
        </View>
      )}
    </ScrollView>
  );
});

export default EditAvailabilityDayScreen;
