import { Ionicons } from "@expo/vector-icons";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import { FullScreenModal } from "./FullScreenModal";
import {
  LANDING_PAGE_OPTIONS,
  type LandingPage,
  type LandingPageOption,
} from "@/hooks/useUserPreferences";

interface LandingPagePickerProps {
  visible: boolean;
  currentValue: LandingPage;
  onSelect: (value: LandingPage) => void;
  onClose: () => void;
}

export function LandingPagePicker({
  visible,
  currentValue,
  onSelect,
  onClose,
}: LandingPagePickerProps) {
  const handleSelect = (option: LandingPageOption) => {
    onSelect(option.value);
    onClose();
  };

  return (
    <FullScreenModal visible={visible} onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/50">
        <View className="mx-4 min-w-[320px] max-w-[400px] rounded-lg bg-white shadow-lg">
          <View className="border-b border-gray-200 px-4 py-3">
            <Text className="text-lg font-semibold text-gray-900">First Page</Text>
            <Text className="mt-1 text-sm text-gray-500">
              Choose which page opens when you launch the app
            </Text>
          </View>

          <View className="py-2">
            {LANDING_PAGE_OPTIONS.map((option) => {
              const isSelected = currentValue === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => handleSelect(option)}
                  className="flex-row items-center justify-between px-4 py-3 active:bg-gray-100"
                  style={Platform.OS === "web" ? { cursor: "pointer" } : undefined}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-base ${isSelected ? "font-semibold text-gray-900" : "text-gray-700"}`}
                  >
                    {option.label}
                  </Text>
                  {isSelected && <Ionicons name="checkmark" size={20} color="#111827" />}
                </TouchableOpacity>
              );
            })}
          </View>

          <View className="border-t border-gray-200 px-4 py-3">
            <TouchableOpacity
              onPress={onClose}
              className="items-center rounded-md border border-gray-300 bg-white px-4 py-2"
              style={Platform.OS === "web" ? { cursor: "pointer" } : undefined}
              activeOpacity={0.7}
            >
              <Text className="font-medium text-gray-700">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </FullScreenModal>
  );
}
