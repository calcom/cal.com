import { TextInput, View } from "react-native";

interface LimitsTabDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function LimitsTabDatePicker({ value, onChange, placeholder }: LimitsTabDatePickerProps) {
  return (
    <View>
      <TextInput
        className="rounded-lg bg-[#F2F2F7] px-3 py-2 text-[15px] text-black"
        value={value}
        onChangeText={onChange}
        placeholder={placeholder || "YYYY-MM-DD"}
        placeholderTextColor="#8E8E93"
      />
    </View>
  );
}
