import { Button, ContextMenu, Host, HStack, Image } from "@expo/ui/swift-ui";
import { buttonStyle, frame, padding } from "@expo/ui/swift-ui/modifiers";
import { Ionicons } from "@expo/vector-icons";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TIMEZONES as ALL_TIMEZONES } from "@/constants/timezones";
import { type Schedule, useUpdateSchedule } from "@/hooks/useSchedules";
import { showErrorAlert } from "@/utils/alerts";
import { getColors } from "@/constants/colors";

// Format timezones for display
const TIMEZONES = ALL_TIMEZONES.map((tz) => ({
  id: tz,
  label: tz.replace(/_/g, " "),
}));

export interface EditAvailabilityNameScreenProps {
  schedule: Schedule | null;
  onSuccess: () => void;
  onSavingChange?: (isSaving: boolean) => void;
  transparentBackground?: boolean;
}

export interface EditAvailabilityNameScreenHandle {
  submit: () => void;
}

export const EditAvailabilityNameScreen = forwardRef<
  EditAvailabilityNameScreenHandle,
  EditAvailabilityNameScreenProps
>(function EditAvailabilityNameScreen(
  { schedule, onSuccess, onSavingChange, transparentBackground = false },
  ref
) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = getColors(isDark);
  const backgroundStyle = transparentBackground
    ? "bg-transparent"
    : isDark
      ? "bg-black"
      : `bg-[${theme.backgroundMuted}]`;

  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("UTC");

  // Use the mutation hook for updating schedules with optimistic updates
  const { mutate: updateSchedule, isPending: isSaving } = useUpdateSchedule();

  // Initialize from schedule
  useEffect(() => {
    if (schedule) {
      setName(schedule.name ?? "");
      setTimezone(schedule.timeZone ?? "UTC");
    }
  }, [schedule]);

  // Notify parent of saving state
  useEffect(() => {
    onSavingChange?.(isSaving);
  }, [isSaving, onSavingChange]);

  const handleTimezoneSelect = useCallback((tz: string) => {
    setTimezone(tz);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!schedule || isSaving) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert("Error", "Please enter a schedule name");
      return;
    }

    updateSchedule(
      {
        id: schedule.id,
        updates: {
          name: trimmedName,
          timeZone: timezone,
        },
      },
      {
        onSuccess: () => {
          Alert.alert("Success", "Schedule updated successfully", [
            { text: "OK", onPress: onSuccess },
          ]);
        },
        onError: () => {
          showErrorAlert("Error", "Failed to update schedule. Please try again.");
        },
      }
    );
  }, [schedule, name, timezone, onSuccess, isSaving, updateSchedule]);

  // Expose submit to parent via ref
  useImperativeHandle(
    ref,
    () => ({
      submit: handleSubmit,
    }),
    [handleSubmit]
  );

  const selectedTimezoneLabel = TIMEZONES.find((tz) => tz.id === timezone)?.label || timezone;

  if (!schedule) {
    return (
      <View className={`flex-1 items-center justify-center ${backgroundStyle}`}>
        <Text className="text-[#A3A3A3]">No schedule data</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior="padding" className={`flex-1 ${backgroundStyle}`}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 16,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={!transparentBackground}
      >
        {transparentBackground ? (
          <>
            {/* Name Input - Glass UI */}
            <Text className="mb-2 px-1 text-[13px] font-medium text-[#A3A3A3]">Schedule Name</Text>
            <View
              className={`mb-4 overflow-hidden rounded-xl ${
                isDark
                  ? "border border-[#4D4D4D]/40 bg-[#171717]/80"
                  : "border border-gray-300/40 bg-white/60"
              }`}
            >
              <TextInput
                className={`px-4 py-3.5 text-[17px] ${isDark ? "text-white" : "text-black"}`}
                placeholder="Enter schedule name"
                placeholderTextColor={isDark ? "#A3A3A3" : "#9CA3AF"}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                editable={!isSaving}
              />
            </View>

            {/* Timezone Selector - Glass UI */}
            <Text className="mb-2 px-1 text-[13px] font-medium text-[#A3A3A3]">Timezone</Text>
            <View
              className={`mb-4 flex-row items-center rounded-xl px-4 py-3 ${
                isDark
                  ? "border border-[#4D4D4D]/40 bg-[#171717]/80"
                  : "border border-gray-300/40 bg-white/60"
              }`}
            >
              <View className="mr-3 h-9 w-9 items-center justify-center rounded-lg bg-[#007AFF]/20">
                <Ionicons name="globe-outline" size={20} color="#007AFF" />
              </View>
              <View className="flex-1">
                <Text className={`text-[17px] font-medium ${isDark ? "text-white" : "text-black"}`}>
                  {selectedTimezoneLabel}
                </Text>
                <Text className="mt-0.5 text-[13px] text-[#A3A3A3]">{timezone}</Text>
              </View>

              {/* Native iOS Context Menu Button */}
              <Host matchContents>
                <ContextMenu
                  modifiers={[
                    buttonStyle(isLiquidGlassAvailable() ? "glass" : "bordered"),
                    padding(),
                  ]}
                  activationMethod="singlePress"
                >
                  <ContextMenu.Items>
                    {TIMEZONES.map((tz) => (
                      <Button
                        key={tz.id}
                        systemImage={timezone === tz.id ? "checkmark" : "globe"}
                        onPress={() => handleTimezoneSelect(tz.id)}
                        label={tz.label}
                      />
                    ))}
                  </ContextMenu.Items>
                  <ContextMenu.Trigger>
                    <HStack>
                      <Image
                        systemName="chevron.up.chevron.down"
                        color="primary"
                        size={16}
                        modifiers={[frame({ height: 16, width: 16 })]}
                      />
                    </HStack>
                  </ContextMenu.Trigger>
                </ContextMenu>
              </Host>
            </View>
          </>
        ) : (
          <>
            <Text className="mb-2 px-1 text-[13px] font-medium uppercase tracking-wide text-[#A3A3A3]">
              Schedule Name
            </Text>
            <View
              className={`mb-4 overflow-hidden rounded-xl ${isDark ? "bg-[#171717]" : "bg-white"}`}
            >
              <TextInput
                className={`px-4 py-3.5 text-[17px] ${isDark ? "text-white" : "text-black"}`}
                placeholder="Enter schedule name"
                placeholderTextColor={isDark ? "#A3A3A3" : "#9CA3AF"}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                editable={!isSaving}
              />
            </View>

            <Text className="mb-2 px-1 text-[13px] font-medium uppercase tracking-wide text-[#A3A3A3]">
              Timezone
            </Text>
            <View
              className={`mb-4 flex-row items-center rounded-xl px-4 py-3 ${isDark ? "bg-[#171717]" : "bg-white"}`}
            >
              <View className="mr-3 h-9 w-9 items-center justify-center rounded-lg bg-[#007AFF]/10">
                <Ionicons name="globe-outline" size={20} color="#007AFF" />
              </View>
              <View className="flex-1">
                <Text className={`text-[17px] font-medium ${isDark ? "text-white" : "text-black"}`}>
                  {selectedTimezoneLabel}
                </Text>
                <Text className="mt-0.5 text-[13px] text-[#A3A3A3]">{timezone}</Text>
              </View>

              {/* Native iOS Context Menu Button */}
              <Host matchContents>
                <ContextMenu
                  modifiers={[
                    buttonStyle(isLiquidGlassAvailable() ? "glass" : "bordered"),
                    padding(),
                  ]}
                  activationMethod="singlePress"
                >
                  <ContextMenu.Items>
                    {TIMEZONES.map((tz) => (
                      <Button
                        key={tz.id}
                        systemImage={timezone === tz.id ? "checkmark" : "globe"}
                        onPress={() => handleTimezoneSelect(tz.id)}
                        label={tz.label}
                      />
                    ))}
                  </ContextMenu.Items>
                  <ContextMenu.Trigger>
                    <HStack>
                      <Image
                        systemName="chevron.up.chevron.down"
                        color="primary"
                        size={16}
                        modifiers={[frame({ height: 16, width: 16 })]}
                      />
                    </HStack>
                  </ContextMenu.Trigger>
                </ContextMenu>
              </Host>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
});

export default EditAvailabilityNameScreen;
