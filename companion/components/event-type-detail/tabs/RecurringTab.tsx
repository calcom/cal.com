import React from "react";
import { View, Text, TextInput, TouchableOpacity, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { openInAppBrowser } from "../../../utils/browser";

interface RecurringTabProps {
  recurringEnabled: boolean;
  setRecurringEnabled: (value: boolean) => void;
  recurringInterval: string;
  setRecurringInterval: (value: string) => void;
  recurringFrequency: "weekly" | "monthly" | "yearly";
  setRecurringFrequency: (value: "weekly" | "monthly" | "yearly") => void;
  recurringOccurrences: string;
  setRecurringOccurrences: (value: string) => void;
  setShowFrequencyDropdown: (show: boolean) => void;
}

// Map frequency to singular display text
const frequencyToLabel: Record<string, string> = {
  weekly: "week",
  monthly: "month",
  yearly: "year",
};

export function RecurringTab({
  recurringEnabled,
  setRecurringEnabled,
  recurringInterval,
  setRecurringInterval,
  recurringFrequency,
  setRecurringFrequency,
  recurringOccurrences,
  setRecurringOccurrences,
  setShowFrequencyDropdown,
}: RecurringTabProps) {
  return (
    <View className="gap-3">
      {/* Recurring Event Toggle Card */}
      <View className="rounded-2xl border border-[#E5E5EA] bg-white p-5">
        <View className="flex-row items-start justify-between">
          <View className="mr-3 flex-1">
            <Text className="mb-1 text-base font-medium text-[#333]">Recurring Event</Text>
            <Text className="text-sm text-[#666]">
              People can subscribe for recurring events.{" "}
              <Text
                className="text-[#007AFF]"
                onPress={() =>
                  openInAppBrowser(
                    "https://cal.com/docs/core-features/event-types/recurring-events",
                    "Learn more about recurring events"
                  )
                }
              >
                Learn more
              </Text>
            </Text>
          </View>
          <Switch
            value={recurringEnabled}
            onValueChange={setRecurringEnabled}
            trackColor={{ false: "#E5E5EA", true: "#34C759" }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Recurring Configuration - shown when enabled */}
        {recurringEnabled ? (
          <View className="mt-4 gap-4 border-t border-[#E5E5EA] pt-4">
            {/* Repeats Every */}
            <View>
              <Text className="mb-2 text-sm font-medium text-[#333]">Repeats every</Text>
              <View className="flex-row items-center gap-3">
                <TextInput
                  className="w-20 rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-3 py-3 text-center text-base text-black"
                  value={recurringInterval}
                  onChangeText={(text) => {
                    const numericValue = text.replace(/[^0-9]/g, "");
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
                  className="min-w-[100px] flex-row items-center justify-between rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-3 py-3"
                  onPress={() => setShowFrequencyDropdown(true)}
                >
                  <Text className="text-base text-black">
                    {frequencyToLabel[recurringFrequency] || recurringFrequency}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#8E8E93" />
                </TouchableOpacity>
              </View>
            </View>

            {/* For a maximum of */}
            <View>
              <Text className="mb-2 text-sm font-medium text-[#333]">For a maximum of</Text>
              <View className="flex-row items-center gap-3">
                <TextInput
                  className="w-20 rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-3 py-3 text-center text-base text-black"
                  value={recurringOccurrences}
                  onChangeText={(text) => {
                    const numericValue = text.replace(/[^0-9]/g, "");
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
                <Text className="text-base text-[#333]">Events</Text>
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}
