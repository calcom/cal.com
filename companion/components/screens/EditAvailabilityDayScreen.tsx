import { Ionicons } from "@expo/vector-icons";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppPressable } from "@/components/AppPressable";
import { FullScreenModal } from "@/components/FullScreenModal";
import { useUpdateSchedule } from "@/hooks/useSchedules";
import type { Schedule } from "@/services/calcom";
import type { ScheduleAvailability } from "@/services/types";
import { showErrorAlert, showSuccessAlert } from "@/utils/alerts";
import { shadows } from "@/utils/shadows";

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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const colors = {
    background: isDark ? "#000000" : "#FFFFFF",
    backgroundSecondary: isDark ? "#171717" : "#F9FAFB",
    cardBackground: isDark ? "#171717" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#000000",
    textSecondary: isDark ? "#A3A3A3" : "#6B7280",
    border: isDark ? "#4D4D4D" : "#E5E5EA",
    iconColor: isDark ? "#FFFFFF" : "#A3A3A3",
  };

  // Use mutation hook for cache-synchronized updates
  const { mutate: updateSchedule, isPending: isMutating } = useUpdateSchedule();

  const [isEnabled, setIsEnabled] = useState(false);
  const [slots, setSlots] = useState<{ startTime: string; endTime: string }[]>([]);
  const [showTimePicker, setShowTimePicker] = useState<{
    slotIndex: number;
    type: "start" | "end";
  } | null>(null);

  const dayName = DAYS[dayIndex] || "Day";

  // Render modal content
  const renderTimePickerContent = () => (
    <>
      <View className="flex-row items-center justify-between border-b border-gray-200 px-4 py-4 dark:border-[#4D4D4D]">
        <Text className="text-[17px] font-semibold text-black dark:text-white">
          Select {showTimePicker?.type === "start" ? "Start" : "End"} Time
        </Text>
        <AppPressable onPress={() => setShowTimePicker(null)}>
          <Ionicons name="close" size={24} color={colors.iconColor} />
        </AppPressable>
      </View>
      <ScrollView className="px-4 py-3">
        {TIME_OPTIONS.map((time) => {
          const slotIndex = showTimePicker?.slotIndex ?? 0;
          const currentTime =
            showTimePicker?.type === "start"
              ? slots[slotIndex]?.startTime
              : slots[slotIndex]?.endTime;
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
    onSavingChange?.(isMutating);
  }, [isMutating, onSavingChange]);

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

  const handleSubmit = useCallback(() => {
    if (!schedule || isMutating) return;

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

    updateSchedule(
      { id: schedule.id, updates: { availability: fullAvailability } },
      {
        onSuccess: () => {
          showSuccessAlert("Success", `${dayName} updated successfully`);
          onSuccess();
        },
        onError: () => {
          showErrorAlert("Error", "Failed to update schedule. Please try again.");
        },
      }
    );
  }, [schedule, dayIndex, dayName, isEnabled, slots, onSuccess, isMutating, updateSchedule]);

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
      <View className="mb-4 flex-row items-center justify-between rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3.5 dark:border-[#4D4D4D] dark:bg-[#171717]">
        <Text className="text-[17px] font-medium text-black dark:text-white">
          Available on {dayName}
        </Text>
        <Switch
          value={isEnabled}
          onValueChange={handleToggle}
          trackColor={{
            false: isDark ? "#404040" : "#E5E5EA",
            true: isDark ? "#34C759" : "#000000",
          }}
          thumbColor="#FFFFFF"
        />
      </View>

      {isEnabled && (
        <>
          <Text className="mb-2 text-[13px] font-medium text-gray-500 dark:text-[#A3A3A3]">
            Time Slots
          </Text>

          {slots.map((slot, index) => (
            <View
              key={`slot-${slot.startTime}-${slot.endTime}-${index}`}
              className="mb-3 rounded-xl border-2 border-gray-200 bg-white px-4 py-4 dark:border-[#4D4D4D] dark:bg-[#171717]"
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-[15px] font-medium text-gray-500 dark:text-[#A3A3A3]">
                  Slot {index + 1}
                </Text>
                {slots.length > 1 && (
                  <AppPressable
                    onPress={() => handleRemoveSlot(index)}
                    className="rounded-full bg-red-50 p-2 dark:bg-[#FF453A]/20"
                  >
                    <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                  </AppPressable>
                )}
              </View>

              <View className="mt-3 flex-row items-center">
                {Platform.OS === "web" ? (
                  <View className="flex-1 rounded-lg bg-gray-50 px-3 py-2.5 border border-gray-100 dark:bg-[#2C2C2E] dark:border-[#4D4D4D]">
                    <Text className="text-[13px] text-gray-500 dark:text-[#A3A3A3]">Start</Text>
                    <input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => {
                        const newSlots = [...slots];
                        newSlots[index] = { ...newSlots[index], startTime: e.target.value };
                        setSlots(newSlots);
                      }}
                      style={{
                        fontSize: 17,
                        fontWeight: 500,
                        color: colors.text,
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
                    className="flex-1 rounded-lg bg-gray-50 px-3 py-2.5 border border-gray-100 dark:bg-[#2C2C2E] dark:border-[#4D4D4D]"
                    onPress={() => setShowTimePicker({ slotIndex: index, type: "start" })}
                  >
                    <Text className="text-[13px] text-gray-500 dark:text-[#A3A3A3]">Start</Text>
                    <Text className="text-[17px] font-medium text-black dark:text-white">
                      {formatTime12Hour(slot.startTime)}
                    </Text>
                  </AppPressable>
                )}

                <Text className="mx-3 text-[17px] text-gray-400 dark:text-[#A3A3A3]">–</Text>

                {Platform.OS === "web" ? (
                  <View className="flex-1 rounded-lg bg-gray-50 px-3 py-2.5 border border-gray-100 dark:bg-[#2C2C2E] dark:border-[#4D4D4D]">
                    <Text className="text-[13px] text-gray-500 dark:text-[#A3A3A3]">End</Text>
                    <input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => {
                        const newSlots = [...slots];
                        newSlots[index] = { ...newSlots[index], endTime: e.target.value };
                        setSlots(newSlots);
                      }}
                      style={{
                        fontSize: 17,
                        fontWeight: 500,
                        color: colors.text,
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
                    className="flex-1 rounded-lg bg-gray-50 px-3 py-2.5 border border-gray-100 dark:bg-[#2C2C2E] dark:border-[#4D4D4D]"
                    onPress={() => setShowTimePicker({ slotIndex: index, type: "end" })}
                  >
                    <Text className="text-[13px] text-gray-500 dark:text-[#A3A3A3]">End</Text>
                    <Text className="text-[17px] font-medium text-black dark:text-white">
                      {formatTime12Hour(slot.endTime)}
                    </Text>
                  </AppPressable>
                )}
              </View>
            </View>
          ))}

          <AppPressable onPress={handleAddSlot}>
            <View className="flex-row items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 py-4 dark:border-[#4D4D4D] dark:bg-[#171717]">
              <Ionicons name="add-circle" size={22} color="#007AFF" />
              <Text className="ml-2 text-[17px] font-medium text-[#007AFF]">Add Time Slot</Text>
            </View>
          </AppPressable>
        </>
      )}

      {!isEnabled && (
        <View className="items-center rounded-xl border-2 border-dashed border-gray-200 px-4 py-12 dark:border-[#4D4D4D] dark:bg-[#171717]">
          <View className="items-center justify-center rounded-full bg-gray-50 p-4 dark:bg-[#2C2C2E]">
            <Ionicons name="moon-outline" size={32} color={colors.textSecondary} />
          </View>
          <Text className="mt-4 text-center text-[17px] font-medium text-gray-900 dark:text-white">
            Unavailable
          </Text>
          <Text className="mt-1 text-center text-[15px] text-gray-500 dark:text-[#A3A3A3]">
            You are currently unavailable on {dayName}.{"\n"}Toggle the switch above to add hours.
          </Text>
        </View>
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

export default EditAvailabilityDayScreen;
