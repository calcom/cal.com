/**
 * AvailabilityDetailScreen Component (iOS)
 *
 * iOS-specific read-only display of availability schedule.
 * Editing is done via separate bottom sheet screens.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppPressable } from "@/components/AppPressable";
import { CalComAPIService, type Schedule } from "@/services/calcom";
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

// Format availability for display - groups days with same time range
const formatAvailabilityDisplay = (
  availability: Record<number, ScheduleAvailability[]>
): string[] => {
  const timeRangeMap: Record<string, number[]> = {};

  Object.keys(availability).forEach((dayIndexStr) => {
    const dayIndex = Number(dayIndexStr);
    const slots = availability[dayIndex];
    if (slots && slots.length > 0) {
      slots.forEach((slot) => {
        const timeKey = `${slot.startTime}-${slot.endTime}`;
        if (!timeRangeMap[timeKey]) {
          timeRangeMap[timeKey] = [];
        }
        timeRangeMap[timeKey].push(dayIndex);
      });
    }
  });

  const formatted: string[] = [];
  Object.keys(timeRangeMap).forEach((timeKey) => {
    const days = timeRangeMap[timeKey].sort((a, b) => a - b);
    const [startTime, endTime] = timeKey.split("-");
    const dayNames = days.map((day) => DAYS[day]).join(", ");
    const timeRange = `${formatTime12Hour(startTime)} - ${formatTime12Hour(endTime)}`;
    formatted.push(`${dayNames}, ${timeRange}`);
  });

  return formatted;
};

// Format date for display
const formatDateForDisplay = (dateStr: string): string => {
  if (!dateStr) return "";
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export interface AvailabilityDetailScreenProps {
  id: string;
  onActionsReady?: (handlers: { handleSetAsDefault: () => void; handleDelete: () => void }) => void;
}

export interface AvailabilityDetailScreenHandle {
  setAsDefault: () => void;
  delete: () => void;
  refresh: () => void;
}

export const AvailabilityDetailScreen = forwardRef<
  AvailabilityDetailScreenHandle,
  AvailabilityDetailScreenProps
>(function AvailabilityDetailScreen({ id, onActionsReady }, ref) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [_schedule, setSchedule] = useState<Schedule | null>(null);
  const [scheduleName, setScheduleName] = useState("");
  const [timeZone, setTimeZone] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [availability, setAvailability] = useState<Record<number, ScheduleAvailability[]>>({});
  const [overrides, setOverrides] = useState<
    {
      date: string;
      startTime: string;
      endTime: string;
    }[]
  >([]);
  const [daysExpanded, setDaysExpanded] = useState(true);
  const [overridesExpanded, setOverridesExpanded] = useState(true);

  const processScheduleData = useCallback(
    (scheduleData: NonNullable<Awaited<ReturnType<typeof CalComAPIService.getScheduleById>>>) => {
      const name = scheduleData.name ?? "";
      const tz = scheduleData.timeZone ?? "UTC";
      const isDefaultSchedule = scheduleData.isDefault ?? false;

      setSchedule(scheduleData);
      setScheduleName(name);
      setTimeZone(tz);
      setIsDefault(isDefaultSchedule);

      const availabilityMap: Record<number, ScheduleAvailability[]> = {};

      const availabilityArray = scheduleData.availability;
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

      setAvailability(availabilityMap);

      const overridesArray = scheduleData.overrides;
      if (overridesArray && Array.isArray(overridesArray)) {
        const formattedOverrides = overridesArray.map((override) => {
          const date = override.date ?? "";
          const startTime = override.startTime ?? "00:00";
          const endTime = override.endTime ?? "00:00";
          return { date, startTime, endTime };
        });
        setOverrides(formattedOverrides);
      } else {
        setOverrides([]);
      }
    },
    []
  );

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    let scheduleData: Awaited<ReturnType<typeof CalComAPIService.getScheduleById>> = null;
    try {
      scheduleData = await CalComAPIService.getScheduleById(Number(id));
    } catch (error) {
      console.error("Error fetching schedule");
      if (__DEV__) {
        const message = error instanceof Error ? error.message : String(error);
        console.debug("[AvailabilityDetailScreen.ios] fetchSchedule failed", {
          message,
        });
      }
      showErrorAlert("Error", "Failed to load availability. Please try again.");
      router.back();
      setLoading(false);
      return;
    }

    if (scheduleData) {
      processScheduleData(scheduleData);
    }
    setLoading(false);
  }, [id, router, processScheduleData]);

  useEffect(() => {
    if (id) {
      fetchSchedule();
    }
  }, [id, fetchSchedule]);

  const handleSetAsDefault = useCallback(async () => {
    if (isDefault) {
      Alert.alert("Info", "This schedule is already set as default");
      return;
    }

    try {
      await CalComAPIService.updateSchedule(Number(id), {
        isDefault: true,
      });
      setIsDefault(true);
      Alert.alert("Success", "Availability set as default successfully");
    } catch {
      showErrorAlert("Error", "Failed to set availability as default. Please try again.");
    }
  }, [isDefault, id]);

  const handleDelete = useCallback(() => {
    if (isDefault) {
      Alert.alert(
        "Cannot Delete",
        "You cannot delete the default schedule. Please set another schedule as default first."
      );
      return;
    }

    Alert.alert("Delete Availability", `Are you sure you want to delete "${scheduleName}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await CalComAPIService.deleteSchedule(Number(id));
            Alert.alert("Success", "Availability deleted successfully", [
              { text: "OK", onPress: () => router.back() },
            ]);
          } catch {
            showErrorAlert("Error", "Failed to delete availability. Please try again.");
          }
        },
      },
    ]);
  }, [isDefault, scheduleName, id, router]);

  // Expose handlers via ref
  useImperativeHandle(
    ref,
    () => ({
      setAsDefault: handleSetAsDefault,
      delete: handleDelete,
      refresh: fetchSchedule,
    }),
    [handleSetAsDefault, handleDelete, fetchSchedule]
  );

  // Expose handlers to parent for iOS header menu
  useEffect(() => {
    if (onActionsReady) {
      onActionsReady({
        handleSetAsDefault,
        handleDelete,
      });
    }
  }, [onActionsReady, handleSetAsDefault, handleDelete]);

  // Count enabled days
  const enabledDaysCount = Object.keys(availability).length;

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#f2f2f7]">
        <ActivityIndicator size="large" color="#000000" />
        <Text className="mt-4 text-[15px] text-[#8E8E93]">Loading availability...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#f2f2f7]">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Schedule Title Section - iOS Calendar Style */}
        <View className="mb-4">
          <View className="mb-2 flex-row flex-wrap items-center">
            <Text
              className="text-[26px] font-semibold leading-tight text-black"
              style={{ letterSpacing: -0.3 }}
            >
              {scheduleName || "Untitled Schedule"}
            </Text>
            {isDefault && (
              <Ionicons
                name="star-outline"
                size={20}
                color="#000000"
                style={{ marginLeft: 6, marginTop: 2 }}
              />
            )}
          </View>
        </View>

        {/* Working Hours Summary Card */}
        <View className="mb-4 overflow-hidden rounded-xl bg-white">
          <View className="px-4 py-3.5">
            <Text className="mb-2.5 text-[13px] font-medium uppercase tracking-wide text-[#8E8E93]">
              Working Hours
            </Text>
            {Object.keys(availability).length > 0 ? (
              <View>
                {formatAvailabilityDisplay(availability).map((line) => (
                  <Text key={line} className="mb-1 text-[17px] text-black">
                    {line}
                  </Text>
                ))}
              </View>
            ) : (
              <Text className="text-[17px] text-[#8E8E93]">No availability set</Text>
            )}
          </View>
        </View>

        {/* Weekly Schedule Card - Expandable */}
        <View className="mb-4 overflow-hidden rounded-xl bg-white">
          <AppPressable
            className="flex-row items-center justify-between px-4 py-3.5"
            onPress={() => setDaysExpanded(!daysExpanded)}
          >
            <Text className="text-[17px] text-black">Weekly Schedule</Text>
            <View className="flex-row items-center">
              <Text className="mr-1 text-[17px] text-[#8E8E93]">
                {enabledDaysCount} {enabledDaysCount === 1 ? "day" : "days"}
              </Text>
              <Ionicons
                name={daysExpanded ? "chevron-down" : "chevron-forward"}
                size={18}
                color="#C7C7CC"
              />
            </View>
          </AppPressable>

          {daysExpanded && (
            <View className="border-t border-[#E5E5EA] px-4 py-2.5">
              {DAYS.map((day, dayIndex) => {
                const daySlots = availability[dayIndex] || [];
                const isEnabled = daySlots.length > 0;

                return (
                  <View
                    key={day}
                    className={`flex-row items-center py-3 ${
                      dayIndex > 0 ? "border-t border-[#E5E5EA]" : ""
                    }`}
                  >
                    <View
                      className={`mr-3 h-2.5 w-2.5 rounded-full ${
                        isEnabled ? "bg-[#34C759]" : "bg-[#E5E5EA]"
                      }`}
                    />
                    <Text
                      className={`w-24 text-[15px] font-medium ${
                        isEnabled ? "text-black" : "text-[#8E8E93]"
                      }`}
                    >
                      {DAYS[dayIndex]}
                    </Text>

                    {isEnabled ? (
                      <View className="flex-1 items-end">
                        {daySlots.map((slot, slotIndex) => (
                          <Text
                            key={`${slotIndex}-${slot.startTime}`}
                            className={`text-[15px] text-black ${slotIndex > 0 ? "mt-1" : ""}`}
                          >
                            {formatTime12Hour(slot.startTime)} – {formatTime12Hour(slot.endTime)}
                          </Text>
                        ))}
                      </View>
                    ) : (
                      <Text className="flex-1 text-right text-[15px] text-[#8E8E93]">
                        Unavailable
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Timezone Card */}
        <View className="mb-4 overflow-hidden rounded-xl bg-white">
          <View className="flex-row items-center justify-between px-4 py-3.5">
            <Text className="text-[17px] text-black">Timezone</Text>
            <Text className="text-[17px] text-[#8E8E93]">{timeZone}</Text>
          </View>
        </View>

        {/* Date Overrides Card - Expandable */}
        {overrides.length > 0 && (
          <View className="mb-4 overflow-hidden rounded-xl bg-white">
            <AppPressable
              className="flex-row items-center justify-between px-4 py-3.5"
              onPress={() => setOverridesExpanded(!overridesExpanded)}
            >
              <Text className="text-[17px] text-black">Date Overrides</Text>
              <View className="flex-row items-center">
                <Text className="mr-1 text-[17px] text-[#8E8E93]">
                  {overrides.length} {overrides.length === 1 ? "override" : "overrides"}
                </Text>
                <Ionicons
                  name={overridesExpanded ? "chevron-down" : "chevron-forward"}
                  size={18}
                  color="#C7C7CC"
                />
              </View>
            </AppPressable>

            {overridesExpanded && (
              <View className="border-t border-[#E5E5EA] px-4 py-2.5">
                {overrides.map((override, index) => (
                  <View
                    key={override.date}
                    className={`py-2.5 ${index > 0 ? "border-t border-[#E5E5EA]" : ""}`}
                  >
                    <Text className="mb-0.5 text-[17px] text-black">
                      {formatDateForDisplay(override.date)}
                    </Text>
                    {override.startTime === "00:00" && override.endTime === "00:00" ? (
                      <Text className="text-[15px] text-[#FF3B30]">Unavailable</Text>
                    ) : (
                      <Text className="text-[15px] text-[#8E8E93]">
                        {formatTime12Hour(`${override.startTime}:00`)} –{" "}
                        {formatTime12Hour(`${override.endTime}:00`)}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* No Overrides Message */}
        {overrides.length === 0 && (
          <View className="mb-4 overflow-hidden rounded-xl bg-white">
            <View className="px-4 py-3.5">
              <Text className="text-[17px] text-black">Date Overrides</Text>
              <Text className="mt-1 text-[15px] text-[#8E8E93]">No date overrides set</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
});
