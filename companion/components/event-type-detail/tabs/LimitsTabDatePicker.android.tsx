import { useCallback, useMemo } from "react";
import { Pressable, Text } from "react-native";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";

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

  return (
    <Pressable onPress={openDatePicker} className="rounded-lg bg-[#F2F2F7] px-3 py-2">
      <Text className={`text-[15px] ${value ? "text-black" : "text-[#8E8E93]"}`}>
        {displayText}
      </Text>
    </Pressable>
  );
}
