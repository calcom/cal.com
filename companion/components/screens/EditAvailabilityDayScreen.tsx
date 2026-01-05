import { Ionicons } from "@expo/vector-icons";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { Alert, ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppPressable } from "@/components/AppPressable";
import { FullScreenModal } from "@/components/FullScreenModal";
import type { Schedule } from "@/services/calcom";
import { CalComAPIService } from "@/services/calcom";
import type { ScheduleAvailability } from "@/services/types";
import { showErrorAlert } from "@/utils/alerts";

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
>(function EditAvailabilityDayScreen({ schedule, dayIndex, onSuccess, onSavingChange }, ref) {
  const insets = useSafeAreaInsets();

  const [isEnabled, setIsEnabled] = useState(false);
  const [slots, setSlots] = useState<{ startTime: string; endTime: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState<{
    slotIndex: number;
    type: "start" | "end";
  } | null>(null);

  const dayName = DAYS[dayIndex] || "Day";

  // Initialize from schedule
  useEffect(() => {
    if (schedule) {
      const daySlots = parseAvailabilityForDay(schedule, dayIndex);
      if (daySlots.length > 0) {
        setIsEnabled(true);
        setSlots(
          daySlots.map((s) => ({
            startTime: s.startTime.substring(0, 5),
            endTime: s.endTime.substring(0, 5),
          }))
        );
      } else {
        setIsEnabled(false);
        setSlots([{ startTime: "09:00", endTime: "17:00" }]);
      }
    }
  }, [schedule, dayIndex]);

  // Notify parent of saving state
  useEffect(() => {
    onSavingChange?.(isSaving);
  }, [isSaving, onSavingChange]);

  const handleToggle = useCallback(
    (value: boolean) => {
      setIsEnabled(value);
      if (value && slots.length === 0) {
        setSlots([{ startTime: "09:00", endTime: "17:00" }]);
      }
    },
    [slots.length]
  );

  const handleAddSlot = useCallback(() => {
    setSlots((prev) => [...prev, { startTime: "09:00", endTime: "17:00" }]);
  }, []);

  const handleRemoveSlot = useCallback((index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleTimeSelect = useCallback(
    (time: string) => {
      if (!showTimePicker) return;

      setSlots((prev) => {
        const newSlots = [...prev];
        if (showTimePicker.type === "start") {
          newSlots[showTimePicker.slotIndex] = {
            ...newSlots[showTimePicker.slotIndex],
            startTime: time,
          };
        } else {
          newSlots[showTimePicker.slotIndex] = {
            ...newSlots[showTimePicker.slotIndex],
            endTime: time,
          };
        }
        return newSlots;
      });
      setShowTimePicker(null);
    },
    [showTimePicker]
  );

  const handleSubmit = useCallback(async () => {
    if (!schedule || isSaving) return;

    // Validate all slots have end time after start time
    if (isEnabled) {
      for (const slot of slots) {
        if (slot.endTime <= slot.startTime) {
          Alert.alert("Error", "End time must be after start time for all slots");
          return;
        }
      }
    }

    const daySlots: ScheduleAvailability[] = isEnabled
      ? slots.map((s) => ({
          days: [dayIndex.toString()],
          startTime: `${s.startTime}:00`,
          endTime: `${s.endTime}:00`,
        }))
      : [];

    const fullAvailability = buildFullAvailability(schedule, dayIndex, daySlots);

    setIsSaving(true);
    try {
      await CalComAPIService.updateSchedule(schedule.id, {
        availability: fullAvailability,
      });
      Alert.alert("Success", `${dayName} updated successfully`, [
        { text: "OK", onPress: onSuccess },
      ]);
      setIsSaving(false);
    } catch {
      showErrorAlert("Error", "Failed to update schedule. Please try again.");
      setIsSaving(false);
    }
  }, [schedule, dayIndex, dayName, isEnabled, slots, onSuccess, isSaving]);

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
      {/* Enable/Disable Toggle */}
      <View className="mb-4 flex-row items-center justify-between rounded-lg border border-gray-200 px-4 py-3.5">
        <Text className="text-[17px] font-medium text-black">Available on {dayName}</Text>
        <Switch
          value={isEnabled}
          onValueChange={handleToggle}
          trackColor={{ false: "#E5E5EA", true: "#34C759" }}
          thumbColor="#fff"
        />
      </View>

      {/* Time Slots */}
      {isEnabled && (
        <>
          <Text className="mb-2 text-[13px] font-medium text-gray-500">Time Slots</Text>

          {slots.map((slot, index) => (
            <View
              key={`slot-${slot.startTime}-${slot.endTime}-${index}`}
              className="mb-3 rounded-lg border border-gray-200 px-4 py-3"
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-[15px] font-medium text-gray-500">Slot {index + 1}</Text>
                {slots.length > 1 && (
                  <AppPressable onPress={() => handleRemoveSlot(index)} className="p-1">
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                  </AppPressable>
                )}
              </View>

              <View className="mt-3 flex-row items-center">
                <AppPressable
                  className="flex-1 rounded-lg bg-gray-100 px-3 py-2"
                  onPress={() => setShowTimePicker({ slotIndex: index, type: "start" })}
                >
                  <Text className="text-[13px] text-gray-500">Start</Text>
                  <Text className="text-[17px] text-black">{formatTime12Hour(slot.startTime)}</Text>
                </AppPressable>

                <Text className="mx-3 text-[17px] text-gray-400">–</Text>

                <AppPressable
                  className="flex-1 rounded-lg bg-gray-100 px-3 py-2"
                  onPress={() => setShowTimePicker({ slotIndex: index, type: "end" })}
                >
                  <Text className="text-[13px] text-gray-500">End</Text>
                  <Text className="text-[17px] text-black">{formatTime12Hour(slot.endTime)}</Text>
                </AppPressable>
              </View>
            </View>
          ))}

          {/* Add Slot Button */}
          <AppPressable
            onPress={handleAddSlot}
            className="flex-row items-center justify-center rounded-lg border border-dashed border-gray-300 py-3.5"
          >
            <Ionicons name="add-circle" size={20} color="#007AFF" />
            <Text className="ml-2 text-[15px] font-medium text-[#007AFF]">Add Time Slot</Text>
          </AppPressable>
        </>
      )}

      {/* Unavailable Message */}
      {!isEnabled && (
        <View className="items-center rounded-lg border border-gray-200 px-4 py-8">
          <Ionicons name="moon-outline" size={40} color="#8E8E93" />
          <Text className="mt-3 text-center text-[17px] text-gray-500">
            You are unavailable on {dayName}
          </Text>
          <Text className="mt-1 text-center text-[15px] text-gray-400">
            Toggle on to set availability
          </Text>
        </View>
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
              const slotIndex = showTimePicker?.slotIndex ?? 0;
              const currentTime =
                showTimePicker?.type === "start"
                  ? slots[slotIndex]?.startTime
                  : slots[slotIndex]?.endTime;
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

export default EditAvailabilityDayScreen;
