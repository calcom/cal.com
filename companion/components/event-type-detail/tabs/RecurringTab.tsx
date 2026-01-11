/**
 * RecurringTab Component
 *
 * iOS Settings style with grouped rows and section headers.
 */

import { Button, ContextMenu, Host, HStack, Image } from "@expo/ui/swift-ui";
import { buttonStyle } from "@expo/ui/swift-ui/modifiers";
import { Ionicons } from "@expo/vector-icons";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Alert, Platform, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";

import { openInAppBrowser } from "@/utils/browser";

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

// Section header
function SectionHeader({ title }: { title: string }) {
  return (
    <Text
      className="mb-2 ml-4 text-[13px] uppercase tracking-wide text-[#6D6D72]"
      style={{ letterSpacing: 0.5 }}
    >
      {title}
    </Text>
  );
}

// Settings group container
function SettingsGroup({ children, header }: { children: React.ReactNode; header?: string }) {
  return (
    <View>
      {header ? <SectionHeader title={header} /> : null}
      <View className="overflow-hidden rounded-[14px] bg-white">{children}</View>
    </View>
  );
}

// Toggle row with description
function SettingRow({
  title,
  description,
  value,
  onValueChange,
  learnMoreUrl,
  isLast = false,
}: {
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  learnMoreUrl?: string;
  isLast?: boolean;
}) {
  const showDescription = () => {
    if (!description) return;

    const buttons: {
      text: string;
      onPress?: () => void;
      style?: "cancel" | "default" | "destructive";
    }[] = [{ text: "OK", style: "cancel" }];

    if (learnMoreUrl) {
      buttons.unshift({
        text: "Learn more",
        onPress: () => openInAppBrowser(learnMoreUrl, "Learn more"),
      });
    }

    Alert.alert(title, description, buttons);
  };

  return (
    <View className="bg-white pl-4">
      <View
        className={`flex-row items-center pr-4 ${!isLast ? "border-b border-[#E5E5E5]" : ""}`}
        style={{ minHeight: 44 }}
      >
        <TouchableOpacity
          className="flex-1 flex-row items-center py-3"
          onPress={description ? showDescription : undefined}
          activeOpacity={description ? 0.7 : 1}
          disabled={!description}
        >
          <Text className="text-[17px] text-black" style={{ fontWeight: "400" }}>
            {title}
          </Text>
          {description ? (
            <Ionicons name="chevron-down" size={12} color="#C7C7CC" style={{ marginLeft: 6 }} />
          ) : null}
        </TouchableOpacity>
        <View style={{ alignSelf: "center" }}>
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: "#E9E9EA", true: "#000000" }}
            thumbColor={Platform.OS === "android" ? "#FFFFFF" : undefined}
          />
        </View>
      </View>
    </View>
  );
}

// iOS Native Picker trigger component
function IOSPickerTrigger({
  options,
  selectedValue,
  onSelect,
}: {
  options: { label: string; value: string }[];
  selectedValue: string;
  onSelect: (value: string) => void;
}) {
  return (
    <Host matchContents>
      <ContextMenu
        modifiers={[buttonStyle(isLiquidGlassAvailable() ? "glass" : "bordered")]}
        activationMethod="singlePress"
      >
        <ContextMenu.Items>
          {options.map((opt) => (
            <Button
              key={opt.value}
              systemImage={selectedValue === opt.label ? "checkmark" : undefined}
              onPress={() => onSelect(opt.value)}
              label={opt.label}
            />
          ))}
        </ContextMenu.Items>
        <ContextMenu.Trigger>
          <HStack>
            <Image systemName="chevron.up.chevron.down" color="primary" size={13} />
          </HStack>
        </ContextMenu.Trigger>
      </ContextMenu>
    </Host>
  );
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
  setShowFrequencyDropdown,
}: RecurringTabProps) {
  return (
    <View className="gap-6">
      {/* Recurring Toggle */}
      <SettingsGroup>
        <SettingRow
          title="Recurring Event"
          description="People can subscribe for recurring events. When enabled, you can set how often the event repeats and for how many occurrences."
          value={recurringEnabled}
          onValueChange={setRecurringEnabled}
          learnMoreUrl="https://cal.com/docs/core-features/event-types/recurring-events"
          isLast
        />
      </SettingsGroup>

      {/* Recurring Configuration - shown when enabled */}
      {recurringEnabled ? (
        <SettingsGroup header="Recurrence">
          {/* Repeats Every */}
          <View className="bg-white pl-4">
            <View
              className="flex-row items-center justify-between border-b border-[#E5E5E5] pr-4"
              style={{ height: 44 }}
            >
              <Text className="text-[17px] text-black">Repeats every</Text>
              <View className="flex-row items-center gap-2">
                <TextInput
                  className="w-14 rounded-lg bg-[#F2F2F7] px-2 py-1.5 text-center text-[15px] text-black"
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
                  placeholderTextColor="#8E8E93"
                  keyboardType="numeric"
                />
                {Platform.OS === "ios" ? (
                  <View className="flex-row items-center">
                    <Text className="mr-1 text-[17px] text-[#8E8E93]">
                      {frequencyToLabel[recurringFrequency] || recurringFrequency}
                    </Text>
                    <IOSPickerTrigger
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
                    className="flex-row items-center rounded-lg bg-[#F2F2F7] px-2 py-1.5"
                    onPress={() => setShowFrequencyDropdown(true)}
                  >
                    <Text className="text-[15px] text-black">
                      {frequencyToLabel[recurringFrequency] || recurringFrequency}
                    </Text>
                    <Ionicons
                      name="chevron-down"
                      size={14}
                      color="#8E8E93"
                      style={{ marginLeft: 4 }}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Maximum occurrences */}
          <View className="bg-white pl-4">
            <View className="flex-row items-center justify-between pr-4" style={{ height: 44 }}>
              <Text className="text-[17px] text-black">Maximum events</Text>
              <View className="flex-row items-center gap-2">
                <TextInput
                  className="w-14 rounded-lg bg-[#F2F2F7] px-2 py-1.5 text-center text-[15px] text-black"
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
                  placeholderTextColor="#8E8E93"
                  keyboardType="numeric"
                />
                <Text className="text-[15px] text-[#6D6D72]">events</Text>
              </View>
            </View>
          </View>
        </SettingsGroup>
      ) : null}
    </View>
  );
}
