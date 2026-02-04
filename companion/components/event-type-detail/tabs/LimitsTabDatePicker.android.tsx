import { useCallback, useMemo } from "react";
import { Pressable, Text, useColorScheme } from "react-native";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { getColors } from "@/constants/colors";

interface LimitsTabDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function LimitsTabDatePicker({ value, onChange, placeholder }: LimitsTabDatePickerProps) {
  // Parse value string to Date object
  const dateValue = useMemo(() => {
    if (!value) return new Date();
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [value]);

  // Format date for display (compact, human-readable)
  const displayText = useMemo(() => {
    if (!value) return placeholder || "Select date";
    return dateValue.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [value, dateValue, placeholder]);

  // Handle date selection - convert to YYYY-MM-DD format
  const handleDateChange = useCallback(
    (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      onChange(`${year}-${month}-${day}`);
    },
    [onChange]
  );

  // Open native Android date picker
  const openDatePicker = useCallback(() => {
    DateTimePickerAndroid.open({
      value: dateValue,
      mode: "date",
      onChange: (event, date) => {
        if (event.type === "set" && date) {
          handleDateChange(date);
        }
      },
    });
  }, [dateValue, handleDateChange]);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = getColors(isDark);

  return (
    <Pressable
      onPress={openDatePicker}
      className="rounded-lg px-3 py-2"
      style={{ backgroundColor: theme.backgroundMuted }}
    >
      <Text className="text-[15px]" style={{ color: value ? theme.text : theme.textMuted }}>
        {displayText}
      </Text>
    </Pressable>
  );
}
