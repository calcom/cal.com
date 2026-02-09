import { TextInput, View, useColorScheme } from "react-native";
import { getColors } from "@/constants/colors";

interface LimitsTabDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function LimitsTabDatePicker({ value, onChange, placeholder }: LimitsTabDatePickerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = getColors(isDark);

  return (
    <View>
      <TextInput
        className="rounded-lg px-3 py-2 text-[15px]"
        style={{ backgroundColor: theme.backgroundMuted, color: theme.text }}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder || "YYYY-MM-DD"}
        placeholderTextColor="#A3A3A3"
      />
    </View>
  );
}
