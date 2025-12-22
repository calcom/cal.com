import { Ionicons } from "@expo/vector-icons";
import { GlassView } from "expo-glass-effect";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CalComAPIService, Schedule } from "../services/calcom";
import { ScheduleAvailability } from "../services/types";
import { FullScreenModal } from "../components/FullScreenModal";
import { showErrorAlert } from "../utils/alerts";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_ABBREVIATIONS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Convert 24-hour time to 12-hour format with AM/PM
const formatTime12Hour = (time24: string): string => {
  const [hours, minutes] = time24.split(":");
  const hour = parseInt(hours, 10);
  const min = minutes || "00";
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  // Pad single-digit hours with leading zero for consistent width
  const hour12Padded = hour12.toString().padStart(2, "0");
  return `${hour12Padded}:${min} ${period}`;
};

// Format availability for display
const formatAvailabilityDisplay = (
  availability: Record<number, ScheduleAvailability[]>
): string[] => {
  // Group slots by time range
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

  // Format each time range group
  const formatted: string[] = [];
  Object.keys(timeRangeMap).forEach((timeKey) => {
    const days = timeRangeMap[timeKey].sort((a, b) => a - b);
    const [startTime, endTime] = timeKey.split("-");
    const dayNames = days.map((day) => DAY_ABBREVIATIONS[day]).join(", ");
    const timeRange = `${formatTime12Hour(startTime)} - ${formatTime12Hour(endTime)}`;
    formatted.push(`${dayNames}, ${timeRange}`);
  });

  return formatted;
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

export default function AvailabilityDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [scheduleName, setScheduleName] = useState("");
  const [timeZone, setTimeZone] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [availability, setAvailability] = useState<Record<number, ScheduleAvailability[]>>({});
  const [showTimezoneModal, setShowTimezoneModal] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState<{
    dayIndex: number;
    slotIndex: number;
    type: "start" | "end";
  } | null>(null);
  const [overrides, setOverrides] = useState<
    Array<{
      date: string; // Format: "2024-05-20"
      startTime: string; // Format: "12:00" or "00:00" for unavailable
      endTime: string; // Format: "14:00" or "00:00" for unavailable
    }>
  >([]);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [editingOverride, setEditingOverride] = useState<number | null>(null);
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideStartTime, setOverrideStartTime] = useState("09:00");
  const [overrideEndTime, setOverrideEndTime] = useState("17:00");
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [showOverrideTimePicker, setShowOverrideTimePicker] = useState<{
    type: "start" | "end";
  } | null>(null);

  // Common timezones
  const timezones = [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Asia/Kolkata",
    "Australia/Sydney",
    "UTC",
  ];

  useEffect(() => {
    if (id) {
      fetchSchedule();
    }
  }, [id]);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const scheduleData = await CalComAPIService.getScheduleById(Number(id));

      if (scheduleData) {
        setSchedule(scheduleData);
        setScheduleName(scheduleData.name || "");
        setTimeZone(scheduleData.timeZone || "UTC");
        setIsDefault(scheduleData.isDefault || false);

        // Convert availability array to day-indexed object
        const availabilityMap: Record<number, ScheduleAvailability[]> = {};

        // Map day names to numbers
        const dayNameToNumber: Record<string, number> = {
          Sunday: 0,
          Monday: 1,
          Tuesday: 2,
          Wednesday: 3,
          Thursday: 4,
          Friday: 5,
          Saturday: 6,
        };

        if (scheduleData.availability && Array.isArray(scheduleData.availability)) {
          scheduleData.availability.forEach((slot) => {
            // Handle both string day names and number day formats
            let days: number[] = [];
            if (Array.isArray(slot.days)) {
              days = slot.days
                .map((day) => {
                  // If it's a day name string (e.g., "Sunday", "Monday")
                  if (typeof day === "string" && dayNameToNumber[day] !== undefined) {
                    return dayNameToNumber[day];
                  }
                  // If it's a number string (e.g., "0", "1")
                  if (typeof day === "string") {
                    const parsed = parseInt(day, 10);
                    if (!isNaN(parsed) && parsed >= 0 && parsed <= 6) {
                      return parsed;
                    }
                  }
                  // If it's already a number
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
              availabilityMap[day].push({
                days: [day.toString()],
                startTime: slot.startTime || "09:00:00",
                endTime: slot.endTime || "17:00:00",
              });
            });
          });
        }

        setAvailability(availabilityMap);

        // Load overrides if they exist
        if (scheduleData.overrides && Array.isArray(scheduleData.overrides)) {
          const formattedOverrides = scheduleData.overrides.map((override) => ({
            date: override.date || "",
            startTime: override.startTime || "00:00",
            endTime: override.endTime || "00:00",
          }));
          setOverrides(formattedOverrides);
        } else {
          setOverrides([]);
        }
      }
    } catch (error) {
      console.error("Error fetching schedule:", error);
      showErrorAlert("Error", "Failed to load schedule. Please try again.");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (dayIndex: number) => {
    setAvailability((prev) => {
      const newAvailability = { ...prev };
      if (newAvailability[dayIndex] && newAvailability[dayIndex].length > 0) {
        // Disable day - remove availability
        delete newAvailability[dayIndex];
      } else {
        // Enable day - add default time slot (9 AM - 5 PM)
        newAvailability[dayIndex] = [
          {
            days: [dayIndex.toString()],
            startTime: "09:00:00",
            endTime: "17:00:00",
          },
        ];
      }
      return newAvailability;
    });
  };

  const addTimeSlot = (dayIndex: number) => {
    setAvailability((prev) => {
      const newAvailability = { ...prev };
      if (!newAvailability[dayIndex]) {
        newAvailability[dayIndex] = [];
      }
      newAvailability[dayIndex].push({
        days: [dayIndex.toString()],
        startTime: "09:00:00",
        endTime: "17:00:00",
      });
      return newAvailability;
    });
  };

  const removeTimeSlot = (dayIndex: number, slotIndex: number) => {
    setAvailability((prev) => {
      const newAvailability = { ...prev };
      if (newAvailability[dayIndex]) {
        newAvailability[dayIndex] = newAvailability[dayIndex].filter((_, i) => i !== slotIndex);
        if (newAvailability[dayIndex].length === 0) {
          delete newAvailability[dayIndex];
        }
      }
      return newAvailability;
    });
  };

  const updateTimeSlot = (
    dayIndex: number,
    slotIndex: number,
    type: "start" | "end",
    time: string
  ) => {
    setAvailability((prev) => {
      const newAvailability = { ...prev };
      if (newAvailability[dayIndex] && newAvailability[dayIndex][slotIndex]) {
        const slot = { ...newAvailability[dayIndex][slotIndex] };
        if (type === "start") {
          slot.startTime = `${time}:00`;
        } else {
          slot.endTime = `${time}:00`;
        }
        newAvailability[dayIndex][slotIndex] = slot;
      }
      return newAvailability;
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Convert availability object back to array format with day names
      const availabilityArray: Array<{
        days: string[]; // Day names like "Monday", "Tuesday"
        startTime: string; // Format: "09:00"
        endTime: string; // Format: "10:00"
      }> = [];

      Object.keys(availability).forEach((dayIndexStr) => {
        const dayIndex = Number(dayIndexStr);
        const slots = availability[dayIndex];
        if (slots && slots.length > 0) {
          slots.forEach((slot) => {
            // Convert day number to day name
            const dayName = DAYS[dayIndex];

            // Format time from "09:00:00" to "09:00" (remove seconds)
            const formatTimeForAPI = (time: string): string => {
              return time.substring(0, 5); // Take only HH:MM
            };

            availabilityArray.push({
              days: [dayName],
              startTime: formatTimeForAPI(slot.startTime),
              endTime: formatTimeForAPI(slot.endTime),
            });
          });
        }
      });

      // Format overrides for API (ensure times are in HH:MM format)
      const formattedOverrides = overrides.map((override) => ({
        date: override.date,
        startTime: override.startTime.substring(0, 5), // Ensure HH:MM format
        endTime: override.endTime.substring(0, 5), // Ensure HH:MM format
      }));

      await CalComAPIService.updateSchedule(Number(id), {
        name: scheduleName,
        timeZone,
        availability: availabilityArray,
        isDefault: isDefault,
        overrides: formattedOverrides,
      });

      Alert.alert("Success", "Schedule updated successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      showErrorAlert("Error", "Failed to update schedule. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSetAsDefault = async () => {
    try {
      await CalComAPIService.updateSchedule(Number(id), {
        isDefault: true,
      });
      setIsDefault(true);
      Alert.alert("Success", "Schedule set as default successfully");
    } catch (error) {
      showErrorAlert("Error", "Failed to set schedule as default. Please try again.");
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Schedule", `Are you sure you want to delete "${scheduleName}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await CalComAPIService.deleteSchedule(Number(id));
            Alert.alert("Success", "Schedule deleted successfully", [
              { text: "OK", onPress: () => router.back() },
            ]);
          } catch (error) {
            showErrorAlert("Error", "Failed to delete schedule. Please try again.");
          }
        },
      },
    ]);
  };

  const handleAddOverride = () => {
    setEditingOverride(null);
    setOverrideDate("");
    setOverrideStartTime("09:00");
    setOverrideEndTime("17:00");
    setIsUnavailable(false);
    setShowOverrideModal(true);
  };

  const handleEditOverride = (index: number) => {
    const override = overrides[index];
    setEditingOverride(index);
    setOverrideDate(override.date);
    setOverrideStartTime(override.startTime);
    setOverrideEndTime(override.endTime);
    setIsUnavailable(override.startTime === "00:00" && override.endTime === "00:00");
    setShowOverrideModal(true);
  };

  const handleDeleteOverride = (index: number) => {
    Alert.alert("Delete Override", "Are you sure you want to delete this date override?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setOverrides(overrides.filter((_, i) => i !== index));
        },
      },
    ]);
  };

  const handleSaveOverride = () => {
    if (!overrideDate) {
      Alert.alert("Error", "Please select a date");
      return;
    }

    const newOverride = {
      date: overrideDate,
      startTime: isUnavailable ? "00:00" : overrideStartTime,
      endTime: isUnavailable ? "00:00" : overrideEndTime,
    };

    if (editingOverride !== null) {
      // Update existing override
      const updated = [...overrides];
      updated[editingOverride] = newOverride;
      setOverrides(updated);
    } else {
      // Add new override
      setOverrides([...overrides, newOverride]);
    }

    setShowOverrideModal(false);
  };

  const formatDateForDisplay = (dateStr: string): string => {
    if (!dateStr) return "";
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#f8f9fa]">
        <ActivityIndicator size="large" color="#000000" />
        <Text className="mt-4 text-base text-[#666]">Loading schedule...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: () => (
            <Text style={{ fontSize: 20, fontWeight: "700" }}>Edit Availability</Text>
          ),
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="ml-4">
              <Ionicons name="chevron-back" size={24} color="#000" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              className={`mr-4 min-w-[60px] items-center rounded-[10px] bg-black px-2 py-2 md:px-4 ${saving ? "opacity-60" : ""}`}
              onPress={handleSave}
              disabled={saving}
            >
              <Text className="text-base font-semibold text-white">Save</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <View className="flex-1">
        <ScrollView
          className="flex-1 bg-[#f8f9fa]"
          contentContainerStyle={{ padding: 16, paddingBottom: 200 }}
        >
          <View className="gap-4">
            {/* Schedule Name and Working Hours Display */}
            <View className="rounded-2xl bg-white p-6">
              <Text className="mb-3 text-xl font-bold text-[#333]">{scheduleName}</Text>
              {Object.keys(availability).length > 0 ? (
                <View>
                  {formatAvailabilityDisplay(availability).map((line, index) => (
                    <Text key={index} className="mb-1 text-base text-[#666]">
                      {line}
                    </Text>
                  ))}
                </View>
              ) : (
                <Text className="text-base text-[#999]">No availability set</Text>
              )}
            </View>

            {/* Availability Schedule */}
            <View className="rounded-2xl bg-white p-6">
              <Text className="mb-4 text-xl font-bold text-[#333]">Availability</Text>
              {DAYS.map((day, dayIndex) => {
                const daySlots = availability[dayIndex] || [];
                const isEnabled = daySlots.length > 0;
                const firstSlot = daySlots[0];

                return (
                  <View
                    key={dayIndex}
                    className={`mb-3 border-b border-[#E5E5EA] pb-3 ${dayIndex === DAYS.length - 1 ? "mb-0 border-b-0 pb-0" : ""}`}
                  >
                    <View className="flex-row items-center">
                      <View className="flex-1 flex-row items-center">
                        <Switch
                          value={isEnabled}
                          onValueChange={() => toggleDay(dayIndex)}
                          trackColor={{ false: "#E5E5EA", true: "#34C759" }}
                          thumbColor="#fff"
                          style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                        />
                        <Text
                          className="ml-1 text-base font-medium text-[#333]"
                          style={{ width: 40 }}
                        >
                          {DAY_ABBREVIATIONS[dayIndex]}
                        </Text>
                        {isEnabled && firstSlot ? (
                          <View className="flex-row items-center gap-2">
                            <TouchableOpacity
                              onPress={() =>
                                setShowTimePicker({ dayIndex, slotIndex: 0, type: "start" })
                              }
                              className="rounded-lg border border-[#E5E5EA] bg-white px-2 py-1"
                              style={{ width: 85 }}
                            >
                              <Text className="text-center text-base text-[#333]">
                                {formatTime12Hour(firstSlot.startTime)}
                              </Text>
                            </TouchableOpacity>
                            <Text className="text-base text-[#666]">-</Text>
                            <TouchableOpacity
                              onPress={() =>
                                setShowTimePicker({ dayIndex, slotIndex: 0, type: "end" })
                              }
                              className="rounded-lg border border-[#E5E5EA] bg-white px-2 py-1"
                              style={{ width: 85 }}
                            >
                              <Text className="text-center text-base text-[#333]">
                                {formatTime12Hour(firstSlot.endTime)}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        ) : null}
                      </View>
                      {isEnabled ? (
                        <TouchableOpacity onPress={() => addTimeSlot(dayIndex)} className="p-1">
                          <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    {isEnabled && daySlots.length > 1 ? (
                      <View className="mt-2" style={{ marginLeft: 108 }}>
                        {daySlots.slice(1).map((slot, slotIndex) => (
                          <View key={slotIndex + 1} className="mb-2 flex-row items-center gap-2">
                            <TouchableOpacity
                              onPress={() =>
                                setShowTimePicker({
                                  dayIndex,
                                  slotIndex: slotIndex + 1,
                                  type: "start",
                                })
                              }
                              className="rounded-lg border border-[#E5E5EA] bg-white px-2 py-1"
                              style={{ width: 85 }}
                            >
                              <Text className="text-center text-base text-[#333]">
                                {formatTime12Hour(slot.startTime)}
                              </Text>
                            </TouchableOpacity>
                            <Text className="text-base text-[#666]">-</Text>
                            <TouchableOpacity
                              onPress={() =>
                                setShowTimePicker({
                                  dayIndex,
                                  slotIndex: slotIndex + 1,
                                  type: "end",
                                })
                              }
                              className="rounded-lg border border-[#E5E5EA] bg-white px-2 py-1"
                              style={{ width: 85 }}
                            >
                              <Text className="text-center text-base text-[#333]">
                                {formatTime12Hour(slot.endTime)}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => removeTimeSlot(dayIndex, slotIndex + 1)}
                              className="p-1"
                            >
                              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>

            {/* Timezone */}
            <View className="rounded-2xl bg-white p-6">
              <Text className="mb-3 text-xl font-bold text-[#333]">Timezone</Text>
              <TouchableOpacity
                onPress={() => setShowTimezoneModal(true)}
                className="flex-row items-center justify-between rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-3 py-3"
              >
                <Text className="text-base text-[#333]">{timeZone}</Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Date Overrides */}
            <View className="rounded-2xl bg-white p-6">
              <Text className="mb-2 text-xl font-bold text-[#333]">Date overrides</Text>
              <Text className="mb-4 text-base text-[#666]">
                Add dates when your availability changes from your daily hours.
              </Text>

              {overrides.length > 0 ? (
                <View className="mb-4">
                  {overrides.map((override, index) => (
                    <View
                      key={index}
                      className="mb-2 flex-row items-center justify-between rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] p-3"
                    >
                      <View className="flex-1">
                        <Text className="mb-1 text-base font-medium text-[#333]">
                          {formatDateForDisplay(override.date)}
                        </Text>
                        {override.startTime === "00:00" && override.endTime === "00:00" ? (
                          <Text className="text-sm text-[#666]">Unavailable (All day)</Text>
                        ) : (
                          <Text className="text-sm text-[#666]">
                            {formatTime12Hour(override.startTime + ":00")} -{" "}
                            {formatTime12Hour(override.endTime + ":00")}
                          </Text>
                        )}
                      </View>
                      <View className="flex-row items-center gap-2">
                        <TouchableOpacity onPress={() => handleEditOverride(index)} className="p-2">
                          <Ionicons name="pencil-outline" size={20} color="#007AFF" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteOverride(index)}
                          className="p-2"
                        >
                          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}

              <TouchableOpacity
                onPress={handleAddOverride}
                className="flex-row items-center justify-center rounded-lg border border-dashed border-[#E5E5EA] py-3"
              >
                <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
                <Text className="ml-2 text-base font-medium text-[#007AFF]">Add an override</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Action Bar */}
        <GlassView
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            paddingTop: 16,
            paddingHorizontal: 20,
            backgroundColor: "#f8f9fa",
            borderTopWidth: 0.5,
            borderTopColor: "#E5E5EA",
            paddingBottom: insets.bottom + 12,
          }}
          glassEffectStyle="clear"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Text className="text-base font-medium text-[#333]">Set as Default</Text>
              <Switch
                value={isDefault}
                onValueChange={handleSetAsDefault}
                disabled={isDefault}
                trackColor={{ false: "#E5E5EA", true: "#34C759" }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View className="flex-row items-center gap-3">
              <GlassView
                className="overflow-hidden rounded-full bg-[rgba(255,255,255,0.1)]"
                glassEffectStyle="clear"
              >
                <TouchableOpacity
                  className="h-11 w-11 items-center justify-center"
                  onPress={handleDelete}
                >
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </GlassView>
            </View>
          </View>
        </GlassView>
      </View>

      {/* Timezone Modal */}
      <FullScreenModal
        visible={showTimezoneModal}
        animationType="fade"
        onRequestClose={() => setShowTimezoneModal(false)}
      >
        <TouchableOpacity
          className="flex-1 items-center justify-center bg-black/50 p-2 md:p-4"
          activeOpacity={1}
          onPress={() => setShowTimezoneModal(false)}
        >
          <TouchableOpacity
            className="max-h-[80%] w-[90%] max-w-[500px] rounded-2xl bg-white p-4"
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-[#333]">Select Timezone</Text>
              <TouchableOpacity onPress={() => setShowTimezoneModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {timezones.map((tz) => (
                <TouchableOpacity
                  key={tz}
                  onPress={() => {
                    setTimeZone(tz);
                    setShowTimezoneModal(false);
                  }}
                  className="border-b border-[#E5E5EA] py-3"
                >
                  <Text className="text-base text-[#333]">{tz}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </FullScreenModal>

      {/* Time Picker Modal */}
      <FullScreenModal
        visible={!!showTimePicker}
        animationType="fade"
        onRequestClose={() => setShowTimePicker(null)}
      >
        <TouchableOpacity
          className="flex-1 items-center justify-center bg-black/50 p-2 md:p-4"
          activeOpacity={1}
          onPress={() => setShowTimePicker(null)}
        >
          <TouchableOpacity
            className="max-h-[80%] w-[90%] max-w-[500px] rounded-2xl bg-white p-4"
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-[#333]">
                Select {showTimePicker?.type === "start" ? "Start" : "End"} Time
              </Text>
              <TouchableOpacity onPress={() => setShowTimePicker(null)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {TIME_OPTIONS.map((time) => {
                const currentTime =
                  showTimePicker?.type === "start"
                    ? availability[showTimePicker.dayIndex]?.[
                        showTimePicker.slotIndex
                      ]?.startTime.substring(0, 5)
                    : availability[showTimePicker?.dayIndex || 0]?.[
                        showTimePicker?.slotIndex || 0
                      ]?.endTime.substring(0, 5);
                const isSelected = currentTime === time;

                return (
                  <TouchableOpacity
                    key={time}
                    onPress={() => {
                      if (showTimePicker) {
                        updateTimeSlot(
                          showTimePicker.dayIndex,
                          showTimePicker.slotIndex,
                          showTimePicker.type,
                          time
                        );
                        setShowTimePicker(null);
                      }
                    }}
                    className={`border-b border-[#E5E5EA] py-3 ${isSelected ? "bg-[#E3F2FD]" : ""}`}
                  >
                    <Text
                      className={`text-base ${isSelected ? "font-semibold text-[#007AFF]" : "text-[#333]"}`}
                    >
                      {time}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </FullScreenModal>

      {/* Override Modal */}
      <FullScreenModal
        visible={showOverrideModal}
        animationType="fade"
        onRequestClose={() => setShowOverrideModal(false)}
      >
        <TouchableOpacity
          className="flex-1 items-center justify-center bg-black/50 p-2 md:p-4"
          activeOpacity={1}
          onPress={() => setShowOverrideModal(false)}
        >
          <TouchableOpacity
            className="max-h-[90%] w-[90%] max-w-[500px] rounded-2xl bg-white p-6"
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-[#333]">
                {editingOverride !== null ? "Edit Override" : "Add Override"}
              </Text>
              <TouchableOpacity onPress={() => setShowOverrideModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <View className="gap-4">
                {/* Date Picker */}
                <View>
                  <Text className="mb-2 text-base font-semibold text-[#333]">
                    Select the dates to override
                  </Text>
                  <TextInput
                    value={overrideDate}
                    onChangeText={setOverrideDate}
                    placeholder="YYYY-MM-DD (e.g., 2024-05-20)"
                    placeholderTextColor="#999"
                    className="rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-3 py-3 text-base text-[#333]"
                  />
                  <Text className="mt-1 text-sm text-[#666]">Enter date in YYYY-MM-DD format</Text>
                </View>

                {/* Unavailable Toggle */}
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-semibold text-[#333]">
                    Mark unavailable (All day)
                  </Text>
                  <Switch
                    value={isUnavailable}
                    onValueChange={setIsUnavailable}
                    trackColor={{ false: "#E5E5EA", true: "#34C759" }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {/* Time Picker (only if not unavailable) */}
                {!isUnavailable ? (
                  <View>
                    <Text className="mb-3 text-base font-semibold text-[#333]">
                      Which hours are you free?
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <TouchableOpacity
                        onPress={() => setShowOverrideTimePicker({ type: "start" })}
                        className="flex-1 rounded-lg border border-[#E5E5EA] bg-white px-3 py-3"
                      >
                        <Text className="text-center text-base text-[#333]">
                          {formatTime12Hour(overrideStartTime + ":00")}
                        </Text>
                      </TouchableOpacity>
                      <Text className="text-base text-[#666]">-</Text>
                      <TouchableOpacity
                        onPress={() => setShowOverrideTimePicker({ type: "end" })}
                        className="flex-1 rounded-lg border border-[#E5E5EA] bg-white px-3 py-3"
                      >
                        <Text className="text-center text-base text-[#333]">
                          {formatTime12Hour(overrideEndTime + ":00")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}

                {/* Save Button */}
                <TouchableOpacity
                  onPress={handleSaveOverride}
                  className="mt-4 rounded-lg bg-black py-3"
                >
                  <Text className="text-center text-base font-semibold text-white">
                    Save Override
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </FullScreenModal>

      {/* Override Time Picker Modal */}
      <FullScreenModal
        visible={!!showOverrideTimePicker}
        animationType="fade"
        onRequestClose={() => setShowOverrideTimePicker(null)}
      >
        <TouchableOpacity
          className="flex-1 items-center justify-center bg-black/50 p-2 md:p-4"
          activeOpacity={1}
          onPress={() => setShowOverrideTimePicker(null)}
        >
          <TouchableOpacity
            className="max-h-[60%] w-[90%] max-w-[500px] rounded-2xl bg-white p-6"
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-[#333]">
                Select {showOverrideTimePicker?.type === "start" ? "Start" : "End"} Time
              </Text>
              <TouchableOpacity onPress={() => setShowOverrideTimePicker(null)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {TIME_OPTIONS.map((time) => {
                const currentTime =
                  showOverrideTimePicker?.type === "start" ? overrideStartTime : overrideEndTime;
                const isSelected = currentTime === time;
                return (
                  <TouchableOpacity
                    key={time}
                    onPress={() => {
                      if (showOverrideTimePicker?.type === "start") {
                        setOverrideStartTime(time);
                      } else {
                        setOverrideEndTime(time);
                      }
                      setShowOverrideTimePicker(null);
                    }}
                    className={`border-b border-[#E5E5EA] py-3 ${isSelected ? "bg-[#F0F9FF]" : ""}`}
                  >
                    <Text
                      className={`text-base ${isSelected ? "font-semibold text-[#007AFF]" : "text-[#333]"}`}
                    >
                      {formatTime12Hour(time + ":00")}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </FullScreenModal>
    </>
  );
}
