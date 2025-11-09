import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";

import type { Schedule, ScheduleAvailability } from "../services/calcom";
import { TimePicker } from "./TimePicker";

type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";

const DAYS_OF_WEEK: DayOfWeek[] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface TimeRange {
  startTime: string;
  endTime: string;
}

interface DayAvailability {
  enabled: boolean;
  timeRanges: TimeRange[];
}

const MINUTES_IN_HOUR = 60;
const MINUTES_IN_DAY = 24 * MINUTES_IN_HOUR;

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (totalMinutes: number): string => {
  const normalized = Math.max(0, Math.min(totalMinutes, MINUTES_IN_DAY - 1));
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
};

const getNextOneHourSlot = (ranges: TimeRange[]): TimeRange | null => {
  if (!ranges.length) {
    return null;
  }

  const sortedRanges = [...ranges].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  const lastRange = sortedRanges[sortedRanges.length - 1];
  const lastEndMinutes = timeToMinutes(lastRange.endTime);
  const endOfDayMinutes = MINUTES_IN_DAY - 1;

  if (lastEndMinutes < endOfDayMinutes) {
    const startMinutes = lastEndMinutes;
    const endMinutes = Math.min(startMinutes + MINUTES_IN_HOUR, endOfDayMinutes);

    if (startMinutes < endMinutes) {
      return {
        startTime: minutesToTime(startMinutes),
        endTime: minutesToTime(endMinutes),
      };
    }
  }

  const firstRange = sortedRanges[0];
  const firstStartMinutes = timeToMinutes(firstRange.startTime);

  if (firstStartMinutes > 0) {
    const endMinutes = firstStartMinutes;
    const startMinutes = Math.max(endMinutes - MINUTES_IN_HOUR, 0);

    if (startMinutes < endMinutes) {
      return {
        startTime: minutesToTime(startMinutes),
        endTime: minutesToTime(endMinutes),
      };
    }
  }

  return null;
};

interface EditAvailabilityModalProps {
  visible: boolean;
  schedule: Schedule;
  onClose: () => void;
  onSave: (updatedSchedule: {
    name?: string;
    timeZone?: string;
    availability?: ScheduleAvailability[];
    isDefault?: boolean;
  }) => Promise<void>;
}

