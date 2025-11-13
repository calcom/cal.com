import { Picker } from "@react-native-picker/picker";
import React from "react";
import { View, StyleSheet, Platform } from "react-native";

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  minTime?: string;
  disabled?: boolean;
  style?: object;
}

// Generate time options in 15-minute intervals
const INCREMENT = 15;

const generateTimeOptions = (): string[] => {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += INCREMENT) {
      const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      options.push(timeString);
    }
  }
  // Add 23:59 as the last option
  options.push("23:59");
  return options;
};

const TIME_OPTIONS = generateTimeOptions();

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  minTime,
  disabled = false,
  style,
}) => {
  const filteredOptions = minTime ? TIME_OPTIONS.filter((time) => time > minTime) : TIME_OPTIONS;

  return (
    <View style={[styles.container, style]}>
      <Picker
        selectedValue={value}
        onValueChange={(itemValue) => onChange(itemValue)}
        enabled={!disabled}
        style={styles.picker}
        itemStyle={styles.pickerItem}>
        {!value && <Picker.Item label="Select time" value="" />}
        {filteredOptions.map((time) => (
          <Picker.Item key={time} label={time} value={time} />
        ))}
      </Picker>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    minWidth: 80,
    overflow: "hidden",
  },
  picker: {
    ...Platform.select({
      ios: {
        height: 36,
      },
      android: {
        height: 36,
        color: "#333",
      },
      web: {
        height: 20,
        backgroundColor: "#fff",
        border: "none",
      },
    }),
  },
  pickerItem: {
    fontSize: 14,
    color: "#333",
    height: 120,
  },
});
