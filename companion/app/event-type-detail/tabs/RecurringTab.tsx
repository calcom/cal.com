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
      <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
        <View className="flex-row justify-between items-start">
          <View className="flex-1 mr-3">
            <Text className="text-base text-[#333] font-medium mb-1">Recurring event</Text>
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
        <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
          <Text className="text-base font-semibold text-[#333] mb-4">Recurrence pattern</Text>

          {/* Repeats Every */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-[#333] mb-2">Repeats every</Text>
            <View className="flex-row items-center gap-3">
              <TextInput
                className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black w-20 text-center"
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
                className="flex-1 bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 flex-row justify-between items-center"
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
                }}>
                <Text className="text-base text-black capitalize">{recurringFrequency}</Text>
                <Ionicons name="chevron-down" size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Maximum Occurrences */}
          <View>
            <Text className="text-sm font-medium text-[#333] mb-2">Maximum number of events</Text>
            <View className="flex-row items-center gap-2">
              <TextInput
                className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black w-24 text-center"
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
            <Text className="text-xs text-[#666] mt-2">
              The booking will create {recurringOccurrences} events that repeat {recurringFrequency}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

export default RecurringTab;
