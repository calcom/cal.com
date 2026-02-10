import { Platform, Text, TouchableOpacity, useColorScheme, View } from "react-native";
import { FullScreenModal } from "./FullScreenModal";

interface LogoutConfirmModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function LogoutConfirmModal({ visible, onConfirm, onCancel }: LogoutConfirmModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const colors = {
    background: isDark ? "#171717" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#111827",
    textSecondary: isDark ? "#A3A3A3" : "#4B5563",
    border: isDark ? "#4D4D4D" : "#1F2937",
    cancelBg: isDark ? "#2C2C2E" : "#FFFFFF",
  };

  return (
    <FullScreenModal visible={visible} onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center bg-black bg-opacity-50">
        <View
          style={{
            backgroundColor: colors.background,
            minWidth: 300,
            borderRadius: 12,
            padding: 24,
          }}
          className="mx-4 shadow-lg"
        >
          <Text style={{ color: colors.text }} className="mb-2 text-lg font-semibold">
            Sign Out
          </Text>
          <Text style={{ color: colors.textSecondary }} className="mb-6">
            Are you sure you want to sign out?
          </Text>

          <View className="flex-row justify-end space-x-3">
            <TouchableOpacity
              onPress={onCancel}
              style={{
                backgroundColor: colors.cancelBg,
                borderColor: colors.border,
                borderWidth: 1,
                ...(Platform.OS === "web" ? { cursor: "pointer" as const } : {}),
              }}
              className="rounded-md px-4 py-2"
              activeOpacity={0.7}
            >
              <Text style={{ color: colors.text }} className="font-medium">
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onConfirm}
              style={Platform.OS === "web" ? { cursor: "pointer" as const } : undefined}
              className="rounded-md border border-red-800 bg-white px-4 py-2 dark:bg-red-900/30"
              activeOpacity={0.7}
            >
              <Text className="font-medium text-red-800">Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </FullScreenModal>
  );
}
