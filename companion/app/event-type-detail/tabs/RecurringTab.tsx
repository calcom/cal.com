import React from "react";
import { View, Text, TextInput, TouchableOpacity, Switch, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface RecurringTabProps {
  recurringEnabled: boolean;
  setRecurringEnabled: (value: boolean) => void;
  recurringInterval: string;
  setRecurringInterval: (value: string) => void;
  recurringFrequency: "daily" | "weekly" | "monthly" | "yearly";
  setRecurringFrequency: (value: "daily" | "weekly" | "monthly" | "yearly") => void;
  recurringOccurrences: string;
  setRecurringOccurrences: (value: string) => void;
}

export function RecurringTab({
  recurringEnabled,
  setRecurringEnabled,
  recurringInterval,
  setRecurringInterval,
  recurringFrequency,
  setRecurringFrequency,
  recurringOccurrences,
  setRecurringOccurrences,
}: RecurringTabProps) {
  return (
    <View className="gap-3">
      {/* Recurring Event Toggle Card */}
      <View className="rounded-2xl border border-[#E5E5EA] bg-white p-5">
        <View className="flex-row items-start justify-between">
          <View className="mr-3 flex-1">
            <Text className="mb-1 text-base font-medium text-[#333]">Recurring event</Text>
            <Text className="text-sm text-[#666]">
              Set up this event type to repeat at regular intervals
            </Text>
          </View>
          <Switch
            value={recurringEnabled}
            onValueChange={setRecurringEnabled}
            trackColor={{ false: "#E5E5EA", true: "#34C759" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Recurring Configuration Card - shown when enabled */}
      {recurringEnabled && (
        <View className="rounded-2xl border border-[#E5E5EA] bg-white p-5">
          <Text className="mb-4 text-base font-semibold text-[#333]">Recurrence pattern</Text>

          {/* Repeats Every */}
          <View className="mb-4">
            <Text className="mb-2 text-sm font-medium text-[#333]">Repeats every</Text>
            <View className="flex-row items-center gap-3">
              <TextInput
                className="w-20 rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-3 py-3 text-center text-base text-black"
                value={recurringInterval}
                onChangeText={(text) => {
                  const numericValue = text.replace(/[^0-9]/g, "");
                  // Don't allow empty or 0 values; fall back to 1 so users can keep editing
                  if (numericValue === "" || numericValue === "0") {
                    setRecurringInterval("1");
                    return;
                  }
                  const num = parseInt(numericValue);
                  if (num >= 1 && num <= 20) {
                    setRecurringInterval(numericValue);
                  }
                }}
                placeholder="1"
                placeholderTextColor="#8E8E93"
                keyboardType="numeric"
              />
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-between rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-3 py-3"
                onPress={() => {
                  Alert.alert("Select Frequency", "Choose how often this event repeats", [
                    {
                      text: "Daily",
                      onPress: () => setRecurringFrequency("daily"),
                    },
                    {
                      text: "Weekly",
                      onPress: () => setRecurringFrequency("weekly"),
                    },
                    {
                      text: "Monthly",
                      onPress: () => setRecurringFrequency("monthly"),
                    },
                    {
                      text: "Yearly",
                      onPress: () => setRecurringFrequency("yearly"),
                    },
                    { text: "Cancel", style: "cancel" },
                  ]);
                }}
              >
                <Text className="text-base capitalize text-black">{recurringFrequency}</Text>
                <Ionicons name="chevron-down" size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Maximum Occurrences */}
          <View>
            <Text className="mb-2 text-sm font-medium text-[#333]">Maximum number of events</Text>
            <View className="flex-row items-center gap-2">
              <TextInput
                className="w-24 rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-3 py-3 text-center text-base text-black"
                value={recurringOccurrences}
                onChangeText={(text) => {
                  const numericValue = text.replace(/[^0-9]/g, "");
                  // Don't allow empty or 0 values; fall back to 1 so users can keep editing
                  if (numericValue === "" || numericValue === "0") {
                    setRecurringOccurrences("1");
                    return;
                  }
                  const num = parseInt(numericValue);
                  if (num >= 1) {
                    setRecurringOccurrences(numericValue);
                  }
                }}
                placeholder="12"
                placeholderTextColor="#8E8E93"
                keyboardType="numeric"
              />
              <Text className="text-sm text-[#666]">occurrences</Text>
            </View>
            <Text className="mt-2 text-xs text-[#666]">
              The booking will create {recurringOccurrences} events that repeat {recurringFrequency}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
