import { DatePicker, Host } from "@expo/ui/swift-ui";
import { useCallback, useMemo } from "react";
import { Text, View } from "react-native";

interface LimitsTabDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function LimitsTabDatePicker({ value, onChange, placeholder }: LimitsTabDatePickerProps) {
  const dateValue = useMemo(() => {
    if (!value) return new Date();
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [value]);

  const handleDateChange = useCallback(
    (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      onChange(`${year}-${month}-${day}`);
    },
    [onChange]
  );

  const displayValue = value || placeholder || "Select date";

  return (
    <View className="flex-row items-center rounded-lg bg-[#F2F2F7] px-3 py-2">
      <Text className={`mr-2 text-[15px] ${value ? "text-black" : "text-[#8E8E93]"}`}>
        {displayValue}
      </Text>
      <Host matchContents>
        <DatePicker
          onDateChange={handleDateChange}
          displayedComponents={["date"]}
          selection={dateValue}
        />
      </Host>
    </View>
  );
}
