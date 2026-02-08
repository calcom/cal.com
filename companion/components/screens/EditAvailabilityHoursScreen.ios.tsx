import { Ionicons } from "@expo/vector-icons";
import { forwardRef } from "react";
import { ScrollView, Text, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppPressable } from "@/components/AppPressable";
import type { Schedule } from "@/services/calcom";
import type { ScheduleAvailability } from "@/services/types";
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

// Convert 24-hour time to 12-hour format with AM/PM
const formatTime12Hour = (time24: string): string => {
  const [hours, minutes] = time24.split(":");
  const hour = parseInt(hours, 10);
  const min = minutes || "00";
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const hour12Padded = hour12.toString().padStart(2, "0");
  return `${hour12Padded}:${min} ${period}`;
};

// Parse availability from schedule
const parseAvailability = (schedule: Schedule | null): Record<number, ScheduleAvailability[]> => {
  if (!schedule) return {};

  const availabilityMap: Record<number, ScheduleAvailability[]> = {};
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

      days.forEach((day) => {
        if (!availabilityMap[day]) {
          availabilityMap[day] = [];
        }
        const startTime = slot.startTime ?? "09:00:00";
        const endTime = slot.endTime ?? "17:00:00";
        availabilityMap[day].push({
          days: [day.toString()],
          startTime,
          endTime,
        });
      });
    });
  }

  return availabilityMap;
};

export interface EditAvailabilityHoursScreenProps {
  schedule: Schedule | null;
  onDayPress: (dayIndex: number) => void;
  transparentBackground?: boolean;
}

export const EditAvailabilityHoursScreen = forwardRef<unknown, EditAvailabilityHoursScreenProps>(
  function EditAvailabilityHoursScreen(
    { schedule, onDayPress, transparentBackground = false },
    _ref
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

    const availability = parseAvailability(schedule);

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
        <Text className="mb-3 px-1 text-[13px] font-medium text-[#A3A3A3]">
          Tap a day to edit its hours
        </Text>

        <View
          className={`overflow-hidden rounded-xl ${
            transparentBackground
              ? isDark
                ? "border border-[#4D4D4D]/40 bg-[#171717]/80"
                : "border border-gray-300/40 bg-white/60"
              : isDark
                ? "bg-[#171717]"
                : "bg-white"
          }`}
        >
          {DAYS.map((day, dayIndex) => {
            const daySlots = availability[dayIndex] || [];
            const isEnabled = daySlots.length > 0;

            return (
              <AppPressable
                key={day}
                className={`flex-row items-center px-4 py-3.5 ${
                  dayIndex > 0
                    ? isDark
                      ? "border-t border-[#4D4D4D]"
                      : "border-t border-[#E5E5EA]"
                    : ""
                }`}
                onPress={() => onDayPress(dayIndex)}
              >
                <View
                  className={`mr-3 h-2.5 w-2.5 rounded-full ${
                    isEnabled ? "bg-[#34C759]" : isDark ? "bg-[#48484A]" : "bg-[#E5E5EA]"
                  }`}
                />

                <Text
                  className={`w-24 text-[17px] font-medium ${
                    isEnabled ? (isDark ? "text-white" : "text-black") : "text-[#A3A3A3]"
                  }`}
                >
                  {day}
                </Text>

                <View className="flex-1">
                  {isEnabled ? (
                    daySlots.map((slot, slotIndex) => (
                      <Text
                        key={`${slotIndex}-${slot.startTime}`}
                        className={`text-[15px] text-[#A3A3A3] ${slotIndex > 0 ? "mt-0.5" : ""}`}
                      >
                        {formatTime12Hour(slot.startTime)} – {formatTime12Hour(slot.endTime)}
                      </Text>
                    ))
                  ) : (
                    <Text className="text-[15px] text-[#A3A3A3]">Unavailable</Text>
                  )}
                </View>

                <Ionicons name="chevron-forward" size={18} color={isDark ? "#A3A3A3" : "#C7C7CC"} />
              </AppPressable>
            );
          })}
        </View>
      </ScrollView>
    );
  }
);

export default EditAvailabilityHoursScreen;
