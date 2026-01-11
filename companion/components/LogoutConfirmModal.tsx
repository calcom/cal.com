import React from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import { FullScreenModal } from "./FullScreenModal";

interface LogoutConfirmModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function LogoutConfirmModal({ visible, onConfirm, onCancel }: LogoutConfirmModalProps) {
  return (
    <FullScreenModal visible={visible} onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center bg-black bg-opacity-50">
        <View className="mx-4 min-w-[300px] rounded-lg bg-white p-6 shadow-lg">
          <Text className="mb-2 text-lg font-semibold text-gray-900">Sign Out</Text>
          <Text className="mb-6 text-gray-600">Are you sure you want to sign out?</Text>

          <View className="flex-row justify-end space-x-3">
            <TouchableOpacity
              onPress={onCancel}
              className="rounded-md border border-gray-800 bg-white px-4 py-2"
              style={Platform.OS === "web" ? { cursor: "pointer" } : undefined}
              activeOpacity={0.7}
            >
              <Text className="font-medium text-gray-800">Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onConfirm}
              className="rounded-md border border-red-800 bg-white px-4 py-2"
              style={Platform.OS === "web" ? { cursor: "pointer" } : undefined}
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