export default function EditAvailabilityModal({
  visible,
  schedule,
  onClose,
  onSave,
}: EditAvailabilityModalProps) {
  const [name, setName] = useState(schedule.name);
  const [timeZone, setTimeZone] = useState(schedule.timeZone);
  const [isDefault, setIsDefault] = useState(schedule.isDefault);
  const [saving, setSaving] = useState(false);

  // Initialize day-based availability structure
  const initializeDayAvailability = () => {
    const dayMap: Record<DayOfWeek, DayAvailability> = {
      Sunday: { enabled: false, timeRanges: [] },
      Monday: { enabled: false, timeRanges: [] },
      Tuesday: { enabled: false, timeRanges: [] },
      Wednesday: { enabled: false, timeRanges: [] },
      Thursday: { enabled: false, timeRanges: [] },
      Friday: { enabled: false, timeRanges: [] },
      Saturday: { enabled: false, timeRanges: [] },
    };

    // Convert schedule availability to day-based structure
    schedule.availability.forEach((slot) => {
      slot.days.forEach((day) => {
        const dayKey = day as DayOfWeek;
        if (!dayMap[dayKey].enabled) {
          dayMap[dayKey].enabled = true;
          dayMap[dayKey].timeRanges = [];
        }
        dayMap[dayKey].timeRanges.push({
          startTime: slot.startTime,
          endTime: slot.endTime,
        });
      });
    });

    return dayMap;
  };

  const [dayAvailability, setDayAvailability] =
    useState<Record<DayOfWeek, DayAvailability>>(initializeDayAvailability);

  useEffect(() => {
    setDayAvailability(initializeDayAvailability());
    setName(schedule.name);
    setTimeZone(schedule.timeZone);
    setIsDefault(schedule.isDefault);
  }, [visible, schedule]);

  const toggleDayEnabled = (day: DayOfWeek) => {
    setDayAvailability((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day].enabled,
        timeRanges:
          !prev[day].enabled && prev[day].timeRanges.length === 0
            ? [{ startTime: "09:00", endTime: "17:00" }]
            : prev[day].timeRanges,
      },
    }));
  };

  const addTimeRange = (day: DayOfWeek) => {
    setDayAvailability((prev) => {
      const currentRanges = prev[day].timeRanges;

      if (currentRanges.length === 0) {
        return {
          ...prev,
          [day]: {
            ...prev[day],
            timeRanges: [{ startTime: "09:00", endTime: "17:00" }],
          },
        };
      }

      const nextSlot = getNextOneHourSlot(currentRanges);

      if (!nextSlot) {
        return prev;
      }

      const updatedRanges = [...currentRanges, nextSlot].sort(
        (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
      );

      return {
        ...prev,
        [day]: {
          ...prev[day],
          timeRanges: updatedRanges,
        },
      };
    });
  };

  const removeTimeRange = (day: DayOfWeek, index: number) => {
    setDayAvailability((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeRanges: prev[day].timeRanges.filter((_, i) => i !== index),
      },
    }));
  };

  const updateTimeRange = (day: DayOfWeek, index: number, field: "startTime" | "endTime", value: string) => {
    setDayAvailability((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeRanges: prev[day].timeRanges.map((range, i) =>
          i === index ? { ...range, [field]: value } : range
        ),
      },
    }));
  };

  const validateTime = (time: string): boolean => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  };

  const handleSave = async () => {
    // Convert day-based structure back to API format
    const availability: ScheduleAvailability[] = [];

    // Validate and convert
    for (const day of DAYS_OF_WEEK) {
      const dayData = dayAvailability[day];
      if (dayData.enabled && dayData.timeRanges.length > 0) {
        for (const range of dayData.timeRanges) {
          if (!validateTime(range.startTime) || !validateTime(range.endTime)) {
            Alert.alert("Invalid Time", "Please enter times in HH:MM format (e.g., 09:00)");
            return;
          }
          availability.push({
            days: [day],
            startTime: range.startTime,
            endTime: range.endTime,
          });
        }
      }
    }

    if (availability.length === 0) {
      Alert.alert("No Availability", "Please enable at least one day with time ranges");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name,
        timeZone,
        availability,
        isDefault,
      });
      onClose();
    } catch (error) {
      Alert.alert("Error", "Failed to update schedule. Please try again.");
      console.error("Failed to save schedule:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Availability</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Schedule Name */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Schedule Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter schedule name"
            />
          </View>

          {/* Timezone */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Timezone</Text>
            <TextInput
              style={styles.input}
              value={timeZone}
              onChangeText={setTimeZone}
              placeholder="e.g., America/New_York"
            />
            <Text style={styles.helpText}>Use IANA timezone format</Text>
          </View>

          {/* Working Hours - Per Day */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Working Hours</Text>
            {DAYS_OF_WEEK.map((day) => {
              const dayData = dayAvailability[day];
              return (
                <View key={day} style={styles.dayContainer}>
                  {/* Day Toggle */}
                  <View style={styles.dayHeader}>
                    <Switch
                      value={dayData.enabled}
                      onValueChange={() => toggleDayEnabled(day)}
                      trackColor={{ false: "#E5E7EB", true: "black" }}
                      thumbColor="white"
                      // @ts-expect-error prop for web missing in types
                      activeThumbColor="white"
                    />
                    <Text style={styles.dayName}>{day}</Text>
                  </View>

                  {/* Time Ranges for this day */}
                  {dayData.enabled && (
                    <View style={styles.timeRangesContainer}>
                      {dayData.timeRanges.map((range, index) => (
                        <View key={index} style={styles.timeRangeRow}>
                          <TimePicker
                            value={range.startTime}
                            onChange={(time) => updateTimeRange(day, index, "startTime", time)}
                            style={styles.timeInput}
                          />
                          <Text style={styles.timeSeparator}>-</Text>
                          <TimePicker
                            value={range.endTime}
                            onChange={(time) => updateTimeRange(day, index, "endTime", time)}
                            minTime={range.startTime}
                            style={styles.timeInput}
                          />
                          <View style={styles.timeRangeActions}>
                            {index === 0 && (
                              <TouchableOpacity onPress={() => addTimeRange(day)} style={styles.iconButton}>
                                <Ionicons name="add" size={20} color="#000" />
                              </TouchableOpacity>
                            )}
                            {index > 0 && (
                              <TouchableOpacity
                                onPress={() => removeTimeRange(day, index)}
                                style={styles.iconButton}>
                                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#000",
    borderRadius: 8,
    minWidth: 60,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
  },
  helpText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  dayContainer: {
    marginBottom: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dayName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  timeRangesContainer: {
    marginTop: 12,
    marginLeft: 48,
    gap: 8,
  },
  timeRangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeInput: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: "#333",
    textAlign: "center",
    minWidth: 80,
  },
  timeSeparator: {
    fontSize: 16,
    color: "#666",
    marginHorizontal: 4,
  },
  timeRangeActions: {
    flexDirection: "row",
    gap: 8,
    marginLeft: 8,
  },
  iconButton: {
    padding: 4,
  },
});
