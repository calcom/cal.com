/**
 * RecurringTab Component
 *
 * iOS Settings style with grouped rows and section headers.
 */

import { Platform, Text, TextInput, TouchableOpacity, View, useColorScheme } from "react-native";
import { SettingRow, SettingsGroup } from "../SettingsUI";
import { RecurringTabIOSPicker } from "./RecurringTabIOSPicker";
import { Ionicons } from "@expo/vector-icons";
import { getColors } from "@/constants/colors";

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

// Local components removed in favor of SettingsUI

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
  const colorScheme = useColorScheme();
  const theme = getColors(colorScheme === "dark");

  return (
    <View className="gap-6">
      {/* Recurring Toggle */}
      <SettingsGroup>
        <SettingRow
          title="Recurring Event"
          description="People can subscribe for recurring events. When enabled, you can set how often the event repeats and for how many occurrences."
          value={recurringEnabled}
          onValueChange={setRecurringEnabled}
          learnMoreUrl="https://cal.com/help/event-types/recurring-events"
          isLast
        />
      </SettingsGroup>

      {/* Recurring Configuration - shown when enabled */}
      {recurringEnabled ? (
        <SettingsGroup header="Recurrence">
          {/* Repeats Every */}
          <View className="bg-white pl-4" style={{ backgroundColor: theme.backgroundSecondary }}>
            <View
              className="flex-row items-center justify-between pr-4"
              style={{
                height: 44,
                borderBottomWidth: 1,
                borderBottomColor: theme.borderSubtle,
              }}
            >
              <Text className="text-[17px]" style={{ color: theme.text }}>
                Repeats every
              </Text>
              <View className="flex-row items-center gap-2">
                <TextInput
                  className="w-14 rounded-lg px-2 py-1.5 text-center text-[15px]"
                  style={{ backgroundColor: theme.backgroundMuted, color: theme.text }}
                  value={recurringInterval}
                  onChangeText={(text) => {
                    const numericValue = text.replace(/[^0-9]/g, "");
                    if (numericValue === "" || numericValue === "0") {
                      setRecurringInterval("1");
                      return;
                    }
                    const num = parseInt(numericValue, 10);
                    if (num >= 1 && num <= 20) {
                      setRecurringInterval(numericValue);
                    }
                  }}
                  placeholder="1"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="numeric"
                />
                {Platform.OS === "ios" ? (
                  <View className="flex-row items-center">
                    <Text className="mr-1 text-[17px]" style={{ color: theme.textMuted }}>
                      {frequencyToLabel[recurringFrequency] || recurringFrequency}
                    </Text>
                    <RecurringTabIOSPicker
                      options={[
                        { label: "week", value: "weekly" },
                        { label: "month", value: "monthly" },
                        { label: "year", value: "yearly" },
                      ]}
                      selectedValue={frequencyToLabel[recurringFrequency] || recurringFrequency}
                      onSelect={(val) =>
                        setRecurringFrequency(val as "weekly" | "monthly" | "yearly")
                      }
                    />
                  </View>
                ) : (
                  <TouchableOpacity
                    className="flex-row items-center rounded-lg px-2 py-1.5"
                    style={{ backgroundColor: theme.backgroundMuted }}
                    onPress={() => setShowFrequencyDropdown(true)}
                  >
                    <Text className="text-[15px]" style={{ color: theme.text }}>
                      {frequencyToLabel[recurringFrequency] || recurringFrequency}
                    </Text>
                    <Ionicons
                      name="chevron-down"
                      size={14}
                      color={theme.textMuted}
                      style={{ marginLeft: 4 }}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Maximum occurrences */}
          <View className="bg-white pl-4" style={{ backgroundColor: theme.backgroundSecondary }}>
            <View className="flex-row items-center justify-between pr-4" style={{ height: 44 }}>
              <Text className="text-[17px]" style={{ color: theme.text }}>
                Maximum events
              </Text>
              <View className="flex-row items-center gap-2">
                <TextInput
                  className="w-14 rounded-lg px-2 py-1.5 text-center text-[15px]"
                  style={{ backgroundColor: theme.backgroundMuted, color: theme.text }}
                  value={recurringOccurrences}
                  onChangeText={(text) => {
                    const numericValue = text.replace(/[^0-9]/g, "");
                    if (numericValue === "" || numericValue === "0") {
                      setRecurringOccurrences("1");
                      return;
                    }
                    const num = parseInt(numericValue, 10);
                    if (num >= 1) {
                      setRecurringOccurrences(numericValue);
                    }
                  }}
                  placeholder="12"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="numeric"
                />
                <Text className="text-[15px]" style={{ color: theme.textSecondary }}>
                  events
                </Text>
              </View>
            </View>
          </View>
        </SettingsGroup>
      ) : null}
    </View>
  );
}
