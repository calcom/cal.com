/**
 * AvailabilityDetailScreen Component (Android/Extension)
 *
 * Read-only display of availability schedule.
 * Editing is done via separate modal screens.
 * Uses React Query for cache synchronization with edit screens.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { forwardRef, useCallback, useImperativeHandle, useMemo } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppPressable } from "@/components/AppPressable";
import { useDeleteSchedule, useScheduleById, useSetScheduleAsDefault } from "@/hooks/useSchedules";
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

  // Use React Query hook for data fetching and cache synchronization
  const { data: schedule, isLoading, error, refetch, isRefetching } = useScheduleById(Number(id));

  // Mutation hooks for actions
  const { mutate: setAsDefaultMutation } = useSetScheduleAsDefault();
  const { mutate: deleteScheduleMutation } = useDeleteSchedule();

  // Derive schedule properties from the query data
  const scheduleName = schedule?.name ?? "";
  const timeZone = schedule?.timeZone ?? "";
  const isDefault = schedule?.isDefault ?? false;

  // Process availability data into a map by day number
  const availability = useMemo(() => {
    const availabilityMap: Record<number, ScheduleAvailability[]> = {};

    const availabilityArray = schedule?.availability;
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
  }, [schedule?.availability]);

  // Process overrides data
  const overrides = useMemo(() => {
    const overridesArray = schedule?.overrides;
    if (overridesArray && Array.isArray(overridesArray)) {
      return overridesArray.map((override) => {
        const date = override.date ?? "";
        const startTime = override.startTime ?? "00:00";
        const endTime = override.endTime ?? "00:00";
        return { date, startTime, endTime };
      });
    }
    return [];
  }, [schedule?.overrides]);

  const handleSetAsDefault = useCallback(() => {
    if (isDefault) {
      Alert.alert("Info", "This schedule is already set as default");
      return;
    }

    setAsDefaultMutation(Number(id), {
      onSuccess: () => {
        Alert.alert("Success", "Availability set as default successfully");
      },
      onError: () => {
        showErrorAlert("Error", "Failed to set availability as default. Please try again.");
      },
    });
  }, [isDefault, id, setAsDefaultMutation]);

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
        onPress: () => {
          deleteScheduleMutation(Number(id), {
            onSuccess: () => {
              Alert.alert("Success", "Availability deleted successfully", [
                { text: "OK", onPress: () => router.back() },
              ]);
            },
            onError: () => {
              showErrorAlert("Error", "Failed to delete availability. Please try again.");
            },
          });
        },
      },
    ]);
  }, [isDefault, scheduleName, id, router, deleteScheduleMutation]);

  // Expose handlers via ref
  useImperativeHandle(
    ref,
    () => ({
      setAsDefault: handleSetAsDefault,
      delete: handleDelete,
      refresh: () => refetch(),
    }),
    [handleSetAsDefault, handleDelete, refetch]
  );

  // Expose handlers to parent for header menu
  useEffect(() => {
    if (onActionsReady) {
      onActionsReady({
        handleSetAsDefault,
        handleDelete,
      });
    }
  }, [onActionsReady, handleSetAsDefault, handleDelete]);

  // Handle error state - must be in useEffect to avoid side effects during render
  useEffect(() => {
    if (error) {
      showErrorAlert("Error", "Failed to load availability. Please try again.");
      router.back();
    }
  }, [error, router]);

  // Count enabled days
  const enabledDaysCount = Object.keys(availability).length;

  // Early return for error state (after useEffect hooks)
  if (error) {
    return null;
  }

  if (isLoading) {
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
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
      >
        {/* Schedule Title Section */}
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

        {/* Weekly Schedule Card - Navigable */}
        <View className="mb-4 overflow-hidden rounded-xl bg-white">
          <AppPressable onPress={() => router.push(`/edit-availability-hours?id=${id}` as never)}>
            <View className="flex-row items-center justify-between px-4 py-3.5">
              <Text className="text-[17px] text-black">Weekly Schedule</Text>
              <View className="flex-row items-center">
                <Text className="mr-1 text-[17px] text-[#8E8E93]">
                  {enabledDaysCount} {enabledDaysCount === 1 ? "day" : "days"}
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
              </View>
            </View>

            {/* Expanded Day List */}
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
                            {formatTime12Hour(slot.startTime)} - {formatTime12Hour(slot.endTime)}
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
          </AppPressable>
        </View>

        {/* Timezone Card - Navigable */}
        <View className="mb-4 overflow-hidden rounded-xl bg-white">
          <AppPressable onPress={() => router.push(`/edit-availability-name?id=${id}` as never)}>
            <View className="flex-row items-center justify-between px-4 py-3.5">
              <Text className="text-[17px] text-black">Timezone</Text>
              <View className="flex-row items-center">
                <Text className="mr-1 text-[17px] text-[#8E8E93]">{timeZone}</Text>
                <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
              </View>
            </View>
          </AppPressable>
        </View>

        {/* Date Overrides Card - Navigable */}
        {overrides.length > 0 && (
          <View className="mb-4 overflow-hidden rounded-xl bg-white">
            <AppPressable
              onPress={() => router.push(`/edit-availability-override?id=${id}` as never)}
            >
              <View className="flex-row items-center justify-between px-4 py-3.5">
                <Text className="text-[17px] text-black">Date Overrides</Text>
                <View className="flex-row items-center">
                  <Text className="mr-1 text-[17px] text-[#8E8E93]">
                    {overrides.length} {overrides.length === 1 ? "override" : "overrides"}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
                </View>
              </View>

              {/* Expanded Overrides List */}
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
                        {formatTime12Hour(`${override.startTime}:00`)} -{" "}
                        {formatTime12Hour(`${override.endTime}:00`)}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            </AppPressable>
          </View>
        )}

        {/* No Overrides Message - Still navigable to add overrides */}
        {overrides.length === 0 && (
          <View className="mb-4 overflow-hidden rounded-xl bg-white">
            <AppPressable
              onPress={() => router.push(`/edit-availability-override?id=${id}` as never)}
            >
              <View className="flex-row items-center justify-between px-4 py-3.5">
                <View>
                  <Text className="text-[17px] text-black">Date Overrides</Text>
                  <Text className="mt-1 text-[15px] text-[#8E8E93]">No date overrides set</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
              </View>
            </AppPressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
});
